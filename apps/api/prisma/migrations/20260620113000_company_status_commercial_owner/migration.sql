DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CompanyStatus') THEN
    CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED');
  END IF;
END $$;

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "commercialOwnerId" UUID;

UPDATE "Company"
SET "status" = CASE WHEN "isActive" = true THEN 'ACTIVE'::"CompanyStatus" ELSE 'SUSPENDED'::"CompanyStatus" END
WHERE "status" = 'ACTIVE'::"CompanyStatus";

CREATE INDEX IF NOT EXISTS "Company_commercialOwnerId_idx" ON "Company"("commercialOwnerId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Company_commercialOwnerId_fkey'
  ) THEN
    ALTER TABLE "Company"
      ADD CONSTRAINT "Company_commercialOwnerId_fkey"
      FOREIGN KEY ("commercialOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
