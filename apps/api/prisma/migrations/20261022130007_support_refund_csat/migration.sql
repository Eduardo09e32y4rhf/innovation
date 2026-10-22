-- CreateEnum
CREATE TYPE "SupportRefundKind" AS ENUM ('TOTAL', 'PARTIAL');

-- CreateEnum
CREATE TYPE "SupportRefundStatus" AS ENUM ('REQUESTED', 'AWAITING_SECOND_APPROVAL', 'APPROVED', 'REJECTED', 'PROCESSING', 'CONFIRMED', 'FAILED');

-- AlterEnum
ALTER TYPE "SupportTicketCategory" ADD VALUE 'REFUND';

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "invoiceId" UUID,
ADD COLUMN     "paymentRefundId" UUID,
ADD COLUMN     "refundAmount" DECIMAL(14,2),
ADD COLUMN     "refundDecisionAt" TIMESTAMP(3),
ADD COLUMN     "refundDecisionById" UUID,
ADD COLUMN     "refundDecisionReason" TEXT,
ADD COLUMN     "refundKind" "SupportRefundKind",
ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "refundSecondApproverAt" TIMESTAMP(3),
ADD COLUMN     "refundSecondApproverId" UUID,
ADD COLUMN     "refundStatus" "SupportRefundStatus",
ADD COLUMN     "satisfactionAt" TIMESTAMP(3),
ADD COLUMN     "satisfactionComment" TEXT,
ADD COLUMN     "satisfactionScore" INTEGER;

-- CreateIndex
CREATE INDEX "SupportTicket_invoiceId_idx" ON "SupportTicket"("invoiceId");

-- CreateIndex
CREATE INDEX "SupportTicket_refundStatus_idx" ON "SupportTicket"("refundStatus");

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PlatformInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
