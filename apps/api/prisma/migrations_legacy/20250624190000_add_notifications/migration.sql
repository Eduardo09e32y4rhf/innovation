CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'ADMIN_USER');
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "companyId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
  "source" VARCHAR(50),
  "targetUrl" TEXT,
  "createdBy" TEXT,
  "startsAt" TIMESTAMP,
  "expiresAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_recipients" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "notificationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
  "readAt" TIMESTAMP,
  "archivedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),

  CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_recipients_notificationId_userId_key" ON "notification_recipients"("notificationId", "userId");

CREATE INDEX "notifications_companyId_idx" ON "notifications"("companyId");
CREATE INDEX "notifications_type_idx" ON "notifications"("type");
CREATE INDEX "notifications_priority_idx" ON "notifications"("priority");
CREATE INDEX "notifications_startsAt_idx" ON "notifications"("startsAt");
CREATE INDEX "notifications_expiresAt_idx" ON "notifications"("expiresAt");

CREATE INDEX "notification_recipients_userId_idx" ON "notification_recipients"("userId");
CREATE INDEX "notification_recipients_status_idx" ON "notification_recipients"("status");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE;
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;