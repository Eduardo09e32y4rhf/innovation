-- CreateEnum
CREATE TYPE "SupportTicketSource" AS ENUM ('AUTHENTICATED', 'LOGIN_PUBLIC', 'PASSWORD_RESET', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SupportTicketCategory" AS ENUM ('BUG', 'CORRECTION', 'ADJUSTMENT', 'MAINTENANCE', 'FEATURE_REQUEST', 'PASSWORD_RESET', 'ACCESS', 'BILLING', 'PERFORMANCE', 'SECURITY', 'INTEGRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('NEW', 'TRIAGE', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_DEPLOY', 'RESOLVED', 'CLOSED', 'DUPLICATE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SupportMessageVisibility" AS ENUM ('PUBLIC', 'INTERNAL');

-- CreateEnum
CREATE TYPE "SupportAttachmentStatus" AS ENUM ('QUARANTINED', 'SCANNING', 'CLEAN', 'REJECTED', 'DELETED');

-- CreateEnum
CREATE TYPE "SupportAttachmentType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT');

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" UUID NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "companyId" UUID,
    "createdByUserId" UUID,
    "affectedUserId" UUID,
    "affectedEmployeeId" UUID,
    "assignedToUserId" UUID,
    "duplicateOfId" UUID,
    "requesterName" TEXT,
    "requesterEmail" TEXT NOT NULL,
    "requesterPhone" TEXT,
    "source" "SupportTicketSource" NOT NULL,
    "category" "SupportTicketCategory" NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'NEW',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "affectedArea" TEXT,
    "impact" TEXT,
    "reproductionSteps" TEXT,
    "expectedResult" TEXT,
    "actualResult" TEXT,
    "pageUrl" TEXT,
    "tenantSlug" TEXT,
    "browser" TEXT,
    "operatingSystem" TEXT,
    "viewport" TEXT,
    "userAgent" TEXT,
    "appVersion" TEXT,
    "requestId" TEXT,
    "ipHash" TEXT,
    "firstResponseDueAt" TIMESTAMP(3),
    "resolutionDueAt" TIMESTAMP(3),
    "firstRespondedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "slaPausedAt" TIMESTAMP(3),
    "slaPausedMinutes" INTEGER NOT NULL DEFAULT 0,
    "slaBreached" BOOLEAN NOT NULL DEFAULT false,
    "lastCustomerReplyAt" TIMESTAMP(3),
    "lastDevReplyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicketMessage" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "authorUserId" UUID,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "visibility" "SupportMessageVisibility" NOT NULL DEFAULT 'PUBLIC',
    "message" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3),
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportAttachment" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "messageId" UUID,
    "uploadedByUserId" UUID,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "attachmentType" "SupportAttachmentType" NOT NULL,
    "declaredMimeType" TEXT NOT NULL,
    "detectedMimeType" TEXT,
    "sizeBytes" BIGINT NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" "SupportAttachmentStatus" NOT NULL DEFAULT 'QUARANTINED',
    "scanProvider" TEXT,
    "scanResult" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SupportAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicketEvent" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "actorUserId" UUID,
    "eventType" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicketCounter" (
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicketCounter_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_ticketNumber_key" ON "SupportTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "SupportTicket_companyId_status_idx" ON "SupportTicket"("companyId", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_createdByUserId_idx" ON "SupportTicket"("createdByUserId");

-- CreateIndex
CREATE INDEX "SupportTicket_affectedUserId_idx" ON "SupportTicket"("affectedUserId");

-- CreateIndex
CREATE INDEX "SupportTicket_affectedEmployeeId_idx" ON "SupportTicket"("affectedEmployeeId");

-- CreateIndex
CREATE INDEX "SupportTicket_assignedToUserId_status_idx" ON "SupportTicket"("assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_priority_status_idx" ON "SupportTicket"("priority", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_firstResponseDueAt_idx" ON "SupportTicket"("firstResponseDueAt");

-- CreateIndex
CREATE INDEX "SupportTicket_resolutionDueAt_idx" ON "SupportTicket"("resolutionDueAt");

-- CreateIndex
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

-- CreateIndex
CREATE INDEX "SupportTicketMessage_ticketId_createdAt_idx" ON "SupportTicketMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportAttachment_storageKey_key" ON "SupportAttachment"("storageKey");

-- CreateIndex
CREATE INDEX "SupportAttachment_ticketId_idx" ON "SupportAttachment"("ticketId");

-- CreateIndex
CREATE INDEX "SupportAttachment_sha256_idx" ON "SupportAttachment"("sha256");

-- CreateIndex
CREATE INDEX "SupportAttachment_status_idx" ON "SupportAttachment"("status");

-- CreateIndex
CREATE INDEX "SupportTicketEvent_ticketId_createdAt_idx" ON "SupportTicketEvent"("ticketId", "createdAt");

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_affectedUserId_fkey" FOREIGN KEY ("affectedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_affectedEmployeeId_fkey" FOREIGN KEY ("affectedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "SupportTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAttachment" ADD CONSTRAINT "SupportAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAttachment" ADD CONSTRAINT "SupportAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "SupportTicketMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAttachment" ADD CONSTRAINT "SupportAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketEvent" ADD CONSTRAINT "SupportTicketEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketEvent" ADD CONSTRAINT "SupportTicketEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

