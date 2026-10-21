-- CreateTable
CREATE TABLE "SiteVisit" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "path" VARCHAR(200) NOT NULL,
    "referrer" VARCHAR(120),
    "country" VARCHAR(2),
    "region" VARCHAR(80),
    "city" VARCHAR(80),
    "device" VARCHAR(10) NOT NULL,
    "browser" VARCHAR(20),
    "firstOfDay" BOOLEAN NOT NULL DEFAULT false,
    "visitorKey" VARCHAR(32),

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteVisit_createdAt_idx" ON "SiteVisit"("createdAt");

-- CreateIndex
CREATE INDEX "SiteVisit_visitorKey_createdAt_idx" ON "SiteVisit"("visitorKey", "createdAt");
