-- Assinatura do contrato do CEO pelo gov.br (PDF assinado enviado, conferido e confirmado pelo DEV)
ALTER TABLE "CEOContract" ADD COLUMN "signedPdfDocumentId" TEXT,
  ADD COLUMN "signedPdfIntegrity" TEXT,
  ADD COLUMN "signatureCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "signedUploadedById" UUID,
  ADD COLUMN "signedUploadedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedById" UUID,
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "verificationNote" TEXT;

-- A etapa de cadastro facial propria nao existe: a identidade e comprovada pela conta gov.br (prata/ouro) na assinatura.
-- CEOs que ja trocaram a senha e ficaram na etapa de facial seguem para o preenchimento dos proprios dados.
UPDATE "User" SET "onboardingState" = 'PROFILE_REQUIRED' WHERE "role" = 'CEO' AND "onboardingState" = 'FACE_ENROLLMENT';