CREATE TABLE "CEOProfile" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "legalName" TEXT,
  "cpf" TEXT,
  "birthDate" TIMESTAMP(3),
  "data" JSONB,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CEOProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CEOProfile_userId_key" ON "CEOProfile"("userId");
ALTER TABLE "CEOProfile" ADD CONSTRAINT "CEOProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CEOContract" (
  "id" UUID NOT NULL,
  "ceoUserId" UUID NOT NULL,
  "issuedById" UUID NOT NULL,
  "version" TEXT NOT NULL,
  "contentHtml" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "pdfDocumentId" TEXT,
  "challengeHash" TEXT,
  "challengeExpiresAt" TIMESTAMP(3),
  "challengeUsedAt" TIMESTAMP(3),
  "signatureHash" TEXT,
  "signedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CEOContract_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CEOContract_ceoUserId_version_key" ON "CEOContract"("ceoUserId", "version");
CREATE INDEX "CEOContract_ceoUserId_signedAt_idx" ON "CEOContract"("ceoUserId", "signedAt");
ALTER TABLE "CEOContract" ADD CONSTRAINT "CEOContract_ceoUserId_fkey" FOREIGN KEY ("ceoUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CEOContract" ADD CONSTRAINT "CEOContract_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
