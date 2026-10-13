-- Candidato: resumo profissional e experiências (cargo, empresa, período, atividades).
ALTER TABLE "CandidateAccount"
  ADD COLUMN "about" TEXT,
  ADD COLUMN "experience" JSONB;
