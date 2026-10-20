import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../../common/types/auth.types';
import { roundMoney } from '../../common/utils/money';
import type { CreateDocRequestDto, CreateTaskDto, GenerateFeesDto, SaveClientDto, UpdateDocRequestDto, UpdateTaskDto } from './accounting-office.dto';
import { resolveMonth } from './accounting-hub.service';

const num = (value: unknown) => Number(value ?? 0);
const PENDING_CLOSING = ['DRAFT', 'IN_REVIEW'];
const PENDING_PAYROLL = ['DRAFT', 'PROCESSING'];

/** Itens manuais do checklist mensal de cada cliente (o contador marca conforme a rotina do escritório). */
export const MANUAL_CHECKLIST = [
  { key: 'EXTRATOS', label: 'Recebeu os extratos bancários', department: 'CONTABIL' },
  { key: 'NOTAS', label: 'Recebeu as notas fiscais (entrada e saída)', department: 'FISCAL' },
  { key: 'MOVIMENTO_DP', label: 'Recebeu movimentos do DP (atestados, faltas, variáveis)', department: 'DP' },
  { key: 'ESOCIAL', label: 'Eventos do eSocial transmitidos', department: 'DP' },
  { key: 'GUIAS_ENVIADAS', label: 'Guias enviadas ao cliente (DAS, FGTS, INSS, IRRF)', department: 'FISCAL' },
  { key: 'GUIAS_PAGAS', label: 'Cliente confirmou o pagamento das guias', department: 'ATENDIMENTO' },
] as const;

const REGIMES = ['MEI', 'SIMPLES', 'PRESUMIDO', 'REAL'];

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
/** Guias que vencem em dia não útil são antecipadas para o dia útil anterior (regra geral de DAS, DARF e FGTS). */
function businessDayBefore(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() - 1);
  return date;
}
/** 5º dia útil do mês (sábado conta como dia útil para o pagamento de salário). */
function fifthBusinessDay(year: number, month: number) {
  const date = new Date(Date.UTC(year, month - 1, 1));
  let count = 0;
  while (true) {
    if (date.getUTCDay() !== 0 && ++count === 5) return date;
    date.setUTCDate(date.getUTCDate() + 1);
  }
}
function lastBusinessDay(year: number, month: number) {
  const date = new Date(Date.UTC(year, month, 0));
  while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() - 1);
  return date;
}

@Injectable()
export class AccountingOfficeService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- calendário de obrigações ----------

  /**
   * Obrigações com vencimento no mês escolhido (competência = mês anterior). Datas gerais de referência:
   * confirme no calendário oficial (Receita, Caixa, eSocial) — feriados locais não são considerados.
   */
  private obligations(year: number, month: number, regimes: Record<string, number>) {
    const compYear = month === 1 ? year - 1 : year;
    const compMonth = month === 1 ? 12 : month - 1;
    const competencia = `${compYear}-${pad(compMonth)}`;
    const simples = (regimes.SIMPLES ?? 0) + (regimes.MEI ?? 0);
    const all = Object.values(regimes).reduce((a, b) => a + b, 0);
    const items: Array<{ key: string; label: string; department: string; date: string; competencia: string; clients: number; note?: string }> = [
      { key: 'ESOCIAL_FECHAMENTO', label: 'eSocial: fechamento da folha (S-1299)', department: 'DP', date: ymd(businessDayBefore(year, month, 15)), competencia, clients: all },
      { key: 'FGTS', label: 'FGTS Digital: guia do mês', department: 'DP', date: ymd(businessDayBefore(year, month, 20)), competencia, clients: all },
      { key: 'DARF_PREV', label: 'DARF previdenciário (INSS patronal e retido via DCTFWeb)', department: 'DP', date: ymd(businessDayBefore(year, month, 20)), competencia, clients: all },
      { key: 'IRRF_FOLHA', label: 'DARF 0561: IRRF retido da folha', department: 'DP', date: ymd(businessDayBefore(year, month, 20)), competencia, clients: all },
      { key: 'SALARIO', label: 'Pagamento do salário: 5º dia útil (art. 459 §1º)', department: 'DP', date: ymd(fifthBusinessDay(year, month)), competencia, clients: all },
      { key: 'DAS', label: 'DAS: Simples Nacional / MEI', department: 'FISCAL', date: ymd(businessDayBefore(year, month, 20)), competencia, clients: simples },
      { key: 'DCTFWEB', label: 'DCTFWeb: transmissão', department: 'FISCAL', date: ymd(lastBusinessDay(year, month)), competencia, clients: all },
    ];
    const annual: Record<number, Array<{ key: string; label: string; department: string; day: number; clients: number }>> = {
      3: [{ key: 'DEFIS', label: 'DEFIS: declaração anual do Simples', department: 'FISCAL', day: 31, clients: regimes.SIMPLES ?? 0 }],
      5: [
        { key: 'DASN', label: 'DASN-SIMEI: declaração anual do MEI', department: 'FISCAL', day: 31, clients: regimes.MEI ?? 0 },
        { key: 'ECD', label: 'ECD: escrituração contábil digital', department: 'CONTABIL', day: 31, clients: (regimes.PRESUMIDO ?? 0) + (regimes.REAL ?? 0) },
      ],
      7: [{ key: 'ECF', label: 'ECF: escrituração contábil fiscal', department: 'CONTABIL', day: 31, clients: (regimes.PRESUMIDO ?? 0) + (regimes.REAL ?? 0) }],
      11: [{ key: '13_PRIMEIRA', label: '13º salário: 1ª parcela', department: 'DP', day: 30, clients: all }],
      12: [{ key: '13_SEGUNDA', label: '13º salário: 2ª parcela', department: 'DP', day: 20, clients: all }],
    };
    for (const row of annual[month] ?? []) items.push({ key: row.key, label: row.label, department: row.department, date: ymd(businessDayBefore(year, month, row.day)), competencia: String(compYear), clients: row.clients, note: 'Confira o prazo do ano no calendário oficial.' });
    return items.sort((a, b) => a.date.localeCompare(b.date)).filter((item) => item.clients > 0);
  }

  // ---------- painel ----------

  async dashboard(month?: string) {
    const period = resolveMonth(month);
    const [companies, clients, closings, payrolls, docs, tasks, fees, manual] = await Promise.all([
      this.prisma.company.findMany({ select: { id: true, name: true, document: true, status: true }, orderBy: { name: 'asc' }, take: 1000 }),
      this.prisma.accountingClient.findMany(),
      this.prisma.timeClosing.groupBy({ by: ['companyId', 'status'], where: { periodEnd: { gte: period.start, lt: period.end } }, _count: true }),
      this.prisma.payroll.groupBy({ by: ['companyId', 'status'], where: { referenceYear: period.year, referenceMonth: period.month, deletedAt: null }, _count: true }),
      this.prisma.accountingDocRequest.groupBy({ by: ['companyId', 'status'], where: { month: period.key }, _count: true }),
      this.prisma.accountingTask.groupBy({ by: ['companyId'], where: { status: { not: 'DONE' } }, _count: true }),
      this.prisma.accountingFee.findMany({ where: { month: period.key } }),
      this.prisma.accountingChecklistItem.groupBy({ by: ['companyId'], where: { month: period.key, done: true }, _count: true }),
    ]);
    const clientBy = new Map(clients.map((c) => [c.companyId, c]));
    const feeBy = new Map(fees.map((f) => [f.companyId, f]));
    const manualDone = new Map(manual.map((m) => [m.companyId, m._count]));
    const taskBy = new Map(tasks.map((t) => [t.companyId, t._count]));
    const total = MANUAL_CHECKLIST.length + 2;
    const now = Date.now();

    const regimes: Record<string, number> = {};
    const rows = companies.map((company) => {
      const client = clientBy.get(company.id);
      const regime = client?.taxRegime ?? 'SIMPLES';
      regimes[regime] = (regimes[regime] ?? 0) + 1;
      const cl = closings.filter((r) => r.companyId === company.id);
      const pr = payrolls.filter((r) => r.companyId === company.id);
      const count = (rowsIn: Array<{ status: string; _count: number }>, statuses?: string[]) => rowsIn.filter((r) => !statuses || statuses.includes(r.status)).reduce((s, r) => s + r._count, 0);
      const closingsTotal = count(cl); const closingsPending = count(cl, PENDING_CLOSING);
      const payrollsTotal = count(pr); const payrollsPending = count(pr, PENDING_PAYROLL);
      const dc = docs.filter((r) => r.companyId === company.id);
      const docsPending = dc.filter((r) => r.status === 'PENDING').reduce((s, r) => s + r._count, 0);
      const docsTotal = dc.filter((r) => r.status !== 'CANCELLED').reduce((s, r) => s + r._count, 0);
      const fee = feeBy.get(company.id);
      const feeStatus = !fee ? null : fee.status === 'PAID' ? 'PAID' : fee.dueDate.getTime() < now ? 'OVERDUE' : 'OPEN';
      const done = (manualDone.get(company.id) ?? 0) + (closingsTotal > 0 && closingsPending === 0 ? 1 : 0) + (payrollsTotal > 0 && payrollsPending === 0 ? 1 : 0);
      return {
        id: company.id, name: company.name, document: company.document, regime,
        monthlyFee: num(client?.monthlyFee), responsibleId: client?.responsibleId ?? null,
        checklistDone: done, checklistTotal: total,
        closingsTotal, closingsPending, payrollsTotal, payrollsPending,
        docsPending, docsTotal, tasksOpen: taskBy.get(company.id) ?? 0,
        feeStatus, feeAmount: fee ? num(fee.amount) : null,
      };
    });
    return {
      period: { key: period.key, year: period.year, month: period.month },
      totals: {
        clients: rows.length,
        checklistComplete: rows.filter((r) => r.checklistDone >= r.checklistTotal).length,
        docsPending: rows.reduce((s, r) => s + r.docsPending, 0),
        tasksOpen: tasks.reduce((s, t) => s + t._count, 0),
        feeOpen: roundMoney(fees.filter((f) => f.status !== 'PAID').reduce((s, f) => s + num(f.amount), 0)),
        feePaid: roundMoney(fees.filter((f) => f.status === 'PAID').reduce((s, f) => s + num(f.amount), 0)),
        feeOverdue: fees.filter((f) => f.status !== 'PAID' && f.dueDate.getTime() < now).length,
      },
      obligations: this.obligations(period.year, period.month, regimes),
      clients: rows,
    };
  }

  // ---------- clientes ----------

  async saveClient(companyId: string, dto: SaveClientDto) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
    if (!company) throw new NotFoundException('Empresa não encontrada.');
    if (dto.taxRegime && !REGIMES.includes(dto.taxRegime)) throw new BadRequestException('Regime tributário inválido.');
    const data = { taxRegime: dto.taxRegime, responsibleId: dto.responsibleId, monthlyFee: dto.monthlyFee, feeDueDay: dto.feeDueDay, notes: dto.notes };
    return this.prisma.accountingClient.upsert({ where: { companyId }, update: data, create: { companyId, ...data } });
  }

  async getClient(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true, document: true } });
    if (!company) throw new NotFoundException('Empresa não encontrada.');
    const client = await this.prisma.accountingClient.findUnique({ where: { companyId } });
    return { company, client: client ? { ...client, monthlyFee: num(client.monthlyFee) } : { companyId, taxRegime: 'SIMPLES', responsibleId: null, monthlyFee: 0, feeDueDay: 10, notes: null } };
  }

  /** Time do escritório: perfis que podem receber tarefas. */
  team() {
    return this.prisma.user.findMany({ where: { role: { in: ['DEV', 'CEO', 'CONTABIL'] }, isActive: true }, select: { id: true, name: true, role: true }, orderBy: { name: 'asc' }, take: 200 });
  }

  // ---------- checklist ----------

  async checklist(companyId: string, month?: string) {
    const period = resolveMonth(month);
    const [closings, payrolls, manual, employees] = await Promise.all([
      this.prisma.timeClosing.groupBy({ by: ['status'], where: { companyId, periodEnd: { gte: period.start, lt: period.end } }, _count: true }),
      this.prisma.payroll.groupBy({ by: ['status'], where: { companyId, referenceYear: period.year, referenceMonth: period.month, deletedAt: null }, _count: true }),
      this.prisma.accountingChecklistItem.findMany({ where: { companyId, month: period.key } }),
      this.dpMovements(companyId, period),
    ]);
    const sum = (rows: Array<{ status: string; _count: number }>, statuses?: string[]) => rows.filter((r) => !statuses || statuses.includes(r.status)).reduce((s, r) => s + r._count, 0);
    const cTotal = sum(closings); const cPending = sum(closings, PENDING_CLOSING);
    const pTotal = sum(payrolls); const pPending = sum(payrolls, PENDING_PAYROLL);
    const auto = [
      { key: 'AUTO_PONTO', label: 'Fechamento de ponto revisado e aprovado', department: 'DP', auto: true, done: cTotal > 0 && cPending === 0, hint: cTotal === 0 ? 'Nenhum fechamento na competência' : cPending ? `${cPending} de ${cTotal} pendente(s)` : `${cTotal} aprovado(s)` },
      { key: 'AUTO_FOLHA', label: 'Folha de pagamento aprovada', department: 'DP', auto: true, done: pTotal > 0 && pPending === 0, hint: pTotal === 0 ? 'Nenhuma folha na competência' : pPending ? `${pPending} de ${pTotal} pendente(s)` : `${pTotal} aprovada(s)` },
    ];
    const byKey = new Map(manual.map((m) => [m.itemKey, m]));
    const items = [...auto, ...MANUAL_CHECKLIST.map((item) => {
      const saved = byKey.get(item.key);
      return { ...item, auto: false, done: saved?.done ?? false, doneAt: saved?.doneAt ?? null, note: saved?.note ?? null, hint: null as string | null };
    })];
    return { period: { key: period.key }, items, movements: employees };
  }

  async toggleChecklist(actor: JwtUser, companyId: string, month: string, itemKey: string, done: boolean, note?: string) {
    if (!MANUAL_CHECKLIST.some((item) => item.key === itemKey)) throw new BadRequestException('Item do checklist inválido.');
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
    if (!company) throw new NotFoundException('Empresa não encontrada.');
    const data = { done, doneAt: done ? new Date() : null, doneById: done ? actor.sub : null, note: note ?? undefined };
    return this.prisma.accountingChecklistItem.upsert({ where: { companyId_month_itemKey: { companyId, month, itemKey } }, update: data, create: { companyId, month, itemKey, ...data } });
  }

  /** Movimentos do DP no mês que geram trabalho para o escritório: admissões, desligamentos, férias e ASO a vencer. */
  private async dpMovements(companyId: string, period: ReturnType<typeof resolveMonth>) {
    const soon = new Date(period.end.getTime() + 30 * 86_400_000);
    const [admissions, terminations, vacations, asoDue] = await Promise.all([
      this.prisma.employee.findMany({ where: { companyId, admissionDate: { gte: period.start, lt: period.end } }, select: { id: true, name: true, admissionDate: true }, orderBy: { admissionDate: 'asc' }, take: 100 }),
      this.prisma.employee.findMany({ where: { companyId, terminationDate: { gte: period.start, lt: period.end } }, select: { id: true, name: true, terminationDate: true }, orderBy: { terminationDate: 'asc' }, take: 100 }),
      this.prisma.vacation.findMany({ where: { employee: { companyId }, status: { in: ['APPROVED', 'COMPLETED'] }, startDate: { lt: period.end }, endDate: { gte: period.start } }, select: { id: true, startDate: true, endDate: true, employee: { select: { name: true } } }, orderBy: { startDate: 'asc' }, take: 100 }),
      this.prisma.employeeAsoRecord.findMany({ where: { companyId, status: { in: ['PENDING', 'NEAR_EXPIRATION', 'EXPIRED'] }, dueDate: { lt: soon } }, select: { id: true, dueDate: true, asoType: true, employee: { select: { name: true } } }, orderBy: { dueDate: 'asc' }, take: 100 }),
    ]);
    return {
      admissions: admissions.map((e) => ({ id: e.id, name: e.name, date: e.admissionDate })),
      terminations: terminations.map((e) => ({ id: e.id, name: e.name, date: e.terminationDate })),
      vacations: vacations.map((v) => ({ id: v.id, name: v.employee.name, start: v.startDate, end: v.endDate })),
      asoDue: asoDue.map((a) => ({ id: a.id, name: a.employee.name, date: a.dueDate, type: a.asoType })),
    };
  }

  // ---------- tarefas ----------

  listTasks(filters: { status?: string; companyId?: string; assigneeId?: string }) {
    return this.prisma.accountingTask.findMany({
      where: { ...(filters.status === 'OPEN' ? { status: { not: 'DONE' } } : filters.status ? { status: filters.status } : {}), ...(filters.companyId ? { companyId: filters.companyId } : {}), ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}) },
      orderBy: [{ status: 'asc' }, { dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: 300,
    });
  }

  createTask(actor: JwtUser, dto: CreateTaskDto) {
    return this.prisma.accountingTask.create({ data: { ...dto, dueDate: dto.dueDate ? new Date(dto.dueDate) : null, createdById: actor.sub } });
  }

  async updateTask(id: string, dto: UpdateTaskDto) {
    const task = await this.prisma.accountingTask.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!task) throw new NotFoundException('Tarefa não encontrada.');
    const { dueDate, ...rest } = dto;
    return this.prisma.accountingTask.update({
      where: { id },
      data: { ...rest, ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}), ...(dto.status ? { completedAt: dto.status === 'DONE' ? new Date() : null } : {}) },
    });
  }

  async deleteTask(id: string) {
    const result = await this.prisma.accountingTask.deleteMany({ where: { id } });
    if (!result.count) throw new NotFoundException('Tarefa não encontrada.');
    return { ok: true };
  }

  // ---------- cobrança de documentos ----------

  listDocs(filters: { month?: string; companyId?: string; status?: string }) {
    return this.prisma.accountingDocRequest.findMany({
      where: { ...(filters.month ? { month: filters.month } : {}), ...(filters.companyId ? { companyId: filters.companyId } : {}), ...(filters.status ? { status: filters.status } : {}) },
      orderBy: [{ status: 'asc' }, { dueDate: { sort: 'asc', nulls: 'last' } }],
      take: 500,
    });
  }

  async createDocs(actor: JwtUser, dto: CreateDocRequestDto) {
    const company = await this.prisma.company.findUnique({ where: { id: dto.companyId }, select: { id: true } });
    if (!company) throw new NotFoundException('Empresa não encontrada.');
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    await this.prisma.accountingDocRequest.createMany({ data: dto.items.map((item) => ({ companyId: dto.companyId, month: dto.month, docType: item.docType ?? 'OUTROS', title: item.title, dueDate, createdById: actor.sub })) });
    return { created: dto.items.length };
  }

  async updateDoc(id: string, dto: UpdateDocRequestDto) {
    const doc = await this.prisma.accountingDocRequest.findUnique({ where: { id }, select: { id: true } });
    if (!doc) throw new NotFoundException('Pedido de documento não encontrado.');
    const data: Record<string, unknown> = {};
    if (dto.status === 'RECEIVED') { data.status = 'RECEIVED'; data.receivedAt = new Date(); }
    else if (dto.status) { data.status = dto.status; data.receivedAt = null; }
    if (dto.note !== undefined) data.note = dto.note;
    // O lembrete fica registrado; o envio por WhatsApp/e-mail ainda é feito fora do sistema.
    if (dto.remind) { data.lastReminderAt = new Date(); data.reminderCount = { increment: 1 }; }
    return this.prisma.accountingDocRequest.update({ where: { id }, data });
  }

  async deleteDoc(id: string) {
    const result = await this.prisma.accountingDocRequest.deleteMany({ where: { id } });
    if (!result.count) throw new NotFoundException('Pedido de documento não encontrado.');
    return { ok: true };
  }

  // ---------- honorários ----------

  async listFees(month?: string) {
    const period = resolveMonth(month);
    const fees = await this.prisma.accountingFee.findMany({ where: { month: period.key }, orderBy: { dueDate: 'asc' }, take: 1000 });
    const now = Date.now();
    return fees.map((f) => ({ ...f, amount: num(f.amount), status: f.status === 'PAID' ? 'PAID' : f.dueDate.getTime() < now ? 'OVERDUE' : 'OPEN' }));
  }

  /** Gera o honorário do mês para todo cliente com valor definido (não duplica o que já existe). */
  async generateFees(dto: GenerateFeesDto) {
    const period = resolveMonth(dto.month);
    const clients = await this.prisma.accountingClient.findMany({ where: { monthlyFee: { gt: 0 } } });
    const result = await this.prisma.accountingFee.createMany({
      data: clients.map((c) => ({ companyId: c.companyId, month: period.key, amount: c.monthlyFee, dueDate: new Date(Date.UTC(period.year, period.month - 1, Math.min(Math.max(c.feeDueDay, 1), 28))) })),
      skipDuplicates: true,
    });
    return { generated: result.count };
  }

  async payFee(id: string, paid: boolean) {
    const fee = await this.prisma.accountingFee.findUnique({ where: { id }, select: { id: true } });
    if (!fee) throw new NotFoundException('Honorário não encontrado.');
    return this.prisma.accountingFee.update({ where: { id }, data: paid ? { status: 'PAID', paidAt: new Date() } : { status: 'OPEN', paidAt: null } });
  }
}


