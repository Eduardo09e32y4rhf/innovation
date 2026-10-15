/**
 * Conta autonoma de R&S: contratou so o modulo de Recrutamento (plano RS). Sem funcionarios, ponto, ferias nem folha.
 * Espelho de apps/web/app/lib/recruiter-account.ts.
 */
export function isRecruiterOnlyAccount(activeModules?: readonly string[] | null): boolean {
  if (!activeModules?.length) return false;
  return activeModules.includes('recruitment') && !activeModules.includes('employees');
}
