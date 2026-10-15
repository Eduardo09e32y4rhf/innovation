/**
 * Conta autonoma de R&S: empresa (ou recrutador autonomo) que contratou so o modulo de Recrutamento (plano RS).
 * Nao tem funcionarios, ponto, ferias nem folha; administra o proprio cadastro (CNPJ/CPF, logo) e a propria agenda.
 * Espelho de apps/api/src/common/utils/recruiter-account.ts.
 */
export function isRecruiterOnlyAccount(activeModules?: readonly string[] | null): boolean {
  if (!activeModules?.length) return false;
  return activeModules.includes('recruitment') && !activeModules.includes('employees');
}

/** Quem usa Gestao reduzida a Agenda (kanban): o perfil RH - R&S e qualquer usuario de conta autonoma de R&S. */
export function usesRecruiterAgenda(role: string | null | undefined, activeModules?: readonly string[] | null): boolean {
  return String(role ?? '').toUpperCase() === 'RH_RS' || isRecruiterOnlyAccount(activeModules);
}
