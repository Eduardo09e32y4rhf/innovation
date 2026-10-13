-- Candidato: resumo profissional e experiências (cargo, empresa, período, atividades).
ALTER TABLE "CandidateAccount"
  ADD COLUMN IF NOT EXISTS "about" TEXT,
  ADD COLUMN IF NOT EXISTS "experience" JSONB;
