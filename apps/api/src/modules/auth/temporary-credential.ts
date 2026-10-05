/** Uma provisoria so autentica enquanto nao expirou, nao foi revogada e nao foi consumida. */
export type TemporaryCredentialState = { expiresAt: Date; revokedAt?: Date | null; consumedAt?: Date | null };

export function isTemporaryCredentialUsable(credential: TemporaryCredentialState, now: Date = new Date()): boolean {
  return !credential.revokedAt && !credential.consumedAt && credential.expiresAt.getTime() > now.getTime();
}