-- RS-C-08: marca o lembrete enviado antes do vencimento (proposta, teste, horarios) para nao repetir.
ALTER TABLE "JobOffer" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);
ALTER TABLE "AssessmentInvite" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);
ALTER TABLE "InterviewSlotOffer" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);
