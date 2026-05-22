import { CanActivate, ExecutionContext, Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

const DEMO_TOKEN = 'demo-token-innovation-ia-2025';
const LOCAL_SESSION_TOKEN = 'innovation-local-whatsapp-session';
const LOCAL_COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_PAYLOAD = {
  sub: '00000000-0000-0000-0000-000000000001',
  email: 'admin@innovation.ia',
  companyId: '00000000-0000-0000-0000-000000000001',
  role: 'ADMIN',
};
const LOCAL_PAYLOAD = {
  sub: LOCAL_COMPANY_ID,
  email: 'local@innovation.ia',
  companyId: LOCAL_COMPANY_ID,
  role: 'ADMIN',
};

function isDemoTokenEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEMO_TOKEN === 'true';
}

function isLocalSessionEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.ENABLE_LOCAL_SESSION === 'true';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Optional() private readonly jwtService?: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Missing bearer token');

    if (isDemoTokenEnabled() && token === DEMO_TOKEN) {
      request.user = DEMO_PAYLOAD;
      return true;
    }

    if (isLocalSessionEnabled() && token === LOCAL_SESSION_TOKEN) {
      request.user = LOCAL_PAYLOAD;
      return true;
    }

    if (!this.jwtService) throw new UnauthorizedException('JWT service is not available');

    try {
      request.user = await this.jwtService.verifyAsync(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
