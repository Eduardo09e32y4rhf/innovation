-- RS-R-11: vaga PCD como atributo da vaga (selo publico, filtro no portal, indicador de cota).
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "pcd" BOOLEAN NOT NULL DEFAULT false;
