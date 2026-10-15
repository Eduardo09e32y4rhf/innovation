-- Triagem em %: nota minima da vaga e o que fazer abaixo dela (sinalizar ou reprovar).
ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "screeningMinScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "screeningAction" TEXT;
