/** Requisição de vaga: etapas de aprovação, quem pode decidir e orçamento de vagas por área (regras puras). */
export const APPROVAL_STEPS = ['GESTOR', 'RH', 'FINANCEIRO'] as const;
export type ApprovalStep = (typeof APPROVAL_STEPS)[number];
export const STEP_LABEL: Record<ApprovalStep, string> = { GESTOR: 'Gestor', RH: 'RH', FINANCEIRO: 'Financeiro' };
export const STEP_ROLES: Record<ApprovalStep, string[]> = {
  GESTOR: ['GESTOR', 'ADMIN', 'DEV'],
  RH: ['RH', 'ADMIN', 'DEV'],
  FINANCEIRO: ['ADMIN', 'CEO', 'CONTABIL', 'DEV'],
};
/** Vagas nestes status ocupam o orçamento da área. */
export const BUDGET_STATUSES = ['OPEN', 'PENDING_APPROVAL', 'PAUSED'];

/** Mantém só etapas válidas, sem repetir, na ordem fixa gestor → RH → financeiro. */
export function normalizeSteps(value: unknown): ApprovalStep[] {
  const wanted = new Set(Array.isArray(value) ? value.map((item) => String(item).toUpperCase()) : []);
  return APPROVAL_STEPS.filter((step) => wanted.has(step));
}

export interface ApprovalRow { step: string; position: number; status: string }

/** A etapa que está esperando decisão agora: a primeira pendente, desde que as anteriores estejam aprovadas. */
export function currentStep(rows: ApprovalRow[]): ApprovalRow | null {
  const ordered = [...rows].sort((a, b) => a.position - b.position);
  for (const row of ordered) {
    if (row.status === 'REJECTED') return null;
    if (row.status === 'PENDING') return row;
  }
  return null;
}

export const canDecide = (step: string, role: string): boolean => (STEP_ROLES[step as ApprovalStep] ?? []).includes(String(role).toUpperCase());

export function approvalOutcome(rows: ApprovalRow[]): 'APPROVED' | 'REJECTED' | 'PENDING' {
  if (rows.some((row) => row.status === 'REJECTED')) return 'REJECTED';
  if (rows.length > 0 && rows.every((row) => row.status === 'APPROVED')) return 'APPROVED';
  return 'PENDING';
}

/** Bloqueia abrir vaga acima do orçamento da área. Sem orçamento definido não há limite. */
export function headcountCheck(budget: number | null | undefined, openingsInUse: number, newOpenings: number): { ok: true } | { ok: false; message: string } {
  if (budget === null || budget === undefined) return { ok: true };
  if (openingsInUse + newOpenings <= budget) return { ok: true };
  const free = Math.max(0, budget - openingsInUse);
  return { ok: false, message: `O orçamento desta área permite ${budget} vaga(s) abertas ao mesmo tempo e ${openingsInUse} já estão em uso. Restam ${free}. Ajuste o orçamento da área ou encerre uma vaga.` };
}

/** Decide se publicar passa por aprovação: só vaga nova ou rascunho indo para OPEN, e só se a empresa configurou etapas. */
export function needsApproval(steps: string[], currentStatus: string | null, nextStatus: string | undefined): boolean {
  if (!steps.length || nextStatus !== 'OPEN') return false;
  return currentStatus === null || currentStatus === 'DRAFT';
}

/** Dias sem decisão a partir dos quais a etapa da vez recebe lembrete (e a fila marca "atrasada"). */
export const APPROVAL_STALE_DAYS = 3;

/** Perfis que recebem o aviso da etapa (DEV é perfil técnico: pode decidir, mas não é avisado). */
export const approverRoles = (step: string): string[] => (STEP_ROLES[step as ApprovalStep] ?? []).filter((role) => role !== 'DEV');

/** Dias (inteiros) que a etapa da vez espera: desde a última decisão anterior ou, na primeira, desde o pedido. */
export function waitingDays(rows: Array<{ position: number; decidedAt?: Date | null }>, current: { position: number; createdAt: Date }, now: Date): number {
  const previous = rows.filter((row) => row.position < current.position && row.decidedAt).map((row) => (row.decidedAt as Date).getTime());
  const since = previous.length ? Math.max(...previous) : current.createdAt.getTime();
  return Math.max(0, Math.floor((now.getTime() - since) / 86_400_000));
}