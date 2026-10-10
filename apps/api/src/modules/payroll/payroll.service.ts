import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PayrollItemType, PayrollStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PayrollCalculationService } from '../time-track/payroll-calculation.service';
import { overtimePaymentRatio } from '../time-track/overtime-policy';
import { CancelPayrollDto, CreatePayrollDto, DEDUCTION_TYPES, ManualPayrollItemDto, UpdatePayrollDto } from './dto/create-payroll.dto';

const DAY_MS = 86_400_000;
const round2 = (value: number) => Math.round(value * 100) / 100;
const fmtDay = (date: Date) => date.toISOString().slice(0, 10).split('-').reverse().join('/');

/** Número seguro: valor inválido vira null (nunca "NaN" na tela). */
const safe = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function parseDay(value: string, label: string): Date {
  const text = String(value ?? '').slice(0, 10);
  const date = new Date(`${text}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(date.getTime())) throw new BadRequestException(`${label} inválida.`);
  return date;
}

function parsePeriod(start: string, end: string) {
  const periodStart = parseDay(start, 'Data de início do ciclo');
  const periodEnd = parseDay(end, 'Data de fim do ciclo');
  if (periodEnd < periodStart) throw new BadRequestException('O fim do ciclo não pode ser antes do início.');
  const days = Math.round((periodEnd.getTime() - periodStart.getTime()) / DAY_MS) + 1;
  if (days > 62) throw new BadRequestException('O ciclo pode ter no máximo 62 dias.');
  return { periodStart, periodEnd, days };
}

type EmployeeForPayroll = {
  id: string; name: string; salary: unknown; dependents: unknown; dailyWorkload: string | null; workScale: string | null; workScheduleRule: { restDaysOfWeek?: number[] | null } | null;
};

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly officialCalculator: PayrollCalculationService,
  ) {}

  // ---------- leitura ----------

  /** Folhas cujo ciclo toca o intervalo pedido (from/to) ou, sem intervalo, a competência year/month. */
  async list(companyId: string, query: { from?: string; to?: string; year?: number; month?: number; status?: string }) {
    const where: Prisma.PayrollWhereInput = { companyId, deletedAt: null };
    if (query.from && query.to) {
      const { periodStart, periodEnd } = parsePeriod(query.from, query.to);
      where.periodStart = { lte: periodEnd };
      where.periodEnd = { gte: periodStart };
    } else {
      if (query.year !== undefined) where.referenceYear = query.year;
      if (query.month !== undefined) where.referenceMonth = query.month;
    }
    if (query.status && (Object.values(PayrollStatus) as string[]).includes(query.status)) where.status = query.status as PayrollStatus;
    const rows = await this.prisma.payroll.findMany({
      where,
      include: { employee: { select: { id: true, name: true, position: true, department: true, registration: true } }, items: true },
      orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => this.serialize(row));
  }

  async get(companyId: string, id: string) {
    return this.serialize(await this.load(companyId, id));
  }

  private async load(companyId: string, id: string) {
    const payroll = await this.prisma.payroll.findFirst({
      where: { companyId, id, deletedAt: null },
      include: {
        employee: { select: { id: true, name: true, position: true, department: true, registration: true, cpf: true, salary: true } },
        items: { orderBy: [{ isDeduction: 'asc' }, { createdAt: 'asc' }] },
      },
    });
    if (!payroll) throw new NotFoundException('Folha de pagamento não encontrada.');
    return payroll;
  }

  private serialize(row: any) {
    const money = (v: unknown) => safe(v);
    const values = [row.baseSalary, row.grossSalary, row.netSalary, row.inssAmount, row.irrfAmount, row.fgtsAmount];
    return {
      ...row,
      baseSalary: money(row.baseSalary), grossSalary: money(row.grossSalary), netSalary: money(row.netSalary),
      inssAmount: money(row.inssAmount), irrfAmount: money(row.irrfAmount), fgtsAmount: money(row.fgtsAmount),
      overtimeAmount: money(row.overtimeAmount), nightShiftAmount: money(row.nightShiftAmount),
      employee: row.employee ? { ...row.employee, salary: row.employee.salary === undefined ? undefined : money(row.employee.salary) } : row.employee,
      items: (row.items ?? []).map((item: any) => ({ ...item, amount: money(item.amount) })),
      // Folhas antigas gravadas com valor inválido: a tela mostra "—" e pede para recalcular.
      invalid: values.some((v) => safe(v) === null),
    };
  }

  // ---------- criação ----------

  /** Calcula a folha de um ou mais funcionários para o ciclo escolhido. Erros por funcionário não derrubam os demais. */
  async create(companyId: string, dto: CreatePayrollDto) {
    const { periodStart, periodEnd, days } = parsePeriod(dto.periodStart, dto.periodEnd);
    const ids = [...new Set(dto.employeeIds)];
    const employees = await this.prisma.employee.findMany({
      where: { companyId, id: { in: ids } },
      select: { id: true, name: true, salary: true, dependents: true, dailyWorkload: true, workScale: true, workScheduleRule: true },
    });
    const byId = new Map(employees.map((e) => [e.id, e as EmployeeForPayroll]));

    const created: unknown[] = [];
    const failed: Array<{ employeeId: string; name: string; message: string }> = [];
    for (const id of ids) {
      const employee = byId.get(id);
      if (!employee) { failed.push({ employeeId: id, name: 'Funcionário', message: 'Funcionário não encontrado nesta empresa.' }); continue; }
      try {
        await this.assertNoOverlap(companyId, id, periodStart, periodEnd, employee.name);
        const built = await this.build(companyId, employee, periodStart, periodEnd, days, dto.items ?? []);
        const payroll = await this.prisma.payroll.create({
          data: { ...built.data, companyId, employeeId: id, observations: dto.observations, items: { create: built.items.map((i) => ({ ...i, companyId })) } },
          include: { employee: { select: { id: true, name: true, position: true, department: true } }, items: true },
        });
        created.push(this.serialize(payroll));
      } catch (error: any) {
        failed.push({ employeeId: id, name: employee.name, message: error?.response?.message ?? error?.message ?? 'Não foi possível calcular.' });
      }
    }
    if (!created.length) throw new BadRequestException(failed.length === 1 ? failed[0].message : `Nenhuma folha foi criada. ${failed.map((f) => `${f.name}: ${f.message}`).join(' ')}`);
    return { created, failed };
  }

  private async assertNoOverlap(companyId: string, employeeId: string, start: Date, end: Date, name: string, ignoreId?: string) {
    const clash = await this.prisma.payroll.findFirst({
      where: {
        companyId, employeeId, deletedAt: null, status: { not: 'CANCELLED' }, ...(ignoreId ? { id: { not: ignoreId } } : {}),
        periodStart: { lte: end }, periodEnd: { gte: start },
      },
      select: { periodStart: true, periodEnd: true, status: true },
    });
    if (clash?.periodStart && clash.periodEnd) {
      throw new ConflictException(`${name} já tem uma folha que cobre ${fmtDay(clash.periodStart)} a ${fmtDay(clash.periodEnd)}. Edite, cancele ou exclua essa folha antes de criar outra neste período.`);
    }
  }

  /** Monta valores e itens da folha: salário proporcional ao ciclo, ponto (extras, faltas, suspensão), lançamentos e impostos. */
  private async build(companyId: string, employee: EmployeeForPayroll, start: Date, end: Date, days: number, manual: ManualPayrollItemDto[]) {
    const salary = safe(employee.salary);
    if (salary === null || salary <= 0) throw new BadRequestException(`${employee.name} está sem salário cadastrado. Informe o salário no cadastro do funcionário.`);

    const [h, m] = String(employee.dailyWorkload ?? '08:00').split(':').map(Number);
    const dailyMinutes = Number.isFinite(h) && h > 0 ? h * 60 + (Number.isFinite(m) ? m : 0) : 480;
    const scale = String(employee.workScale ?? '5X2').toUpperCase();
    const rule = employee.workScheduleRule;
    const restDays = Array.isArray(rule?.restDaysOfWeek) && rule!.restDaysOfWeek!.length ? rule!.restDaysOfWeek! : scale === '6X1' ? [0] : [0, 6];

    let workdays = 0; let sundays = 0;
    for (let i = 0; i < days; i++) {
      const dow = new Date(start.getTime() + i * DAY_MS).getUTCDay();
      if (restDays.includes(dow)) { if (dow === 0) sundays++; } else workdays++;
    }
    const lastOfMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
    const fullMonth = start.getUTCDate() === 1 && end.getUTCDate() === lastOfMonth && start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();

    const tracks = await this.prisma.timeTrack.findMany({
      where: { companyId, employeeId: employee.id, date: { gte: start, lte: end } },
      select: { absenceMinutes: true, lateMinutes: true, earlyLeaveMinutes: true, overtime50Minutes: true, overtime100Minutes: true, nightShiftMinutes: true, overtimeApprovalStatus: true, overtimeHandling: true, overtimePaymentMinutes: true, incidentType: true },
    });
    const sum = (pick: (t: (typeof tracks)[number]) => number | null | undefined, only?: (t: (typeof tracks)[number]) => boolean) =>
      tracks.filter((t) => (only ? only(t) : true)).reduce((s, t) => s + Math.max(0, Number(pick(t) ?? 0) || 0), 0);
    // Extra paga = so a autorizada e so a parte que nao foi para o banco de horas (mesma regra do fechamento).
    const paidOvertime = (pick: (t: (typeof tracks)[number]) => number | null | undefined) =>
      tracks.reduce((s, t) => s + Math.round(Math.max(0, Number(pick(t) ?? 0) || 0) * overtimePaymentRatio(t)), 0);
    const suspensionDays = tracks.filter((t) => t.incidentType === 'SUSPENSÃO' && (t.absenceMinutes ?? 0) > 0).length;

    const taxContext = await this.officialCalculator.resolveTaxContext(end);
    const dependentsRaw = typeof employee.dependents === 'string' ? safeJson(employee.dependents) : employee.dependents;
    const dependents = Array.isArray(dependentsRaw) ? dependentsRaw.length : 0;

    const calc = this.officialCalculator.calculate({
      salary,
      weeklyMinutes: dailyMinutes * Math.max(1, 7 - restDays.length),
      isPartialMonth: !fullMonth,
      scheduledMinutesInPeriod: workdays * dailyMinutes,
      overtime50Minutes: paidOvertime((t) => t.overtime50Minutes),
      overtime100Minutes: paidOvertime((t) => t.overtime100Minutes),
      nightShiftMinutes: sum((t) => t.nightShiftMinutes),
      absenceMinutes: sum((t) => t.absenceMinutes),
      lateMinutes: sum((t) => t.lateMinutes),
      earlyLeaveMinutes: sum((t) => t.earlyLeaveMinutes),
      payableWorkdays: workdays,
      paidRestDays: sundays,
      dependents,
      taxContext,
    });

    const earnings = round2(manual.filter((i) => !DEDUCTION_TYPES.includes(i.type)).reduce((s, i) => s + i.amount, 0));
    const deductions = round2(manual.filter((i) => DEDUCTION_TYPES.includes(i.type)).reduce((s, i) => s + i.amount, 0));
    const gross = round2(calc.grossPay + earnings);
    const taxes = this.officialCalculator.applyTaxes(gross, dependents, taxContext);
    const net = round2(Math.max(0, taxes.netPay - deductions));
    if (![gross, net, taxes.inssDiscount, taxes.irrfDiscount, taxes.fgtsAmount].every((v) => Number.isFinite(v))) {
      throw new BadRequestException(`Não foi possível calcular a folha de ${employee.name}: confira salário e jornada no cadastro.`);
    }

    const item = (type: PayrollItemType, description: string, amount: number, isDeduction: boolean) => ({ type, description, amount: round2(amount), isDeduction });
    const items = [
      item('BASE_SALARY', fullMonth ? 'Salário base' : `Salário proporcional (${workdays} dia(s) úteis do ciclo)`, calc.salaryBase, false),
      ...(calc.overtime50Value + calc.overtime100Value > 0 ? [item('OVERTIME', 'Horas extras aprovadas', calc.overtime50Value + calc.overtime100Value, false)] : []),
      ...(calc.nightShiftValue > 0 ? [item('NIGHT_SHIFT', 'Adicional noturno', calc.nightShiftValue, false)] : []),
      ...(calc.dsrValue > 0 ? [item('OTHER_EARNING', 'DSR sobre horas variáveis', calc.dsrValue, false)] : []),
      ...manual.filter((i) => !DEDUCTION_TYPES.includes(i.type)).map((i) => item(i.type as PayrollItemType, i.description.trim(), i.amount, false)),
      ...(calc.absenceDiscount > 0 ? [item('ABSENCE_DEDUCTION', suspensionDays ? `Faltas e suspensão (${suspensionDays} dia(s) de suspensão)` : 'Faltas', calc.absenceDiscount, true)] : []),
      ...(calc.lateDiscount + calc.earlyLeaveDiscount > 0 ? [item('ABSENCE_DEDUCTION', 'Atrasos e saídas antecipadas', calc.lateDiscount + calc.earlyLeaveDiscount, true)] : []),
      ...manual.filter((i) => DEDUCTION_TYPES.includes(i.type)).map((i) => item(i.type as PayrollItemType, i.description.trim(), i.amount, true)),
      item('INSS', 'Contribuição INSS', taxes.inssDiscount, true),
      item('IRRF', 'Imposto de Renda Retido na Fonte', taxes.irrfDiscount, true),
      item('FGTS', 'FGTS (encargo patronal, não desconta do funcionário)', taxes.fgtsAmount, false),
    ];

    return {
      data: {
        referenceMonth: end.getUTCMonth() + 1,
        referenceYear: end.getUTCFullYear(),
        periodStart: start,
        periodEnd: end,
        baseSalary: calc.salaryBase,
        grossSalary: gross,
        netSalary: net,
        inssAmount: taxes.inssDiscount,
        irrfAmount: taxes.irrfDiscount,
        fgtsAmount: taxes.fgtsAmount,
        overtimeAmount: round2(calc.overtime50Value + calc.overtime100Value),
        nightShiftAmount: calc.nightShiftValue,
        calculationVersion: calc.calculationVersion,
        taxTableSnapshot: JSON.parse(JSON.stringify(taxContext)),
      },
      items,
    };
  }

  // ---------- edição ----------

  /** Edita ciclo, observações e lançamentos de uma folha em rascunho; os valores são recalculados. */
  async update(companyId: string, id: string, dto: UpdatePayrollDto) {
    const current = await this.load(companyId, id);
    if (current.status !== 'DRAFT') throw new BadRequestException('Só é possível editar folha em rascunho. Para alterar uma folha aprovada, reabra-a primeiro.');
    const { periodStart, periodEnd, days } = parsePeriod(
      dto.periodStart ?? current.periodStart?.toISOString() ?? '',
      dto.periodEnd ?? current.periodEnd?.toISOString() ?? '',
    );
    const employee = await this.prisma.employee.findFirst({
      where: { companyId, id: current.employeeId },
      select: { id: true, name: true, salary: true, dependents: true, dailyWorkload: true, workScale: true, workScheduleRule: true },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado.');
    await this.assertNoOverlap(companyId, current.employeeId, periodStart, periodEnd, employee.name, id);

    const manual: ManualPayrollItemDto[] = dto.items ?? current.items
      .filter((i) => ['BONUS', 'COMMISSION', 'OTHER_EARNING', 'ADVANCE', 'OTHER_DEDUCTION'].includes(i.type) && !i.description.startsWith('DSR'))
      .map((i) => ({ type: i.type as ManualPayrollItemDto['type'], description: i.description, amount: Number(i.amount) }));

    const built = await this.build(companyId, employee as EmployeeForPayroll, periodStart, periodEnd, days, manual);
    await this.prisma.$transaction([
      this.prisma.payrollItem.deleteMany({ where: { payrollId: id } }),
      this.prisma.payroll.update({
        where: { id },
        data: { ...built.data, observations: dto.observations ?? current.observations, items: { create: built.items.map((i) => ({ ...i, companyId })) } },
      }),
    ]);
    return this.get(companyId, id);
  }

  /** Recalcula com os dados atuais (ponto, salário), sem mudar ciclo nem lançamentos. */
  recalculate(companyId: string, id: string) {
    return this.update(companyId, id, {});
  }

  // ---------- ciclo de vida ----------

  async approve(companyId: string, id: string, actorId: string) {
    const payroll = await this.load(companyId, id);
    if (payroll.status !== 'DRAFT') throw new BadRequestException('Só folha em rascunho pode ser aprovada.');
    if (this.serialize(payroll).invalid) throw new BadRequestException('Esta folha tem valores inválidos. Recalcule antes de aprovar.');
    await this.prisma.payroll.update({ where: { id }, data: { status: 'APPROVED', approvedBy: actorId, approvedAt: new Date() } });
    return this.get(companyId, id);
  }

  /** Volta uma folha aprovada (e ainda não paga) para rascunho, para poder editar. */
  async reopen(companyId: string, id: string) {
    const payroll = await this.load(companyId, id);
    if (payroll.status !== 'APPROVED') throw new BadRequestException('Só folha aprovada (e não paga) pode ser reaberta.');
    await this.prisma.payroll.update({ where: { id }, data: { status: 'DRAFT', approvedBy: null, approvedAt: null } });
    return this.get(companyId, id);
  }

  async markPaid(companyId: string, id: string) {
    const payroll = await this.load(companyId, id);
    if (payroll.status !== 'APPROVED') throw new BadRequestException('Aprove a folha antes de registrar o pagamento.');
    await this.prisma.payroll.update({ where: { id }, data: { status: 'PAID', paidAt: new Date() } });
    return this.get(companyId, id);
  }

  async cancel(companyId: string, id: string, dto: CancelPayrollDto) {
    const payroll = await this.load(companyId, id);
    if (payroll.status === 'PAID') throw new BadRequestException('Folha já paga não pode ser cancelada.');
    if (payroll.status === 'CANCELLED') throw new BadRequestException('Esta folha já está cancelada.');
    await this.prisma.payroll.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: dto.reason.trim() } });
    return this.get(companyId, id);
  }

  async delete(companyId: string, id: string) {
    const payroll = await this.load(companyId, id);
    if (payroll.status !== 'DRAFT' && payroll.status !== 'CANCELLED') throw new BadRequestException('Só folha em rascunho ou cancelada pode ser excluída. Cancele a folha primeiro.');
    await this.prisma.payroll.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Folha de pagamento excluída.' };
  }
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return null; }
}
