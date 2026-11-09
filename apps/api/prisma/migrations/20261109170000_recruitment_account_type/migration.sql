-- A escolha de uso nao altera os papeis nem as permissoes do administrador.
ALTER TABLE "Company" ADD COLUMN "recruitmentAccountType" TEXT NOT NULL DEFAULT 'EMPLOYER';
ALTER TABLE "Company" ADD CONSTRAINT "Company_recruitmentAccountType_check"
  CHECK ("recruitmentAccountType" IN ('EMPLOYER', 'RECRUITER'));
