CREATE TYPE "EmailCampaignType" AS ENUM ('INFO', 'TRIAL_INVITE');
CREATE TYPE "EmailRecipientStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'BOUNCED', 'SKIPPED_COOLDOWN', 'SKIPPED_ALREADY_ACTIVATED', 'SKIPPED_UNSUBSCRIBED', 'ACTIVATED');
CREATE TYPE "PlatformNoticeType" AS ENUM ('FEATURE', 'TERMS');

CREATE TABLE "EmailCampaign" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "createdById" UUID NOT NULL,
  "subject" TEXT NOT NULL,
  "bodyText" TEXT NOT NULL,
  "type" "EmailCampaignType" NOT NULL DEFAULT 'TRIAL_INVITE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EmailCampaign_createdById_idx" ON "EmailCampaign"("createdById");

CREATE TABLE "EmailRecipient" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "campaignId" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "status" "EmailRecipientStatus" NOT NULL DEFAULT 'QUEUED',
  "resendEmailId" TEXT,
  "tokenHash" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "error" TEXT,
  CONSTRAINT "EmailRecipient_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmailRecipient_resendEmailId_key" ON "EmailRecipient"("resendEmailId");
CREATE UNIQUE INDEX "EmailRecipient_tokenHash_key" ON "EmailRecipient"("tokenHash");
CREATE INDEX "EmailRecipient_campaignId_idx" ON "EmailRecipient"("campaignId");
CREATE INDEX "EmailRecipient_email_idx" ON "EmailRecipient"("email");
ALTER TABLE "EmailRecipient" ADD CONSTRAINT "EmailRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TrialInvite" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "lastInviteSentAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "unsubscribedAt" TIMESTAMP(3),
  "bouncedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrialInvite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TrialInvite_email_key" ON "TrialInvite"("email");

CREATE TABLE "PlatformNotice" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "type" "PlatformNoticeType" NOT NULL DEFAULT 'FEATURE',
  "createdById" UUID NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformNotice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformNoticeRead" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "noticeId" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  CONSTRAINT "PlatformNoticeRead_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformNoticeRead_noticeId_userId_key" ON "PlatformNoticeRead"("noticeId", "userId");
CREATE INDEX "PlatformNoticeRead_tenantId_userId_idx" ON "PlatformNoticeRead"("tenantId", "userId");
ALTER TABLE "PlatformNoticeRead" ADD CONSTRAINT "PlatformNoticeRead_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "PlatformNotice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
