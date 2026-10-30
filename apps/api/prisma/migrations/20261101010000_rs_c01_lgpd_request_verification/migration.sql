-- RS-C-01: pedido LGPD do candidato so abre depois de confirmar o e-mail; prazo e decisao explicita do RH. Idempotente.
ALTER TABLE "CandidateRequest" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3);
ALTER TABLE "CandidateRequest" ADD COLUMN IF NOT EXISTS "dueAt" TIMESTAMP(3);
ALTER TABLE "CandidateRequest" ADD COLUMN IF NOT EXISTS "decision" TEXT;

CREATE TABLE IF NOT EXISTS "CandidateRequestVerification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandidateRequestVerification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CandidateRequestVerification_tokenHash_key" ON "CandidateRequestVerification"("tokenHash");
CREATE INDEX IF NOT EXISTS "CandidateRequestVerification_email_createdAt_idx" ON "CandidateRequestVerification"("email", "createdAt");
