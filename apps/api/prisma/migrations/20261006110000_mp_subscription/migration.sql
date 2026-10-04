-- Assinatura recorrente no Mercado Pago
ALTER TABLE "CompanySubscription" ADD COLUMN "mpPreapprovalId" TEXT;
CREATE UNIQUE INDEX "CompanySubscription_mpPreapprovalId_key" ON "CompanySubscription"("mpPreapprovalId");
