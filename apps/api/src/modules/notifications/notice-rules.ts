/** Regras puras dos avisos do admin (comunicado, promocao, advertencia, suspensao). Sem banco, facil de testar. */

const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export type NoticePriority = (typeof PRIORITIES)[number];

/**
 * Quem recebe o codigo de recuperacao de senha de alguem: so perfis ACIMA de quem pediu, e nunca gestores
 * (um gestor veria o codigo de qualquer colega, inclusive do ADMIN, e tomaria a conta).
 * O ADMIN e os perfis da plataforma nao usam este caminho: recuperam por e-mail ou pelo DEV.
 */
export function resetNoticeRoles(requesterRole: string): Array<'RH' | 'ADMIN'> {
  switch (requesterRole) {
    case 'FUNCIONARIO':
    case 'CONSULTA':
    case 'GESTOR':
    case 'RH_RS':
      return ['RH', 'ADMIN'];
    case 'RH':
      return ['ADMIN'];
    default:
      return [];
  }
}

/** Link do aviso: so caminho interno do sistema ("/dashboard/..."). Endereco externo vira nada (evita phishing por aviso). */
export function safeTargetUrl(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  if (!text.startsWith('/') || text.startsWith('//') || /[\\\r\n\t]/.test(text)) return undefined;
  return text.slice(0, 300);
}

export function safePriority(value: unknown, fallback: NoticePriority): NoticePriority {
  const text = String(value ?? '').toUpperCase();
  return (PRIORITIES as readonly string[]).includes(text) ? (text as NoticePriority) : fallback;
}

const isoDay = (value: unknown): string | null => {
  const text = String(value ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(new Date(`${text}T00:00:00.000Z`).getTime()) ? text : null;
};

export interface PromotionData { newPosition?: string; newSalary?: number; effectiveDate?: string }

/**
 * Valida os dados de uma promocao. Precisa de novo cargo e/ou novo salario (maior que zero), e a data de vigencia, se vier, tem de ser valida.
 * Devolve os dados ja limpos ou a mensagem de erro para o usuario.
 */
export function parsePromotion(extra: Record<string, unknown>): { ok: true; data: PromotionData } | { ok: false; message: string } {
  const position = String(extra.newPosition ?? '').trim().slice(0, 120);
  const rawSalary = extra.newSalary;
  const hasSalary = rawSalary !== undefined && rawSalary !== null && String(rawSalary).trim() !== '';
  const salary = hasSalary ? Number(String(rawSalary).replace(/\./g, '').replace(',', '.')) : undefined;
  if (!position && !hasSalary) return { ok: false, message: 'Na promoção, informe o novo cargo e/ou o novo salário.' };
  if (hasSalary && (!Number.isFinite(salary) || (salary as number) <= 0 || (salary as number) > 1_000_000)) return { ok: false, message: 'O novo salário precisa ser um valor maior que zero.' };
  const effective = extra.effectiveDate === undefined || extra.effectiveDate === '' ? undefined : isoDay(extra.effectiveDate);
  if (extra.effectiveDate !== undefined && extra.effectiveDate !== '' && !effective) return { ok: false, message: 'Informe uma data de vigência válida para a promoção.' };
  return { ok: true, data: { ...(position ? { newPosition: position } : {}), ...(hasSalary ? { newSalary: Math.round((salary as number) * 100) / 100 } : {}), ...(effective ? { effectiveDate: effective } : {}) } };
}
