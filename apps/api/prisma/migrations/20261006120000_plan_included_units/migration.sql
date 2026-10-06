-- Usuarios/vagas incluidos na base do plano (so o excedente paga o adicional)
ALTER TABLE "PlatformPlan" ADD COLUMN "includedUnits" INTEGER NOT NULL DEFAULT 0;
