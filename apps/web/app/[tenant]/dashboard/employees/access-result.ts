export type AccessResult = { employeeId?: string; success: boolean; error?: string; temporaryPassword?: string };

export type AccessOutcome = { ok: boolean; message: string; temporaryPassword?: string };

/**
 * A API devolve um resultado por item. Sucesso so e anunciado quando o item foi confirmado;
 * resposta vazia ou com falha nunca vira "sucesso".
 */
export function summarizeAccessResults(results: AccessResult[] | null | undefined, successMessage: string): AccessOutcome {
  if (!Array.isArray(results) || results.length === 0) return { ok: false, message: 'O servidor nao confirmou a operacao.' };
  const failed = results.find((item) => !item.success);
  if (failed) return { ok: false, message: failed.error?.trim() || 'A operacao nao foi concluida.' };
  const temporaryPassword = results.find((item) => item.temporaryPassword)?.temporaryPassword;
  return { ok: true, message: successMessage, ...(temporaryPassword ? { temporaryPassword } : {}) };
}