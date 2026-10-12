/**
 * Descontos da empresa no fechamento/folha (vale-transporte, plano de saúde, coparticipação...).
 * Cada regra vale para todos, por cargo, por setor ou para pessoas escolhidas, e pode ter vigência e teto.
 * Funções puras: o fechamento e a folha usam o mesmo cálculo.
 */
export const DEDUCTION_KINDS = ['PERCENT', 'FIXED'] as const;
export const DEDUCTION_BASES = ['GROSS', 'SALARY'] as const;
export const DEDUCTION_SCOPES = ['ALL', 'POSITION', 'DEPARTMENT', 'EMPLOYEE'] as const;
export const DEDUCTION_CATEGORIES = ['BENEFIT', 'OTHER'] as const;
export const DEDUCTION_PREFIX = 'Desconto da empresa: ';

export interface DeductionRuleLike {
  id: string; name: string; category: string; kind: string; value: unknown; base: string; maxAmount?: unknown | null;
  scope: string; targets: string[]; startDate?: Date | null; endDate?: Date | null; isActive: boolean;
}
export interface DeductionItem { ruleId: string; name: string; category: string; kind: string; amount: number; detail: string }

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
const norm = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

export function ruleApplies(rule: DeductionRuleLike, employee: { id: string; position?: string | null; department?: string | null }, periodStart: Date, periodEnd: Date): boolean {
  if (!rule.isActive) return false;
  if (rule.startDate && rule.startDate > periodEnd) return false;
  if (rule.endDate && rule.endDate < periodStart) return false;
  if (rule.scope === 'ALL') return true;
  const targets = (rule.targets ?? []).map(norm);
  if (rule.scope === 'POSITION') return targets.includes(norm(employee.position));
  if (rule.scope === 'DEPARTMENT') return targets.includes(norm(employee.department));
  if (rule.scope === 'EMPLOYEE') return (rule.targets ?? []).includes(employee.id);
  return false;
}

/** Calcula os descontos aplicáveis. O total nunca passa do líquido disponível (o líquido não fica negativo). */
export function computeDeductions(
  rules: DeductionRuleLike[],
  employee: { id: string; position?: string | null; department?: string | null },
  amounts: { gross: number; salaryBase: number; netBefore: number; periodStart: Date; periodEnd: Date },
): { items: DeductionItem[]; total: number } {
  const items: DeductionItem[] = [];
  let available = Math.max(0, amounts.netBefore);
  for (const rule of rules) {
    if (!ruleApplies(rule, employee, amounts.periodStart, amounts.periodEnd)) continue;
    const value = num(rule.value);
    if (value <= 0) continue;
    const base = rule.base === 'SALARY' ? amounts.salaryBase : amounts.gross;
    let amount = rule.kind === 'PERCENT' ? (base * value) / 100 : value;
    const cap = rule.maxAmount === null || rule.maxAmount === undefined ? null : num(rule.maxAmount);
    if (cap !== null && cap > 0) amount = Math.min(amount, cap);
    amount = round2(Math.min(amount, available));
    if (amount <= 0) continue;
    available = round2(available - amount);
    items.push({
      ruleId: rule.id, name: rule.name, category: rule.category, kind: rule.kind, amount,
      detail: rule.kind === 'PERCENT' ? `${value}% sobre ${rule.base === 'SALARY' ? 'o salário base' : 'o bruto'}${cap ? ` (teto ${cap.toFixed(2).replace('.', ',')})` : ''}` : 'valor fixo',
    });
  }
  return { items, total: round2(items.reduce((s, i) => s + i.amount, 0)) };
}

/** Validação de uma regra recebida da tela (devolve a mensagem do 1º problema ou null). */
export function validateRule(input: { name?: string; kind?: string; value?: unknown; base?: string; scope?: string; targets?: string[]; category?: string; maxAmount?: unknown; startDate?: string | null; endDate?: string | null }): string | null {
  if (!String(input.name ?? '').trim() || String(input.name).trim().length < 2) return 'Informe o nome do desconto (ex.: Vale-transporte).';
  if (!DEDUCTION_KINDS.includes(input.kind as any)) return 'Escolha se o desconto é percentual (%) ou valor fixo (R$).';
  const value = Number(input.value);
  if (!Number.isFinite(value) || value <= 0) return 'Informe um valor maior que zero.';
  if (input.kind === 'PERCENT' && value > 100) return 'O percentual não pode passar de 100%.';
  if (input.kind === 'FIXED' && value > 1_000_000) return 'Valor fixo alto demais.';
  if (input.base && !DEDUCTION_BASES.includes(input.base as any)) return 'Base de cálculo inválida (use bruto ou salário base).';
  if (!DEDUCTION_SCOPES.includes((input.scope ?? 'ALL') as any)) return 'Escolha a quem o desconto se aplica.';
  if (input.category && !DEDUCTION_CATEGORIES.includes(input.category as any)) return 'Categoria inválida.';
  if ((input.scope ?? 'ALL') !== 'ALL' && !(input.targets ?? []).filter((t) => String(t).trim()).length) return 'Escolha ao menos um cargo, setor ou pessoa para este desconto.';
  if (input.maxAmount !== undefined && input.maxAmount !== null && input.maxAmount !== '' && !(Number(input.maxAmount) > 0)) return 'O teto precisa ser maior que zero (ou deixe em branco).';
  if (input.startDate && input.endDate && input.endDate < input.startDate) return 'O fim da vigência não pode ser antes do início.';
  return null;
}
