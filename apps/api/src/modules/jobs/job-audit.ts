/** Auditoria das ações sobre a vaga (regras puras). Os registros vão para AuditLog com entity='Job'. */
export const JOB_AUDIT_LABEL: Record<string, string> = {
  JOB_CREATED: 'Vaga criada',
  JOB_UPDATED: 'Vaga editada',
  JOB_PUBLISHED: 'Vaga publicada',
  JOB_SENT_FOR_APPROVAL: 'Vaga enviada para aprovação',
  JOB_PAUSED: 'Vaga pausada',
  JOB_CLOSED: 'Vaga encerrada',
  JOB_REOPENED: 'Vaga reaberta',
  JOB_ARCHIVED: 'Vaga arquivada',
  JOB_DUPLICATED: 'Vaga duplicada',
  JOB_STAGE_CHANGED: 'Candidato movido de etapa',
  JOB_DATA_EXPORTED: 'Dados de candidatos exportados',
  JOB_COST_UPDATED: 'Custos da vaga atualizados',
  JOB_DELETED_PERMANENTLY: 'Vaga excluída de vez',
};

/** Campos que contam como "edição" no histórico. Só os NOMES vão para o log (nada de valores sensíveis como salário). */
export const AUDITED_FIELDS = [
  'title', 'description', 'location', 'employmentType', 'salaryRange', 'salaryMin', 'salaryMax', 'salaryHidden', 'benefits', 'requirements',
  'department', 'workMode', 'seniority', 'openings', 'deadline', 'pipelineId', 'isInternal', 'confidential', 'interviewGuide',
  'screeningMinScore', 'screeningAction', 'pcd', 'costAmount',
] as const;

const same = (a: unknown, b: unknown) => {
  // Decimal do Prisma chega como objeto: compara pelo numero.
  const norm = (value: unknown) => (value instanceof Date ? value.toISOString() : value === undefined || value === '' ? null : value !== null && typeof value === 'object' && !Array.isArray(value) && typeof (value as { toString?: unknown }).toString === 'function' && /^-?\d+(\.\d+)?$/.test(String(value)) ? Number(String(value)) : value);
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
};

/** Nomes dos campos que o PATCH realmente muda (campo ausente no PATCH não conta). */
export function changedFields(current: Record<string, unknown>, patch: Record<string, unknown>): string[] {
  return AUDITED_FIELDS.filter((field) => field in patch && patch[field] !== undefined && !same(current[field], field === 'deadline' && patch[field] ? new Date(String(patch[field])) : patch[field]));
}

/** Ação do histórico para uma mudança de status (null = o status não mudou). */
export function statusAction(from: string | null | undefined, to: string | null | undefined): string | null {
  if (!to || from === to) return null;
  if (to === 'PENDING_APPROVAL') return 'JOB_SENT_FOR_APPROVAL';
  if (to === 'OPEN') return from === 'DRAFT' || !from ? 'JOB_PUBLISHED' : 'JOB_REOPENED';
  if (to === 'PAUSED') return 'JOB_PAUSED';
  if (to === 'CLOSED' || to === 'FILLED') return 'JOB_CLOSED';
  return null;
}
