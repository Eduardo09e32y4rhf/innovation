import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Tokens de desenvolvimento local (desabilitados em producao)
const DEMO_TOKEN = 'demo-token-innovation-rh-connect-2026';
const LOCAL_SESSION_TOKEN = 'innovation-rh-connect-local-session';
const LOCAL_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

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
  // O AuthModule agora e @Global(), entao JwtService e sempre injetavel.
  // Sem @Optional: se o JwtService sumir, o erro explode na inicializacao (facil de diagnosticar).
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) throw new UnauthorizedException('Token nao informado');

    // Tokens de atalho para desenvolvimento local
    if (isDemoEnabled() && token === process.env.DEMO_TOKEN) {
      request.user = DEMO_PAYLOAD;
      return true;
    }
    if (isLocalEnabled() && token === LOCAL_SESSION_TOKEN) {
      request.user = LOCAL_PAYLOAD;
      return true;
    }

    try {
      request.user = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
      return true;
    } catch {
      throw new UnauthorizedException('Token invalido ou expirado');
    }
  }
}
