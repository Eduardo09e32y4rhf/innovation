-- Agenda (Gestão): link da reunião (Teams, Meet, Zoom...) e local do compromisso.
ALTER TABLE "management_events"
  ADD COLUMN IF NOT EXISTS "meetingUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "location" TEXT;

-- Entrevista: presencial (local) ou online (link), duração, com quem, recado ao candidato,
-- quando o e-mail foi enviado e o compromisso criado na agenda de quem agendou.
ALTER TABLE "ApplicationInterview"
  ADD COLUMN IF NOT EXISTS "mode" TEXT,
  ADD COLUMN IF NOT EXISTS "meetingUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER,
  ADD COLUMN IF NOT EXISTS "interviewerRole" TEXT,
  ADD COLUMN IF NOT EXISTS "candidateMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "notifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "agendaEventId" UUID,
  ADD COLUMN IF NOT EXISTS "createdById" UUID;
