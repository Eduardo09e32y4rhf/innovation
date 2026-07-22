import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../types/auth.types';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user ?? await this.readJwt(request.headers?.authorization);
    if (!user) return true;
    if (!user.companyId) throw new UnauthorizedException('No company context');

    request.companyId = user.companyId;
    if (user.role === 'DEV') return true;

    const company = await this.prisma.company.findUnique({
      where: { id: user.companyId },
      select: { status: true, billingStatus: true },
    });
    if (!company) throw new UnauthorizedException('Company not found');

    // Bloqueia se a empresa estiver suspensa ou se a assinatura estiver cancelada/aguardando ativação inicial
    const blocked = company.status !== 'ACTIVE' || ['CANCELED', 'PENDING_PAYMENT'].includes(company.billingStatus);
    if (!blocked) return true;

    const path = String(request.url || request.raw?.url || '');
    const isAuthRoute = path.startsWith('/auth/');
    const isFinanceRoute = path.startsWith('/finance/');

    if (user.role === 'ADMIN' || user.role === 'DEV') {
      if (isAuthRoute) return true; // Pode sempre fazer logout ou login
      if (company.billingStatus === 'CANCELED') {
         // Cancelado: sem acesso financeiro (deveria ir pro suporte/saida), vamos permitir apenas auth por enquanto
         if (isAuthRoute) return true;
      } else {
         // Suspensa ou aguardando pagamento: permite tela financeira para regularizar
         if (isFinanceRoute) return true;
      }
    }

    if (!['ADMIN', 'DEV'].includes(user.role)) {
      throw new ForbiddenException({
        code: 'COMPANY_ACCESS_TEMPORARILY_UNAVAILABLE',
        message: 'O acesso da sua empresa esta temporariamente indisponivel por uma pendencia na assinatura. A regularizacao esta disponivel ao administrador da empresa.',
      });
    }

    throw new ForbiddenException({
      code: 'COMPANY_BILLING_BLOCKED',
      message: 'A assinatura da empresa precisa ser regularizada.',
    });
  }

  private async readJwt(authorization?: string): Promise<JwtUser | null> {
    if (!authorization?.startsWith('Bearer ')) return null;
    try {
      return await this.jwt.verifyAsync<JwtUser>(authorization.slice(7));
    } catch {
      // Authentication guards remain responsible for rejecting invalid tokens.
      return null;
    }
  }
}
