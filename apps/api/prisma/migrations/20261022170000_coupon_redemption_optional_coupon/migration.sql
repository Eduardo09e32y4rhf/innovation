-- AlterTable
ALTER TABLE "CouponRedemption" ALTER COLUMN "couponId" DROP NOT NULL;

-- O teste grátis padrão passa a ser um resgate sem cupom: desfaz o cupom interno "__TESTE_PADRAO__"
-- caso algum ambiente já o tenha criado (mantém os resgates, que marcam o CPF/CNPJ que já usou o teste).
UPDATE "CouponRedemption" SET "couponId" = NULL
  WHERE "couponId" IN (SELECT "id" FROM "PromotionCoupon" WHERE "code" = '__TESTE_PADRAO__');
DELETE FROM "PromotionCoupon" WHERE "code" = '__TESTE_PADRAO__';
