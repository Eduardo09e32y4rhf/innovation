-- Teste gratis: aviso no 9o dia e decisao do administrador (continuar ou recusar)
ALTER TABLE "CompanySubscription" ADD COLUMN "trialNoticeAt" TIMESTAMP(3),
  ADD COLUMN "trialDeclinedAt" TIMESTAMP(3);
