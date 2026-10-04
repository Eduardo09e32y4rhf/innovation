import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { SKIP_SUBSCRIPTION_CHECK_KEY } from '../decorators/skip-subscription-check.decorator';
import type { JwtUser } from '../types/auth.types';

/** Rotas que continuam abertas para a empresa regularizar a situação. */
const ALWAYS_ALLOWED = ['/auth/', '/health', '/finance/company/', '/legal/', '/finance/webhook/'];
const DAY_MS = 86_400_000;

/**
 * Bloqueia empresas inadimplentes. Guards globais rodam ANTES do JwtAuthGuard do controller, então request.user ainda
 * não existe: o token é lido aqui (como no TenantGuard). PAST_DUE só bloqueia depois da carência (BILLING_GRACE_DAYS,
 * padrão 15 dias de atraso); CANCELED bloqueia na hora. DEV nunca é bloqueado.
 */
@Injectable()
export class SubscriptionActiveGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_SUBSCRIPTION_CHECK_KEY, [context.getHandler(), context.getClass()]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const path = String(request.url || request.raw?.url || '');
    if (ALWAYS_ALLOWED.some((prefix) => path.startsWith(prefix))) return true;

    const user: JwtUser | null = request.user ?? (await this.readJwt(request.headers?.authorization));
    if (!user?.companyId || user.role === 'DEV') return true;

    const company = await this.prisma.company.findUnique({ where: { id: user.companyId }, select: { billingStatus: true } });
    if (!company) return true;

    if (company.billingStatus === 'CANCELED') this.deny();

    if (company.billingStatus === 'PAST_DUE') {
      const graceDays = Math.max(0, Number(process.env.BILLING_GRACE_DAYS ?? 15) || 0);
      const limit = new Date(Date.now() - graceDays * DAY_MS);
      const overdue = await this.prisma.platformInvoice.findFirst({
        where: { companyId: user.companyId, deletedAt: null, status: { in: ['OPEN', 'OVERDUE'] }, dueDate: { lt: limit } },
        select: { id: true },
      });
      if (overdue) this.deny();
    }
    return true;
  }

  private deny(): never {
    // 402 para o frontend redirecionar à tela de cobrança.
    throw new HttpException(
      { statusCode: HttpStatus.PAYMENT_REQUIRED, message: 'O acesso está bloqueado por falta de pagamento. Regularize sua fatura para continuar.', code: 'SUBSCRIPTION_OVERDUE' },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  private async readJwt(authorization?: string): Promise<JwtUser | null> {
    if (!authorization?.startsWith('Bearer ')) return null;
    try {
      return await this.jwt.verifyAsync<JwtUser>(authorization.slice(7));
    } catch {
      return null; // O JwtAuthGuard rejeita tokens inválidos.
    }
  }
}
