/** Regras de promoção da empresa (puras, testáveis). O RH lança a promoção; o sistema confere a política antes de aplicar. */
export interface PromotionPolicyLike { minMonthsInRole: number; maxRaisePercent: number | null; requireReason: boolean; positions: string[]; autoNotify: boolean }
export interface PromotionInput { newPosition?: string | null; newSalary?: number | null; effectiveDate: string; reason?: string | null }
export interface EmployeeForPromotion { position?: string | null; salary?: number | null; admissionDate?: Date | string | null; lastPromotionAt?: Date | string | null }

export const DEFAULT_POLICY: PromotionPolicyLike = { minMonthsInRole: 0, maxRaisePercent: null, requireReason: true, positions: [], autoNotify: true };
const norm = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const day = (v: Date | string) => new Date(`${(v instanceof Date ? v.toISOString() : String(v)).slice(0, 10)}T00:00:00.000Z`);

export function monthsBetween(from: Date, to: Date) {
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;
  return months;
}

/** Devolve a mensagem do primeiro problema ou null. `today` = AAAA-MM-DD (fuso de São Paulo). */
export function checkPromotion(policy: PromotionPolicyLike, employee: EmployeeForPromotion, input: PromotionInput, today: string): string | null {
  const position = String(input.newPosition ?? '').trim();
  const hasSalary = input.newSalary !== null && input.newSalary !== undefined;
  if (!position && !hasSalary) return 'Informe o novo cargo e/ou o novo salário.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.effectiveDate ?? ''))) return 'Informe a data em que a promoção passa a valer.';
  const effective = day(input.effectiveDate), now = day(today);
  if (Number.isNaN(effective.getTime())) return 'Data de vigência inválida.';
  if ((now.getTime() - effective.getTime()) / 86_400_000 > 31) return 'A vigência não pode ser mais de 31 dias no passado.';
  if ((effective.getTime() - now.getTime()) / 86_400_000 > 366) return 'A vigência não pode ser daqui a mais de 1 ano.';

  const currentSalary = Number(employee.salary ?? 0);
  if (hasSalary) {
    const salary = Number(input.newSalary);
    if (!Number.isFinite(salary) || salary <= 0 || salary > 1_000_000) return 'O novo salário precisa ser um valor maior que zero.';
    if (currentSalary > 0 && salary < currentSalary) return 'O novo salário é menor que o atual. Para reduzir salário, use a edição do cadastro do funcionário.';
    if (currentSalary > 0 && salary === currentSalary && !position) return 'O novo salário é igual ao atual.';
    if (policy.maxRaisePercent !== null && currentSalary > 0) {
      const raise = ((salary - currentSalary) / currentSalary) * 100;
      if (raise > policy.maxRaisePercent + 0.0001) return `A regra da empresa limita o aumento a ${policy.maxRaisePercent}% e este é de ${raise.toFixed(1).replace('.', ',')}%.`;
    }
  }
  if (position) {
    if (norm(position) === norm(employee.position) && !hasSalary) return 'O novo cargo é igual ao atual.';
    if (policy.positions.length && !policy.positions.map(norm).includes(norm(position))) return `O cargo "${position}" não está na escada de cargos definida pela empresa.`;
  }
  if (policy.requireReason && String(input.reason ?? '').trim().length < 5) return 'A regra da empresa exige o motivo da promoção (mínimo 5 letras).';
  if (policy.minMonthsInRole > 0) {
    const since = employee.lastPromotionAt ?? employee.admissionDate;
    if (since) {
      const months = monthsBetween(day(since), effective);
      if (months < policy.minMonthsInRole) return `A regra da empresa exige ${policy.minMonthsInRole} mês(es) no cargo; a pessoa tem ${Math.max(0, months)} na data da vigência.`;
    }
  }
  return null;
}

export function validatePolicy(input: Partial<PromotionPolicyLike>): string | null {
  if (input.minMonthsInRole !== undefined && (!Number.isInteger(Number(input.minMonthsInRole)) || Number(input.minMonthsInRole) < 0 || Number(input.minMonthsInRole) > 240)) return 'Tempo mínimo no cargo: de 0 a 240 meses.';
  if (input.maxRaisePercent !== undefined && input.maxRaisePercent !== null && !(Number(input.maxRaisePercent) > 0 && Number(input.maxRaisePercent) <= 500)) return 'Aumento máximo: entre 0,01% e 500% (ou deixe em branco).';
  if (input.positions !== undefined && (!Array.isArray(input.positions) || input.positions.length > 100)) return 'Lista de cargos inválida.';
  return null;
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function promotionMessage(p: { newPosition?: string | null; newSalary?: number | null; effectiveDate: string; reason?: string | null; previousPosition?: string | null }): string {
  const date = p.effectiveDate.split('-').reverse().join('/');
  const parts = [`Parabéns! A partir de ${date}`];
  if (p.newPosition) parts.push(`você passa a ocupar o cargo de ${p.newPosition}`);
  if (p.newSalary) parts.push(`${p.newPosition ? 'com novo salário de' : 'seu salário passa a ser'} ${brl(p.newSalary)}`);
  const text = parts.length === 3 ? `${parts[0]} ${parts[1]} ${parts[2]}.` : `${parts[0]} ${parts[1] ?? ''}.`;
  return `${text.replace(/\s+\./, '.')}${p.reason ? ` Motivo: ${String(p.reason).trim()}.` : ''} Este reconhecimento é pelo seu trabalho e dedicação.`;
}
