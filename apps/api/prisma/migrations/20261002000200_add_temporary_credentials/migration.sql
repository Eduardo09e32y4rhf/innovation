CREATE TABLE "TemporaryCredential" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "encryptedValue" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revealCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TemporaryCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TemporaryCredential_userId_key" ON "TemporaryCredential"("userId");
CREATE INDEX "TemporaryCredential_expiresAt_idx" ON "TemporaryCredential"("expiresAt");
CREATE INDEX "TemporaryCredential_revokedAt_idx" ON "TemporaryCredential"("revokedAt");
ALTER TABLE "TemporaryCredential" ADD CONSTRAINT "TemporaryCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
