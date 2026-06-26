-- Add new notification types and statuses
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SIMPLE_NOTICE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RH_NOTICE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VACATION_NOTICE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WARNING_NOTICE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUSPENSION_NOTICE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DOCUMENT_NOTICE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SYSTEM_NOTICE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PLATFORM_NOTICE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'URGENT_NOTICE';

ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'PENDING_RESPONSE';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'REFUSED';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'REFUSED_ACKNOWLEDGMENT';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'SENT';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

-- Add new columns to existing notifications table
ALTER TABLE "notifications" 
  ADD COLUMN IF NOT EXISTS "requiresReadConfirmation" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "requiresAcceptance" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "allowsRefusal" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "pinned" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "targetType" "NotificationTargetType" DEFAULT 'ALL',
  ADD COLUMN IF NOT EXISTS "targetId" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "NotificationStatus" DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "attachmentsJson" JSONB,
  ADD COLUMN IF NOT EXISTS "extraJson" JSONB;

-- Create notification_attachments table
CREATE TABLE IF NOT EXISTS "notification_attachments" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "notificationId" TEXT NOT NULL REFERENCES "notifications"("id") ON DELETE CASCADE,
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "storageKey" TEXT,
  "uploadedByUserId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "notification_attachments_notificationId_idx" ON "notification_attachments"("notificationId");

-- Create notification_responses table
CREATE TABLE IF NOT EXISTS "notification_responses" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "notificationId" TEXT NOT NULL REFERENCES "notifications"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "employeeId" TEXT REFERENCES "employees"("id") ON DELETE SET NULL,
  "responseType" TEXT NOT NULL,
  "responseStatus" TEXT NOT NULL,
  "responseMessage" TEXT,
  "respondedAt" TIMESTAMP DEFAULT NOW(),
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_responses_notificationId_userId_key" ON "notification_responses"("notificationId", "userId");
CREATE INDEX IF NOT EXISTS "notification_responses_userId_idx" ON "notification_responses"("userId");
CREATE INDEX IF NOT EXISTS "notification_responses_notificationId_idx" ON "notification_responses"("notificationId");

-- Create notification_history table
CREATE TABLE IF NOT EXISTS "notification_history" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "notificationId" TEXT NOT NULL REFERENCES "notifications"("id") ON DELETE CASCADE,
  "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "action" TEXT NOT NULL,
  "previousStatus" TEXT,
  "newStatus" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "notification_history_notificationId_idx" ON "notification_history"("notificationId");
CREATE INDEX IF NOT EXISTS "notification_history_userId_idx" ON "notification_history"("userId");

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "notifications_companyId_idx" ON "notifications"("companyId");
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications"("type");
CREATE INDEX IF NOT EXISTS "notifications_priority_idx" ON "notifications"("priority");
CREATE INDEX IF NOT EXISTS "notifications_startsAt_idx" ON "notifications"("startsAt");
CREATE INDEX IF NOT EXISTS "notifications_expiresAt_idx" ON "notifications"("expiresAt");
CREATE INDEX IF NOT EXISTS "notifications_targetType_targetId_idx" ON "notifications"("targetType", "targetId");