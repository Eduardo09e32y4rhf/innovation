-- Cargos manuais: o RH cadastra cargos novos e eles ficam no historico da empresa
CREATE TABLE "CompanyPosition" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyPosition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CompanyPosition_companyId_nameKey_key" ON "CompanyPosition"("companyId", "nameKey");
CREATE INDEX "CompanyPosition_companyId_idx" ON "CompanyPosition"("companyId");
ALTER TABLE "CompanyPosition" ADD CONSTRAINT "CompanyPosition_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
