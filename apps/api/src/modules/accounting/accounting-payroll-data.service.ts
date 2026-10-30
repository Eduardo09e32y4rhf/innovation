import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountingAccessService } from '../../common/accounting-access';
import { countDependents } from '../../common/utils/dependents';
import type { JwtUser } from '../../common/types/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { parseCompetence } from '../payroll/accounting-period.service';
import { checkPayrollLimits, ITEM_TYPE_LABEL } from '../payroll/clt-discounts';
import { buildFiscalSummary } from '../payroll/payroll-fiscal-summary';
import { validatePayroll, type PayrollIssue } from '../payroll/payroll-validation';
import { overtimePaymentRatio } from '../time-track/overtime-policy';
import { PayrollCalculationService } from '../time-track/payroll-calculation.service';

const num = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? n : null; };

/** Leitura da folha do mês da empresa para a contabilidade: ficha por funcionário, validação e resumo fiscal. */
@Injectable()
export class AccountingPayrollDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccountingAccessService,
    private readonly calculator: PayrollCalculationService,
  ) {}

  /** Folhas (não canceladas) da competência, com itens e funcionário. Confere o acesso do usuário à empresa. */
  async loadMonth(actor: JwtUser, companyId: string, month: string) {
    await this.access.assertAccountantCanAccess(actor, companyId);
    const c = parseCompetence(month);
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true, document: true, logoUrl: true } });
    if (!company) throw new NotFoundException('Empresa não encontrada.');
    const payrolls = await this.prisma.payroll.findMany({
      where: { companyId, referenceYear: c.year, referenceMonth: c.month, deletedAt: null, status: { not: 'CANCELLED' } },
      include: { employee: { select: { id: true, name: true, position: true, dependents: true } }, items: { orderBy: [{ isDeduction: 'asc' }, { createdAt: 'asc' }] } },
      orderBy: { employee: { name: 'asc' } },
      take: 2000,
    });
    return { company, c, payrolls };
  }

  /** Folha de cada funcionário do mês, linha a linha, com quem alterou, quando e o motivo das linhas manuais. */
  async sheet(actor: JwtUser, companyId: string, month: string) {
    const { c, payrolls } = await this.loadMonth(actor, companyId, month);
    const editors = [...new Set(payrolls.flatMap((p) => p.items.map((i) => i.editedById)).filter((id): id is string => !!id))];
    const users = editors.length ? await this.prisma.user.findMany({ where: { id: { in: editors } }, select: { id: true, name: true } }) : [];
    const nameOf = new Map(users.map((u) => [u.id, u.name]));
    return {
      month: c.key,
      summary: buildFiscalSummary(payrolls),
      employees: payrolls.map((p) => {
        const items = p.items.map((i) => ({
          id: i.id, type: i.type, typeLabel: ITEM_TYPE_LABEL[i.type] ?? i.type, description: i.description, amount: num(i.amount), isDeduction: i.isDeduction,
          isManual: i.isManual, manualReason: i.manualReason, editedAt: i.editedAt, editedByName: i.editedById ? nameOf.get(i.editedById) ?? null : null,
          editable: !['INSS', 'IRRF', 'FGTS'].includes(i.type),
          removable: !['INSS', 'IRRF', 'FGTS', 'BASE_SALARY'].includes(i.type),
        }));
        const limits = checkPayrollLimits(p.items, { baseSalary: Number(p.baseSalary), grossSalary: Number(p.grossSalary), inssAmount: Number(p.inssAmount), irrfAmount: Number(p.irrfAmount) });
        return {
          payrollId: p.id, employeeId: p.employeeId, name: p.employee.name, position: p.employee.position ?? null, status: p.status,
          editable: ['DRAFT', 'PROCESSING'].includes(p.status),
          baseSalary: num(p.baseSalary), gross: num(p.grossSalary), net: num(p.netSalary), inss: num(p.inssAmount), irrf: num(p.irrfAmount), fgts: num(p.fgtsAmount),
          items, limits: { loan: limits.loan, transport: limits.transport },
        };
      }),
    };
  }

  /** Minutos de hora extra autorizada e paga (fora do banco de horas) por funcionário no mês — mesma regra do cálculo da folha. */
  private async paidOvertimeByEmployee(companyId: string, start: Date, end: Date) {
    const tracks = await this.prisma.timeTrack.findMany({
      where: { companyId, date: { gte: start, lte: end } },
      select: { employeeId: true, overtime50Minutes: true, overtime100Minutes: true, overtimeApprovalStatus: true, overtimeHandling: true, overtimePaymentMinutes: true },
      take: 100_000,
    });
    const by = new Map<string, number>();
    for (const t of tracks as any[]) {
      const minutes = Math.max(0, Number(t.overtime50Minutes) || 0) + Math.max(0, Number(t.overtime100Minutes) || 0);
      by.set(t.employeeId, (by.get(t.employeeId) ?? 0) + Math.round(minutes * overtimePaymentRatio(t)));
    }
    return by;
  }

  /** Confere a folha do mês: líquido, bruto, impostos pela tabela do snapshot, horas extras x ponto, itens manuais e limites. */
  async validate(actor: JwtUser, companyId: string, month: string) {
    const { c, payrolls } = await this.loadMonth(actor, companyId, month);
    const overtime = await this.paidOvertimeByEmployee(companyId, c.start, c.end);
    const issues: PayrollIssue[] = [];
    for (const p of payrolls) {
      const snapshot = p.taxTableSnapshot as any;
      const expectedTaxes = snapshot?.inss && snapshot?.irrf
        ? this.calculator.applyTaxes(Number(p.grossSalary), countDependents(p.employee.dependents as unknown), snapshot)
        : null;
      issues.push(...validatePayroll({
        payrollId: p.id, employeeId: p.employeeId, name: p.employee.name,
        baseSalary: p.baseSalary, grossSalary: p.grossSalary, netSalary: p.netSalary, inssAmount: p.inssAmount, irrfAmount: p.irrfAmount, fgtsAmount: p.fgtsAmount,
        items: p.items, expectedTaxes: expectedTaxes ? { inssDiscount: expectedTaxes.inssDiscount, irrfDiscount: expectedTaxes.irrfDiscount, fgtsAmount: expectedTaxes.fgtsAmount } : null,
        paidOvertimeMinutes: overtime.get(p.employeeId) ?? 0,
      }));
    }
    const errors = issues.filter((i) => i.severity === 'ERROR').length;
    return { month: c.key, employees: payrolls.length, valid: payrolls.length > 0 && errors === 0, errors, warnings: issues.length - errors, issues, checkedAt: new Date().toISOString() };
  }

  async fiscalSummary(actor: JwtUser, companyId: string, month: string) {
    const { c, payrolls } = await this.loadMonth(actor, companyId, month);
    return { month: c.key, ...buildFiscalSummary(payrolls) };
  }
}
