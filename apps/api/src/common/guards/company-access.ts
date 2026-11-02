import type { PrismaService } from '../../database/prisma.service';

export type CompanyAccess = { status: string; billingStatus: string } | null;

const MEMO_KEY = Symbol.for('innovation.companyAccess');

/**
 * Status/cobrança da empresa, consultado UMA vez por requisição: TenantGuard e SubscriptionActiveGuard rodam em
 * sequência na mesma requisição e antes liam a mesma linha de Company duas vezes. O memo vive no objeto da requisição
 * (sem TTL entre requisições), então não existe risco de liberar/bloquear empresa por dado velho.
 */
export function loadCompanyAccess(prisma: PrismaService, request: any, companyId: string): Promise<CompanyAccess> {
  const memo = request?.[MEMO_KEY] as { companyId: string; value: Promise<CompanyAccess> } | undefined;
  if (memo && memo.companyId === companyId) return memo.value;
  const value = prisma.company.findUnique({
    where: { id: companyId },
    select: { status: true, billingStatus: true },
  }) as Promise<CompanyAccess>;
  if (request && typeof request === 'object') request[MEMO_KEY] = { companyId, value };
  return value;
}
