-- RS-R-01: quem pediu a requisicao (para avisar o resultado) e quando o lembrete da etapa parada foi enviado.
ALTER TABLE "JobApproval" ADD COLUMN IF NOT EXISTS "requestedBy" UUID;
ALTER TABLE "JobApproval" ADD COLUMN IF NOT EXISTS "remindedAt" TIMESTAMP(3);
