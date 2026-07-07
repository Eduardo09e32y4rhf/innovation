-- AlterTable
ALTER TABLE "Company" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
