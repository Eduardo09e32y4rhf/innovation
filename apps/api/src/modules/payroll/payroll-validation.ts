import { checkPayrollLimits, POST_TAX_DEDUCTION_TYPES } from './clt-discounts';

const TOLERANCE = 0.02;
const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
const num = (v: unknown) => Number(v);
const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
const hours = (min: number) => `${Math.floor(min / 60)}h${String(Math.round(min % 60)).padStart(2, '0')}`;

export type IssueCode = 'INVALID_VALUES' | 'NET_MISMATCH' | 'GROSS_MISMATCH' | 'INSS_MISMATCH' | 'IRRF_MISMATCH' | 'FGTS_MISMATCH' | 'NO_TAX_SNAPSHOT'
  | 'OVERTIME_WITHOUT_TIME_TRACK' | 'OVERTIME_NOT_PAID' | 'MANUAL_WITHOUT_REASON' | 'LOAN_MARGIN_EXCEEDED' | 'TRANSPORT_LIMIT_EXCEEDED';
export interface PayrollIssue { code: IssueCode; severity: 'ERROR' | 'WARNING'; employeeId: string; name: string; payrollId: string; message: string }

export interface ValidationItem { type: string; amount: unknown; description?: string; isManual?: boolean; manualReason?: string | null }
export interface ValidationInput {
  payrollId: string; employeeId: string; name: string;
  baseSalary: unknown; grossSalary: unknown; netSalary: unknown; inssAmount: unknown; irrfAmount: unknown; fgtsAmount: unknown;
  items: ValidationItem[];
  /** INSS/IRRF/FGTS recalculados pelo motor com a tabela do snapshot da folha; null = folha sem snapshot. */
  expectedTaxes: { inssDiscount: number; irrfDiscount: number; fgtsAmount: number } | null;
  /** Minutos de hora extra autorizada e paga (fora do banco de horas) no ponto do mês. */
  paidOvertimeMinutes: number;
}

/** Confere uma folha e devolve as inconsistências. Funções puras: o motor de cálculo roda fora, a validação só compara. */
export function validatePayroll(input: ValidationInput): PayrollIssue[] {
  const base = { employeeId: input.employeeId, name: input.name, payrollId: input.payrollId };
  const issues: PayrollIssue[] = [];
  const add = (code: IssueCode, severity: PayrollIssue['severity'], message: string) => issues.push({ code, severity, message, ...base });

  const values = [input.baseSalary, input.grossSalary, input.netSalary, input.inssAmount, input.irrfAmount, input.fgtsAmount].map(num);
  if (values.some((v) => !Number.isFinite(v))) { add('INVALID_VALUES', 'ERROR', 'A folha tem valores inválidos. Recalcule a folha.'); return issues; }
  const [baseSalary, gross, net, inss, irrf, fgts] = values;

  const sum = (pick: (i: ValidationItem) => boolean) => r2(input.items.filter(pick).reduce((s, i) => s + (Number(i.amount) || 0), 0));
  const earnings = sum((i) => !['INSS', 'IRRF', 'FGTS', 'ABSENCE_DEDUCTION'].includes(i.type) && !(POST_TAX_DEDUCTION_TYPES as readonly string[]).includes(i.type));
  const absences = sum((i) => i.type === 'ABSENCE_DEDUCTION');
  const postTax = sum((i) => (POST_TAX_DEDUCTION_TYPES as readonly string[]).includes(i.type));

  const expectedGross = r2(Math.max(0, earnings - absences));
  if (Math.abs(expectedGross - gross) > TOLERANCE) add('GROSS_MISMATCH', 'ERROR', `Bruto da folha (${brl(gross)}) não bate com os proventos menos faltas (${brl(expectedGross)}).`);
  const expectedNet = r2(Math.max(0, gross - inss - irrf - postTax));
  if (Math.abs(expectedNet - net) > TOLERANCE) add('NET_MISMATCH', 'ERROR', `Líquido (${brl(net)}) diferente de bruto - descontos (${brl(expectedNet)}).`);

  if (!input.expectedTaxes) add('NO_TAX_SNAPSHOT', 'WARNING', 'Folha sem tabela de impostos gravada: INSS, IRRF e FGTS não puderam ser conferidos. Recalcule a folha.');
  else {
    const t = input.expectedTaxes;
    if (Math.abs(t.inssDiscount - inss) > TOLERANCE) add('INSS_MISMATCH', 'ERROR', `INSS da folha (${brl(inss)}) diverge da tabela vigente (${brl(t.inssDiscount)}).`);
    if (Math.abs(t.irrfDiscount - irrf) > TOLERANCE) add('IRRF_MISMATCH', 'ERROR', `IRRF da folha (${brl(irrf)}) diverge da tabela vigente (${brl(t.irrfDiscount)}).`);
    if (Math.abs(t.fgtsAmount - fgts) > TOLERANCE) add('FGTS_MISMATCH', 'ERROR', `FGTS da folha (${brl(fgts)}) diverge da alíquota vigente (${brl(t.fgtsAmount)}).`);
  }

  const autoOvertime = sum((i) => i.type === 'OVERTIME' && !i.isManual);
  const anyOvertime = sum((i) => i.type === 'OVERTIME');
  if (autoOvertime > 0 && input.paidOvertimeMinutes === 0) add('OVERTIME_WITHOUT_TIME_TRACK', 'ERROR', `Horas extras de ${brl(autoOvertime)} na folha, mas o ponto do mês não tem hora extra autorizada e paga.`);
  else if (anyOvertime > 0 && input.paidOvertimeMinutes === 0) add('OVERTIME_WITHOUT_TIME_TRACK', 'WARNING', `Horas extras lançadas à mão (${brl(anyOvertime)}) sem hora extra autorizada no ponto do mês.`);
  if (anyOvertime === 0 && input.paidOvertimeMinutes > 0) add('OVERTIME_NOT_PAID', 'WARNING', `O ponto tem ${hours(input.paidOvertimeMinutes)} de hora extra paga, mas a folha não tem provento de horas extras.`);

  for (const item of input.items.filter((i) => i.isManual && !String(i.manualReason ?? '').trim())) {
    add('MANUAL_WITHOUT_REASON', 'ERROR', `Lançamento manual "${item.description ?? item.type}" (${brl(Number(item.amount) || 0)}) sem motivo registrado.`);
  }

  const limits = checkPayrollLimits(input.items, { baseSalary, grossSalary: gross, inssAmount: inss, irrfAmount: irrf });
  if (limits.loan.exceeded) add('LOAN_MARGIN_EXCEEDED', 'WARNING', limits.loan.message!);
  if (limits.transport.exceeded) add('TRANSPORT_LIMIT_EXCEEDED', 'WARNING', limits.transport.message!);
  return issues;
}
