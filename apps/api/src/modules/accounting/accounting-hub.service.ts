import { fmt, PDF, PdfReport } from '../../common/pdf/pdf-report';
import { countDependents } from '../../common/utils/dependents';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { roundMoney } from '../../common/utils/money';
import type { JwtUser } from '../../common/types/auth.types';
import { createPdfSink, safeFileName, sendPdf } from '../../common/pdf/pdf-response';
import { PayrollCalculationService } from '../time-track/payroll-calculation.service';
import { TimeClosingService } from '../time-track/time-closing.service';
import { TimeTrackService } from '../time-track/time-track.service';
import { AccountingAccessService } from '../../common/accounting-access';
import { AdjustClosingDto, CorrectPayrollDto } from './accounting.dto';
import { AccountingRulesService } from './accounting-rules.service';
import { accountingEntries, accountingTotals } from './accounting-totals';
import { reconcilePayroll } from '../payroll/payroll-reconciliation';

const num = (value: unknown) => Number(value ?? 0);
const round = (value: number) => roundMoney(value);

export function resolveMonth(month?: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month ?? '');
  const now = new Date();
  const year = match ? Number(match[1]) : now.getUTCFullYear();
  const monthNumber = match ? Number(match[2]) : now.getUTCMonth() + 1;
  return {
    year, month: monthNumber, key: `${year}-${String(monthNumber).padStart(2, '0')}`,
    start: new Date(Date.UTC(year, monthNumber - 1, 1)), end: new Date(Date.UTC(year, monthNumber, 1)), last: new Date(Date.UTC(year, monthNumber, 0)),
  };
}

@Injectable()
export class AccountingHubService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payroll: PayrollCalculationService,
    private readonly closing: TimeClosingService,
    private readonly rules: AccountingRulesService,
    private readonly access: AccountingAccessService,
    private readonly timeTrack: TimeTrackService,
  ) {}

  private async assertCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true, document: true } });
    if (!company) throw new NotFoundException('Empresa não encontrada.');
    return company;
  }

  /** Visão da competência já com o escopo do usuário (CONTABIL só enxerga as empresas que atende). */
  async overviewFor(actor: JwtUser, month?: string, companyId?: string) {
    if (companyId) await this.access.assertAccountantCanAccess(actor, companyId);
    return this.overview(month, companyId, companyId ? null : await this.access.accessibleCompanyIds(actor));
  }

  /** Visão da competência: todas as empresas (plataforma) ou o detalhe de uma empresa. */
  /** `allowedIds`: empresas permitidas ao usuário (null = todas). Com companyId, o controller já validou o acesso. */
  async overview(month?: string, companyId?: string, allowedIds: string[] | null = null) {
    const period = resolveMonth(month);
    const rules = await this.rules.list(period.last);
    const ruleVersions = Object.fromEntries(rules.rules.map((rule) => [rule.type, rule.current?.version ?? null]));

    if (companyId) {
      const company = await this.assertCompany(companyId);
      const [closings, payrolls] = await Promise.all([
        this.prisma.timeClosing.findMany({
          where: { companyId, periodEnd: { gte: period.start, lt: period.end } },
          select: { id: true, companyId: true, employeeId: true, status: true, periodStart: true, periodEnd: true, grossPay: true, netPay: true, inssDiscount: true, irrfDiscount: true, fgtsAmount: true, overtime50: true, overtime100: true, nightShift: true, calculationVersion: true, updatedAt: true, employee: { select: { name: true, position: true } } },
          orderBy: [{ status: 'asc' }, { employee: { name: 'asc' } }],
        }),
        this.prisma.payroll.findMany({
          where: { companyId, referenceYear: period.year, referenceMonth: period.month, deletedAt: null, status: { not: 'CANCELLED' } },
          select: { id: true, companyId: true, employeeId: true, status: true, periodStart: true, periodEnd: true, baseSalary: true, overtimeAmount: true, nightShiftAmount: true, grossSalary: true, inssAmount: true, irrfAmount: true, fgtsAmount: true, netSalary: true, calculationVersion: true, updatedAt: true, employee: { select: { name: true, position: true } }, items: { select: { type: true, description: true, amount: true, isDeduction: true }, orderBy: { createdAt: 'asc' } } },
          orderBy: { employee: { name: 'asc' } },
        }),
      ]);
      const amounts = accountingTotals(closings, payrolls);
      return {
        scope: 'COMPANY', period: { year: period.year, month: period.month, key: period.key }, company, ruleVersions,
        totals: {
          closings: closings.length,
          gross: amounts.gross, net: amounts.net, inss: amounts.inss, irrf: amounts.irrf, fgts: amounts.fgts,
          estimatedClosings: amounts.estimatedClosings,
          payrolls: payrolls.length,
        },
        closings: closings.map((row) => ({ ...row, grossPay: num(row.grossPay), netPay: num(row.netPay), inssDiscount: num(row.inssDiscount), irrfDiscount: num(row.irrfDiscount), fgtsAmount: num(row.fgtsAmount) })),
        payrolls: payrolls.map((row) => ({ ...row, needsRecalculation: !reconcilePayroll(row), baseSalary: num(row.baseSalary), overtimeAmount: num(row.overtimeAmount), nightShiftAmount: num(row.nightShiftAmount), grossSalary: num(row.grossSalary), inssAmount: num(row.inssAmount), irrfAmount: num(row.irrfAmount), fgtsAmount: num(row.fgtsAmount), netSalary: num(row.netSalary), items: row.items.map((item) => ({ ...item, amount: num(item.amount) })) })),
      };
    }

    const [companies, closings, payrolls] = await Promise.all([
      this.prisma.company.findMany({ where: allowedIds ? { id: { in: allowedIds } } : undefined, select: { id: true, name: true, document: true, status: true }, orderBy: { name: 'asc' } }),
      this.prisma.timeClosing.findMany({ where: { ...(allowedIds ? { companyId: { in: allowedIds } } : {}), periodEnd: { gte: period.start, lt: period.end } }, select: { companyId: true, employeeId: true, status: true, periodStart: true, periodEnd: true, grossPay: true, netPay: true, inssDiscount: true, irrfDiscount: true, fgtsAmount: true } }),
      this.prisma.payroll.findMany({ where: { ...(allowedIds ? { companyId: { in: allowedIds } } : {}), referenceYear: period.year, referenceMonth: period.month, deletedAt: null, status: { not: 'CANCELLED' } }, select: { companyId: true, employeeId: true, status: true, periodStart: true, periodEnd: true, grossSalary: true, netSalary: true, inssAmount: true, irrfAmount: true, fgtsAmount: true } }),
    ]);
    const byCompany = <T extends { companyId: string }>(records: T[]) => {
      const groups = new Map<string, T[]>();
      for (const record of records) {
        if (!groups.has(record.companyId)) groups.set(record.companyId, []);
        groups.get(record.companyId)!.push(record);
      }
      return groups;
    };
    const closingGroups = byCompany(closings);
    const payrollGroups = byCompany(payrolls);
    const rows = companies.map((company) => {
      const cl = closingGroups.get(company.id) ?? [];
      const pr = payrollGroups.get(company.id) ?? [];
      const countStatus = (rows: { status: string }[], statuses: string[]) => rows.filter((row) => statuses.includes(row.status)).length;
      const amounts = accountingTotals(cl, pr);
      return {
        ...company,
        closings: cl.length,
        closingsPending: countStatus(cl, ['DRAFT', 'IN_REVIEW']),
        gross: amounts.gross, net: amounts.net, inss: amounts.inss, irrf: amounts.irrf, fgts: amounts.fgts,
        estimatedClosings: amounts.estimatedClosings,
        payrolls: pr.length,
        payrollsPending: countStatus(pr, ['DRAFT', 'PROCESSING']),
      };
    });
    return {
      scope: 'GLOBAL', period: { year: period.year, month: period.month, key: period.key }, ruleVersions,
      totals: {
        companies: rows.length,
        withClosings: rows.filter((row) => row.closings > 0 || row.payrolls > 0).length,
        payrolls: rows.reduce((total, row) => total + row.payrolls, 0),
        estimatedClosings: rows.reduce((total, row) => total + row.estimatedClosings, 0),
        closings: rows.reduce((total, row) => total + row.closings, 0),
        closingsPending: rows.reduce((total, row) => total + row.closingsPending, 0),
        payrollsPending: rows.reduce((total, row) => total + row.payrollsPending, 0),
        gross: round(rows.reduce((total, row) => total + row.gross, 0)), net: round(rows.reduce((total, row) => total + row.net, 0)),
        inss: round(rows.reduce((total, row) => total + row.inss, 0)), irrf: round(rows.reduce((total, row) => total + row.irrf, 0)), fgts: round(rows.reduce((total, row) => total + row.fgts, 0)),
      },
      companies: rows,
    };
  }

  /**
   * Recalcula INSS/IRRF/FGTS/líquido de uma folha com as regras vigentes na competência.
   * Parte dos lançamentos da folha (salário, extras, DSR, bônus, faltas, adiantamentos), para nunca perder o que o RH lançou.
   */
  async recalcPayrollRow(tx: any, payroll: any) {
    const reference = new Date(payroll.periodEnd ?? Date.UTC(payroll.referenceYear, payroll.referenceMonth - 1, 1));
    const ctx = await this.payroll.resolveTaxContext(reference);
    const dependents = countDependents(payroll.employee?.dependents);

    // Valores corrigidos nas colunas viram lançamentos (salário, horas extras, noturno).
    const ensureItem = async (type: 'BASE_SALARY' | 'OVERTIME' | 'NIGHT_SHIFT', description: string, amount: number) => {
      // Só a linha ligada à coluna (automática ou editada na coluna); lançamentos manuais extras de mesmo tipo não são tocados.
      const existing = await tx.payrollItem.findFirst({ where: { payrollId: payroll.id, type, OR: [{ isColumnLine: true }, { isManual: false }] }, orderBy: { isColumnLine: 'desc' } });
      if (existing) {
        if (amount > 0) await tx.payrollItem.update({ where: { id: existing.id }, data: { amount } });
        else await tx.payrollItem.delete({ where: { id: existing.id } });
      } else if (amount > 0) {
        await tx.payrollItem.create({ data: { payrollId: payroll.id, companyId: payroll.companyId, type, description, amount, isDeduction: false, isColumnLine: true } });
      }
    };
    await ensureItem('BASE_SALARY', 'Salário base', num(payroll.baseSalary));
    await ensureItem('OVERTIME', 'Horas extras', num(payroll.overtimeAmount));
    await ensureItem('NIGHT_SHIFT', 'Adicional noturno', num(payroll.nightShiftAmount));

    // O DSR das verbas variáveis acompanha qualquer correção monetária de extras ou noturno.
    if (payroll.periodStart && payroll.periodEnd && payroll.employee) {
      const rule = payroll.employee.workScheduleRule as { restDaysOfWeek?: number[] } | null;
      const scale = String(payroll.employee.workScale ?? '5X2').toUpperCase();
      const restDays = Array.isArray(rule?.restDaysOfWeek) && rule.restDaysOfWeek.length ? rule.restDaysOfWeek : scale === '6X1' ? [0] : [0, 6];
      const dsrDay = restDays.includes(0) ? 0 : restDays[0];
      let workdays = 0; let dsrDays = 0;
      for (let day = payroll.periodStart.getTime(); day <= payroll.periodEnd.getTime(); day += 86_400_000) {
        const weekday = new Date(day).getUTCDay();
        if (!restDays.includes(weekday)) workdays++;
        if (weekday === dsrDay) dsrDays++;
      }
      const variable = num(payroll.overtimeAmount) + num(payroll.nightShiftAmount);
      const dsr = workdays > 0 ? round((variable / workdays) * dsrDays) : 0;
      const existing = await tx.payrollItem.findFirst({ where: { payrollId: payroll.id, type: 'OTHER_EARNING', description: { startsWith: 'DSR' } } });
      if (existing && dsr > 0) await tx.payrollItem.update({ where: { id: existing.id }, data: { amount: dsr } });
      else if (existing) await tx.payrollItem.delete({ where: { id: existing.id } });
      else if (dsr > 0) await tx.payrollItem.create({ data: { payrollId: payroll.id, companyId: payroll.companyId, type: 'OTHER_EARNING', description: 'DSR sobre horas variáveis', amount: dsr, isDeduction: false } });
    }

    const items: Array<{ type: string; amount: unknown; isDeduction: boolean }> = await tx.payrollItem.findMany({ where: { payrollId: payroll.id } });
    if (items.some((item) => !Number.isFinite(Number(item.amount)) || Number(item.amount) < 0)) {
      throw new BadRequestException('Há lançamentos inválidos nesta folha. Corrija os valores antes de recalcular.');
    }
    const sum = (pick: (i: (typeof items)[number]) => boolean) => round(items.filter(pick).reduce((total, i) => total + num(i.amount), 0));
    const earnings = sum((i) => !i.isDeduction && i.type !== 'FGTS');
    const preTaxDeductions = sum((i) => i.type === 'ABSENCE_DEDUCTION');
    const postTaxDeductions = sum((i) => i.isDeduction && i.type !== 'ABSENCE_DEDUCTION' && i.type !== 'INSS' && i.type !== 'IRRF');
    const gross = round(Math.max(0, earnings - preTaxDeductions));
    const taxes = this.payroll.applyTaxes(gross, dependents, ctx);
    const net = round(Math.max(0, taxes.netPay - postTaxDeductions));
    const result = { ...taxes, netPay: net };

    const updated = await tx.payroll.update({
      where: { id: payroll.id },
      data: {
        grossSalary: result.grossPay, inssAmount: result.inssDiscount, irrfAmount: result.irrfDiscount, fgtsAmount: result.fgtsAmount, netSalary: result.netPay,
        calculationVersion: [PayrollCalculationService.VERSION, ctx.inss.version, ctx.irrf.version, ctx.fgts ? `FGTS:${ctx.fgts.version}` : null, ctx.params ? `PARAMS:${ctx.params.version}` : null].filter(Boolean).join('|'),
        taxTableSnapshot: JSON.parse(JSON.stringify(ctx)),
      },
    });
    for (const [type, amount, isDeduction, description] of [
      ['INSS', result.inssDiscount, true, 'Contribuição INSS'],
      ['IRRF', result.irrfDiscount, true, 'Imposto de Renda Retido na Fonte'],
      ['FGTS', result.fgtsAmount, false, 'FGTS (encargo patronal)'],
    ] as const) {
      const existing = await tx.payrollItem.findFirst({ where: { payrollId: payroll.id, type } });
      if (existing) await tx.payrollItem.update({ where: { id: existing.id }, data: { amount, isDeduction } });
      else await tx.payrollItem.create({ data: { payrollId: payroll.id, companyId: payroll.companyId, type, description, amount, isDeduction } });
    }
    return { updated, result, builtin: ctx.builtin ?? [] };
  }
  async loadEditablePayroll(actor: JwtUser, id: string) {
    const payroll = await this.prisma.payroll.findFirst({ where: { id, deletedAt: null }, include: { employee: { select: { name: true, dependents: true, workScale: true, workScheduleRule: true } } } });
    if (!payroll) throw new NotFoundException('Folha não encontrada.');
    await this.access.assertAccountantCanAccess(actor, payroll.companyId, 'Folha não encontrada.');
    if (!['DRAFT', 'PROCESSING'].includes(payroll.status)) throw new BadRequestException('Somente folhas em rascunho ou processamento podem ser recalculadas ou corrigidas.');
    return payroll;
  }

  async recalculatePayroll(actor: JwtUser, id: string) {
    const payroll = await this.loadEditablePayroll(actor, id);
    const out = await this.prisma.$transaction(async (tx) => {
      const recalculated = await this.recalcPayrollRow(tx, payroll);
      await tx.auditLog.create({ data: { companyId: payroll.companyId, userId: actor.sub, action: 'ACCOUNTING_PAYROLL_RECALCULATED', entity: 'Payroll', entityId: id, metadata: { net: recalculated.result.netPay } } });
      return recalculated;
    });
    return { id, ...out.result, builtinRules: out.builtin };
  }

  /** Correção só de proventos; os impostos são sempre recalculados pelas regras (nunca digitados à mão). */
  async correctPayroll(actor: JwtUser, id: string, dto: CorrectPayrollDto) {
    const reason = dto.reason.trim();
    if (!reason) throw new BadRequestException('Informe o motivo da correção.');
    const changes = Object.fromEntries(Object.entries({ baseSalary: dto.baseSalary, overtimeAmount: dto.overtimeAmount, nightShiftAmount: dto.nightShiftAmount }).filter(([, value]) => value !== undefined));
    if (!Object.keys(changes).length) throw new BadRequestException('Informe ao menos um valor para corrigir.');
    const payroll = await this.loadEditablePayroll(actor, id);
    return this.prisma.$transaction(async (tx) => {
      const next = await tx.payroll.update({
        where: { id },
        data: { ...changes, observations: `${payroll.observations ? `${payroll.observations}\n` : ''}[${new Date().toISOString()}] ${reason}` },
        include: { employee: { select: { name: true, dependents: true, workScale: true, workScheduleRule: true } } },
      });
      const recalculated = await this.recalcPayrollRow(tx, next);
      await tx.auditLog.create({ data: { companyId: payroll.companyId, userId: actor.sub, action: 'ACCOUNTING_PAYROLL_CORRECTED', entity: 'Payroll', entityId: id, metadata: { reason, changes } } });
      return { id, ...recalculated.result };
    });
  }

  async adjustClosing(actor: JwtUser, id: string, dto: AdjustClosingDto) {
    const closing = await this.prisma.timeClosing.findUnique({ where: { id }, select: { companyId: true } });
    if (!closing) throw new NotFoundException('Fechamento não encontrado.');
    await this.access.assertAccountantCanAccess(actor, closing.companyId, 'Fechamento não encontrado.');
    return this.closing.adjust(closing.companyId, actor, id, { field: dto.field, newValue: String(dto.newValue), reason: dto.reason });
  }

  /** Recalcula os fechamentos em rascunho da empresa com as regras atuais. */
  async recalculateClosings(actor: JwtUser, companyId: string, month: string) {
    await this.access.assertAccountantCanAccess(actor, companyId);
    await this.assertCompany(companyId);
    const period = resolveMonth(month);
    const last = `${period.key}-${String(period.last.getUTCDate()).padStart(2, '0')}`;
    // Refaz os totais do ponto antes de fechar: folha e ponto saem sempre da mesma conta.
    await this.timeTrack.recalculateRange(companyId, period.start, period.last);
    const generated = await this.closing.generate(companyId, { ...actor, companyId, role: 'ADMIN' }, { periodStart: `${period.key}-01`, periodEnd: last, month: period.month, year: period.year } as any);
    return { generated: Array.isArray(generated) ? generated.length : 0 };
  }

  /** Fluxo da contabilidade nos fechamentos: revisar, aprovar ou devolver ao RH (com motivo). */
  async closingWorkflow(actor: JwtUser, id: string, action: 'REVIEW' | 'APPROVE' | 'RETURN', reason?: string) {
    const closing = await this.prisma.timeClosing.findUnique({ where: { id }, select: { companyId: true, status: true } });
    if (!closing) throw new NotFoundException('Fechamento não encontrado.');
    await this.access.assertAccountantCanAccess(actor, closing.companyId, 'Fechamento não encontrado.');
    let result: unknown;
    if (action === 'REVIEW') result = await this.closing.submitReview(closing.companyId, id);
    else if (action === 'APPROVE') {
      if (closing.status === 'DRAFT') await this.closing.submitReview(closing.companyId, id);
      result = await this.closing.approve(closing.companyId, id);
    } else {
      if (!reason?.trim()) throw new BadRequestException('Informe o motivo da devolução ao RH.');
      if (!['IN_REVIEW', 'APPROVED'].includes(closing.status)) throw new BadRequestException('Só fechamento em revisão ou aprovado pode ser devolvido.');
      result = await this.prisma.timeClosing.update({ where: { id }, data: { status: 'DRAFT', reopenedAt: new Date(), reopenedBy: actor.sub, reopenReason: reason.trim() } });
    }
    await this.prisma.auditLog.create({ data: { companyId: closing.companyId, userId: actor.sub, action: `ACCOUNTING_CLOSING_${action}`, entity: 'TimeClosing', entityId: id, metadata: { previous: closing.status, reason: reason?.trim() ?? null, actorEmail: actor.email } } });
    return result;
  }

  /** Fluxo da contabilidade nas folhas: aprovar ou devolver ao RH (com motivo). */
  async payrollWorkflow(actor: JwtUser, id: string, action: 'APPROVE' | 'RETURN', reason?: string) {
    const payroll = await this.prisma.payroll.findFirst({ where: { id, deletedAt: null }, select: { companyId: true, status: true, grossSalary: true, netSalary: true, inssAmount: true, irrfAmount: true, fgtsAmount: true, items: { select: { type: true, amount: true, isDeduction: true } } } });
    if (!payroll) throw new NotFoundException('Folha não encontrada.');
    await this.access.assertAccountantCanAccess(actor, payroll.companyId, 'Folha não encontrada.');
    if (action === 'APPROVE') {
      if (payroll.status !== 'DRAFT') throw new BadRequestException('Só folha em rascunho pode ser aprovada.');
      if (!Number.isFinite(Number(payroll.grossSalary)) || !Number.isFinite(Number(payroll.netSalary))) throw new BadRequestException('A folha tem valores inválidos. Recalcule antes de aprovar.');
      if (!reconcilePayroll(payroll)) throw new BadRequestException('Os totais da folha não conferem com os lançamentos. Recalcule e confira antes de aprovar.');
      await this.prisma.payroll.update({ where: { id }, data: { status: 'APPROVED', approvedBy: actor.sub, approvedAt: new Date() } });
    } else {
      if (!reason?.trim()) throw new BadRequestException('Informe o motivo da devolução ao RH.');
      if (payroll.status !== 'APPROVED') throw new BadRequestException('Só folha aprovada (e não paga) pode ser devolvida.');
      await this.prisma.payroll.update({ where: { id }, data: { status: 'DRAFT', approvedBy: null, approvedAt: null, observations: `[Devolvida pela contabilidade] ${reason.trim()}` } });
    }
    await this.prisma.auditLog.create({ data: { companyId: payroll.companyId, userId: actor.sub, action: `ACCOUNTING_PAYROLL_${action}`, entity: 'Payroll', entityId: id, metadata: { previous: payroll.status, reason: reason?.trim() ?? null, actorEmail: actor.email } } });
    return { id, status: action === 'APPROVE' ? 'APPROVED' : 'DRAFT' };
  }

  /** Relatório contábil em PDF (todas as empresas ou uma empresa) com a versão das regras usadas. */
  async reportPdf(actor: JwtUser, month: string | undefined, companyId: string | undefined, res: any) {
    const data = await this.overviewFor(actor, month, companyId);
    const company = data.scope === 'COMPANY' ? (data as any).company : null;
    const logoUrl = company ? (await this.prisma.company.findUnique({ where: { id: company.id }, select: { logoUrl: true } }))?.logoUrl : null;
    // Relatório de uma empresa leva a logo dela; o consolidado de todas as empresas é da plataforma.
    const report = await PdfReport.create({
      title: 'Relatório contábil', subtitle: `Competência ${data.period.key}${company ? '' : ' · todas as empresas'}`,
      brand: company ? { name: company.name, document: company.document, logoUrl } : { platform: true, name: 'Innovation RH' },
      footerNote: `Solicitado por ${actor.name ?? actor.email}`, footerId: 'Relatório contábil',
    });

    const t = data.totals as any;
    report.section('Totais da competência');
    report.stats([['Bruto', fmt.money(t.gross)], ['INSS', fmt.money(t.inss)], ['IRRF', fmt.money(t.irrf)], ['FGTS', fmt.money(t.fgts)], ['Líquido', fmt.money(t.net)]]);
    report.paragraph(`${t.payrolls} folha(s) e ${t.estimatedClosings} fechamento(s) sem folha. A folha substitui o fechamento do mesmo funcionário e ciclo nos totais. INSS e IRRF são retenções; FGTS é encargo da empresa.`, { size: 8, color: PDF.color.mut });

    const right = 'right' as const;
    if (data.scope === 'COMPANY') {
      const { activePayrolls: payrollRows, estimates: estimateRows } = accountingEntries((data as any).closings, (data as any).payrolls);
      report.section('Folhas e previsões do ponto', 'por colaborador');
      report.table(
        [{ label: 'Colaborador', width: 140 }, { label: 'Origem', width: 85 }, { label: 'Bruto', width: 70, align: right }, { label: 'INSS', width: 55, align: right }, { label: 'IRRF', width: 55, align: right }, { label: 'FGTS', width: 55, align: right }, { label: 'Líquido', width: 55, align: right }],
        [
          ...payrollRows.map((row) => [row.employee?.name ?? '-', `Folha ${row.status}`, fmt.money(row.grossSalary), fmt.money(row.inssAmount), fmt.money(row.irrfAmount), fmt.money(row.fgtsAmount), { text: fmt.money(row.netSalary), bold: true }]),
          ...estimateRows.map((row) => [row.employee?.name ?? '-', `Ponto ${row.status}`, fmt.money(row.grossPay), fmt.money(row.inssDiscount), fmt.money(row.irrfDiscount), fmt.money(row.fgtsAmount), { text: fmt.money(row.netPay), bold: true }]),
        ],
        { fontSize: 8, emptyText: 'Nenhuma folha ou fechamento na competência.' },
      );
    } else {
      report.section('Empresas', 'com folha ou fechamento na competência');
      report.table(
        [{ label: 'Empresa', width: 165 }, { label: 'Fech.', width: 40, align: right }, { label: 'Pend.', width: 40, align: right }, { label: 'Bruto', width: 70, align: right }, { label: 'INSS', width: 65, align: right }, { label: 'IRRF', width: 65, align: right }, { label: 'Líquido', width: 70, align: right }],
        (data as any).companies.filter((row: any) => row.closings > 0 || row.payrolls > 0).map((row: any) => [row.name, String(row.closings), String(row.closingsPending + row.payrollsPending), fmt.money(row.gross), fmt.money(row.inss), fmt.money(row.irrf), { text: fmt.money(row.net), bold: true }]),
        { fontSize: 8, emptyText: 'Nenhuma folha ou fechamento na competência.' },
      );
    }

    const versions = Object.entries(data.ruleVersions).map(([type, version]) => `${type}: ${version ?? 'padrão embutido'}`).join('  ·  ');
    report.paragraph(`Regras vigentes — ${versions}. Valores calculados pelo motor de folha com as regras cadastradas na Contabilidade.`, { size: 8, color: PDF.color.mut });
    sendPdf(res, await report.finish(), `relatorio-contabil-${safeFileName(data.scope === 'COMPANY' ? (data as any).company.name : 'plataforma')}-${data.period.key}.pdf`);
  }
}
