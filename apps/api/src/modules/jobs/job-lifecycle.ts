/**
 * Ciclo de vida da vaga e dados do funcionário para candidatura interna (regras puras).
 * - Vaga encerrada continua aparecendo por 30 dias, sem aceitar candidatos, e pode ser reativada nesse prazo.
 *   Reativar NÃO conta como vaga nova no limite do plano R&S.
 */
export const REACTIVATION_DAYS = 30;
const DAY = 86_400_000;

export type JobPhase = 'DRAFT' | 'OPEN' | 'CLOSED_RECENT' | 'ARCHIVED';
export interface JobLifecycle { phase: JobPhase; acceptsApplications: boolean; canReactivate: boolean; reactivatableUntil: string | null; daysLeft: number | null }

export function jobLifecycle(job: { status: string; closedAt?: Date | string | null; updatedAt?: Date | string | null; deadline?: Date | string | null }, now = new Date()): JobLifecycle {
  if (job.status === 'DRAFT') return { phase: 'DRAFT', acceptsApplications: false, canReactivate: false, reactivatableUntil: null, daysLeft: null };
  if (job.status === 'OPEN') {
    const expired = job.deadline ? new Date(job.deadline).getTime() < now.getTime() : false;
    return { phase: 'OPEN', acceptsApplications: !expired, canReactivate: false, reactivatableUntil: null, daysLeft: null };
  }
  const since = new Date(job.closedAt ?? job.updatedAt ?? now);
  const until = new Date(since.getTime() + REACTIVATION_DAYS * DAY);
  const left = Math.ceil((until.getTime() - now.getTime()) / DAY);
  const recent = until.getTime() >= now.getTime();
  return { phase: recent ? 'CLOSED_RECENT' : 'ARCHIVED', acceptsApplications: false, canReactivate: recent, reactivatableUntil: until.toISOString().slice(0, 10), daysLeft: recent ? Math.max(0, left) : 0 };
}

/** Campos que mudam ao trocar o status da vaga (null = não mexe). */
export function statusChange(current: { status: string; closedAt?: Date | string | null; updatedAt?: Date | string | null; reopenCount?: number }, next: 'OPEN' | 'CLOSED' | 'DRAFT', now = new Date()):
  { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  if (next === current.status) return { ok: true, data: {} };
  if (next === 'CLOSED') return { ok: true, data: { closedAt: now } };
  if (next === 'OPEN' && current.status === 'CLOSED') {
    const life = jobLifecycle(current, now);
    if (!life.canReactivate) return { ok: false, message: `Esta vaga foi encerrada há mais de ${REACTIVATION_DAYS} dias e não pode mais ser reativada. Duplique a vaga para abrir um novo processo.` };
    return { ok: true, data: { closedAt: null, reopenedAt: now, reopenCount: (current.reopenCount ?? 0) + 1 } };
  }
  if (next === 'DRAFT' && current.status === 'CLOSED') return { ok: false, message: 'Vaga encerrada não volta para rascunho. Reative-a (até 30 dias) ou duplique.' };
  return { ok: true, data: next === 'OPEN' ? { closedAt: null } : {} };
}

// ─── Candidatura interna ───────────────────────────────────────────
export const FRESH_MONTHS = 12;
export interface EmployeeSnapshot {
  name?: string | null; email?: string | null; phone?: string | null; cpf?: string | null; birthDate?: Date | string | null;
  cep?: string | null; street?: string | null; city?: string | null; state?: string | null; bankAccount?: string | null; updatedAt?: Date | string | null;
}

/** O que está faltando ou velho no cadastro (para o sistema avisar o RH sem travar a candidatura). */
export function outdatedFields(e: EmployeeSnapshot, now = new Date()): string[] {
  const out: string[] = [];
  const empty = (v: unknown) => v === null || v === undefined || String(v).trim() === '';
  if (empty(e.phone)) out.push('telefone');
  if (empty(e.email)) out.push('e-mail');
  if (empty(e.birthDate)) out.push('data de nascimento');
  if (empty(e.cep) || empty(e.street) || empty(e.city)) out.push('endereço');
  if (empty(e.cpf)) out.push('CPF');
  if (e.updatedAt) {
    const months = (now.getTime() - new Date(e.updatedAt).getTime()) / (30.44 * DAY);
    if (months > FRESH_MONTHS) out.push(`cadastro sem atualização há mais de ${FRESH_MONTHS} meses`);
  }
  return out;
}

/** Diferenças entre o que a pessoa informou ao se candidatar e o que está no cadastro. */
export function reportedChanges(current: { phone?: string | null; email?: string | null }, informed: { phone?: string; email?: string }): string[] {
  const norm = (v?: string | null) => String(v ?? '').replace(/\D/g, '');
  const changes: string[] = [];
  if (informed.phone && norm(informed.phone) && norm(informed.phone) !== norm(current.phone)) changes.push(`telefone: ${informed.phone}`);
  if (informed.email && informed.email.trim().toLowerCase() !== String(current.email ?? '').trim().toLowerCase()) changes.push(`e-mail: ${informed.email.trim()}`);
  return changes;
}
