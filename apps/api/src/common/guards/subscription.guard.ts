import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import type { JwtUser } from '../types/auth.types';
import { SKIP_SUBSCRIPTION_CHECK_KEY } from '../decorators/skip-subscription-check.decorator';

@Injectable()
export class SubscriptionActiveGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipCheck = this.reflector.getAllAndOverride<boolean>(SKIP_SUBSCRIPTION_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtUser;

    if (!user || !user.companyId) {
      return true; // Let other guards handle unauthenticated users
    }

    const company = await this.prisma.company.findUnique({
      where: { id: user.companyId },
      select: { billingStatus: true },
    });

    if (!company) {
      return true;
    }

    if (company.billingStatus === 'PAST_DUE' || company.billingStatus === 'CANCELED') {
      // Return 402 Payment Required so the frontend knows exactly to redirect to billing
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message: 'O acesso está bloqueado por falta de pagamento. Regularize sua fatura para continuar.',
          code: 'SUBSCRIPTION_OVERDUE',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
