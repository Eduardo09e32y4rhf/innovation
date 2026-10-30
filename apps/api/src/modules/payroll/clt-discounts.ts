/**
 * Tipos e limites dos descontos CLT lançados na folha (empréstimo, consignado, VT, VA, pensão, plano de saúde).
 * Funções puras: a edição manual da contabilidade e a validação da folha usam as mesmas regras.
 */
export const LOAN_TYPES = ['CLT_LOAN', 'CONSIGNADO'] as const;
/** Teto somado de empréstimo + consignado sobre a remuneração líquida disponível (bruto - INSS - IRRF). */
export const LOAN_MARGIN_RATE = 0.35;
/** Desconto de vale-transporte: no máximo 6% do salário base (Lei 7.418/85). */
export const TRANSPORT_LIMIT_RATE = 0.06;

/** Descontos digitados à mão que saem do líquido depois de INSS e IRRF. */
export const POST_TAX_DEDUCTION_TYPES = [
  'ADVANCE', 'OTHER_DEDUCTION', 'CLT_LOAN', 'CONSIGNADO', 'VALE_TRANSPORTE', 'VALE_ALIMENTACAO', 'PENSAO_ALIMENTICIA', 'PLANO_SAUDE',
] as const;
/** Lançamentos manuais que reduzem o bruto antes dos impostos. */
export const PRE_TAX_DEDUCTION_TYPES = ['ABSENCE_DEDUCTION'] as const;
/** Proventos que a contabilidade pode lançar à mão. */
export const MANUAL_EARNING_TYPES = ['OVERTIME', 'NIGHT_SHIFT', 'BONUS', 'COMMISSION', 'VACATION_ADDITION', 'OTHER_EARNING'] as const;
/** Impostos sempre calculados pelas regras vigentes; nunca digitados. */
export const TAX_TYPES = ['INSS', 'IRRF', 'FGTS'] as const;

export const isDeductionType = (type: string): boolean =>
  (POST_TAX_DEDUCTION_TYPES as readonly string[]).includes(type) || (PRE_TAX_DEDUCTION_TYPES as readonly string[]).includes(type) || type === 'INSS' || type === 'IRRF';

export const ITEM_TYPE_LABEL: Record<string, string> = {
  BASE_SALARY: 'Salário base', OVERTIME: 'Horas extras', NIGHT_SHIFT: 'Adicional noturno', BONUS: 'Bônus', COMMISSION: 'Comissão',
  VACATION_ADDITION: 'Adicional de férias', INSS: 'INSS', IRRF: 'IRRF', FGTS: 'FGTS (encargo)', ADVANCE: 'Adiantamento',
  ABSENCE_DEDUCTION: 'Faltas e atrasos', OTHER_EARNING: 'Outro provento', OTHER_DEDUCTION: 'Outro desconto',
  CLT_LOAN: 'Empréstimo CLT', CONSIGNADO: 'Consignado', VALE_TRANSPORTE: 'Vale-transporte', VALE_ALIMENTACAO: 'Vale-alimentação',
  PENSAO_ALIMENTICIA: 'Pensão alimentícia', PLANO_SAUDE: 'Plano de saúde',
};

const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export interface LimitCheck { exceeded: boolean; limit: number; total: number; message: string | null }

/** Empréstimo CLT + consignado somados não podem passar de 35% da remuneração líquida disponível. */
export function checkLoanMargin(loanTotal: number, gross: number, inss: number, irrf: number): LimitCheck {
  const available = Math.max(0, r2(gross - inss - irrf));
  const limit = r2(available * LOAN_MARGIN_RATE);
  const total = r2(loanTotal);
  const exceeded = total > limit + 0.005;
  return {
    exceeded, limit, total,
    message: exceeded ? `Empréstimo + consignado somam ${brl(total)}, acima de 35% da remuneração líquida disponível (${brl(limit)} de ${brl(available)}).` : null,
  };
}

/** Desconto de vale-transporte limitado a 6% do salário base. */
export function checkTransportLimit(transportTotal: number, baseSalary: number): LimitCheck {
  const limit = r2(Math.max(0, baseSalary) * TRANSPORT_LIMIT_RATE);
  const total = r2(transportTotal);
  const exceeded = total > limit + 0.005;
  return { exceeded, limit, total, message: exceeded ? `Vale-transporte descontado de ${brl(total)} passa de 6% do salário base (${brl(limit)}).` : null };
}

type Line = { type: string; amount: unknown };
const sumOf = (items: Line[], types: readonly string[]) => r2(items.filter((i) => types.includes(i.type)).reduce((s, i) => s + (Number(i.amount) || 0), 0));

/** Aplica os dois limites a uma folha (itens já com o efeito de qualquer lançamento novo). */
export function checkPayrollLimits(items: Line[], payroll: { baseSalary: number; grossSalary: number; inssAmount: number; irrfAmount: number }) {
  return {
    loan: checkLoanMargin(sumOf(items, LOAN_TYPES), payroll.grossSalary, payroll.inssAmount, payroll.irrfAmount),
    transport: checkTransportLimit(sumOf(items, ['VALE_TRANSPORTE']), payroll.baseSalary),
  };
}
