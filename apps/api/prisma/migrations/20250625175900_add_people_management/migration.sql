-- Create enum types for Commitment and ASO
CREATE TYPE IF NOT EXISTS "CommitmentType" AS ENUM (
  'DOCUMENT_DELIVERY',
  'DOCUMENT_SIGNATURE',
  'MEDICAL_EXAM',
  'RETURN_FROM_LEAVE',
  'MEETING_RH',
  'RENEWAL',
  'ADMIN_PENDING',
  'VACATION',
  'WARNING',
  'SUSPENSION',
  'TRAINING',
  'ONBOARDING',
  'OTHER'
);

CREATE TYPE IF NOT EXISTS "CommitmentStatus" AS ENUM (
  'PENDING',
  'TODAY',
  'OVERDUE',
  'UPCOMING',
  'COMPLETED',
  'CANCELLED',
  'RESCHEDULED'
);

CREATE TYPE IF NOT EXISTS "CommitmentPriority" AS ENUM (
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
);

CREATE TYPE IF NOT EXISTS "AsoStatus" AS ENUM (
  'PENDING',
  'SCHEDULED',
  'COMPLETED',
  'NEAR_EXPIRATION',
  'EXPIRED',
  'CANCELLED',
  'WAITING_DOCUMENT',
  'WAITING_ADDITIONAL_EXAM'
);

CREATE TYPE IF NOT EXISTS "AttachmentOwnerType" AS ENUM (
  'COMMITMENT',
  'ASO',
  'EMPLOYEE',
  'NOTIFICATION'
);

CREATE TYPE IF NOT EXISTS "ActivityEntityType" AS ENUM (
  'COMMITMENT',
  'ASO',
  'EMPLOYEE',
  'NOTIFICATION'
);

-- Create commitments table
CREATE TABLE IF NOT EXISTS "commitments" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "companyId" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "employeeId" TEXT REFERENCES "employees"("id") ON DELETE SET NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "CommitmentType" NOT NULL,
  "status" "CommitmentStatus" DEFAULT 'PENDING',
  "priority" "CommitmentPriority" DEFAULT 'NORMAL',
  "dueDate" TIMESTAMP NOT NULL,
  "dueTime" TEXT,
  "responsibleUserId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "createdByUserId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "completedByUserId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "completedAt" TIMESTAMP,
  "cancelledAt" TIMESTAMP,
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "commitments_companyId_idx" ON "commitments"("companyId");
CREATE INDEX IF NOT EXISTS "commitments_employeeId_idx" ON "commitments"("employeeId");
CREATE INDEX IF NOT EXISTS "commitments_dueDate_idx" ON "commitments"("dueDate");
CREATE INDEX IF NOT EXISTS "commitments_status_idx" ON "commitments"("status");

-- Update employee_aso_records with new status enum
ALTER TABLE "employee_aso_records"
  DROP CONSTRAINT IF EXISTS "employee_aso_records_status_check";

ALTER TABLE "employee_aso_records"
  ADD CONSTRAINT "employee_aso_records_status_check" 
  CHECK (status IN (
    'PENDING',
    'SCHEDULED',
    'COMPLETED',
    'NEAR_EXPIRATION',
    'EXPIRED',
    'CANCELLED',
    'WAITING_DOCUMENT',
    'WAITING_ADDITIONAL_EXAM'
  ));

-- Add new columns to employee_aso_records
ALTER TABLE "employee_aso_records"
  ADD COLUMN IF NOT EXISTS "documentNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "attachmentId" TEXT,
  ADD COLUMN IF NOT EXISTS "completedBy" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;

-- Create attachments table
CREATE TABLE IF NOT EXISTS "attachments" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "companyId" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "ownerType" "AttachmentOwnerType" NOT NULL,
  "ownerId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "storageKey" TEXT,
  "uploadedByUserId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "attachments_companyId_idx" ON "attachments"("companyId");
CREATE INDEX IF NOT EXISTS "attachments_ownerType_ownerId_idx" ON "attachments"("ownerType", "ownerId");

-- Create activity_histories table
CREATE TABLE IF NOT EXISTS "activity_histories" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "companyId" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "entityType" "ActivityEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "previousStatus" TEXT,
  "newStatus" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "activity_histories_companyId_idx" ON "activity_histories"("companyId");
CREATE INDEX IF NOT EXISTS "activity_histories_entityType_entityId_idx" ON "activity_histories"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "activity_histories_userId_idx" ON "activity_histories"("userId");