-- CreateTable: aso_clinic_presets
CREATE TABLE "aso_clinic_presets" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "companyId"   UUID         NOT NULL,
    "name"        TEXT         NOT NULL,
    "cep"         VARCHAR(10),
    "address"     TEXT,
    "city"        VARCHAR(100),
    "state"       VARCHAR(2),
    "phone"       VARCHAR(20),
    "doctorName"  TEXT,
    "active"      BOOLEAN      NOT NULL DEFAULT TRUE,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aso_clinic_presets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "aso_clinic_presets_companyId_idx" ON "aso_clinic_presets"("companyId");

-- AddForeignKey
ALTER TABLE "aso_clinic_presets"
    ADD CONSTRAINT "aso_clinic_presets_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Trigger to auto-update updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_aso_clinic_presets_updated_at
    BEFORE UPDATE ON "aso_clinic_presets"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
