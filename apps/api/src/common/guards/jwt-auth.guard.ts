import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';

const DEMO_TOKEN = 'demo-token-innovation-rh-connect-2026';
const LOCAL_SESSION_TOKEN = 'innovation-rh-connect-local-session';
const LOCAL_COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const PLATFORM_OWNER_EMAIL = 'eduardo998468@gmail.com';
const SESSION_DENIED_MESSAGE = 'Nao foi possivel entrar';
const PASSWORD_MAX_AGE_DAYS = 30;

const DEMO_PAYLOAD = {
  sub: '00000000-0000-0000-0000-000000000001',
  email: 'admin@innovationrhconnect.com',
  companyId: '00000000-0000-0000-0000-000000000001',
  role: 'ADMIN',
};
const LOCAL_PAYLOAD = {
  sub: LOCAL_COMPANY_ID,
  email: 'local@innovationrhconnect.com',
  companyId: LOCAL_COMPANY_ID,
  role: 'ADMIN',
};

function isDemoEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEMO_TOKEN === 'true' && Boolean(process.env.DEMO_TOKEN);
}
function isLocalEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.ENABLE_LOCAL_SESSION === 'true';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const path = String(request.route?.path ?? request.url ?? '');
    const isPasswordChangeRoute = path.includes('change-password');
    const isMeRoute = path.endsWith('/me') || path === 'me';

    if (!token) throw new UnauthorizedException('Token nao informado');

    if (isDemoEnabled() && token === process.env.DEMO_TOKEN) {
      request.user = DEMO_PAYLOAD;
      return true;
    }
    if (isLocalEnabled() && token === LOCAL_SESSION_TOKEN) {
      request.user = LOCAL_PAYLOAD;
      return true;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, { secret: process.env.JWT_SECRET });
      const freshUser = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { company: true },
      });
      if (!freshUser || !freshUser.isActive) throw new UnauthorizedException(SESSION_DENIED_MESSAGE);

      const role = freshUser.email.toLowerCase() === PLATFORM_OWNER_EMAIL ? 'DEV' : freshUser.role;
      const companyActive = freshUser.company?.isActive && (freshUser.company.status ?? 'ACTIVE') === 'ACTIVE';
      if (role !== 'DEV' && !companyActive) throw new UnauthorizedException(SESSION_DENIED_MESSAGE);

      const changedAt = freshUser.passwordChangedAt ? new Date(freshUser.passwordChangedAt).getTime() : 0;
      const passwordExpired =
        freshUser.forcePasswordChange || !changedAt || Date.now() - changedAt >= PASSWORD_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
      if (passwordExpired && !isPasswordChangeRoute && !isMeRoute) throw new UnauthorizedException(SESSION_DENIED_MESSAGE);

      request.user = {
        sub: freshUser.id,
        email: freshUser.email,
        name: freshUser.name,
        companyId: freshUser.companyId,
        role,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Token invalido ou expirado');
    }
  }
}
