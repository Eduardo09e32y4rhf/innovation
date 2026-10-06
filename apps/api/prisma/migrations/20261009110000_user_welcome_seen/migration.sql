-- Boas-vindas do primeiro acesso. Quem ja usa o sistema nao ve a tela: so usuarios criados a partir de agora.
ALTER TABLE "User" ADD COLUMN "welcomeSeenAt" TIMESTAMP(3);
UPDATE "User" SET "welcomeSeenAt" = NOW();
