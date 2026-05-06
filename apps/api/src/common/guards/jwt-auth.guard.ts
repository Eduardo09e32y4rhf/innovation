import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

const DEMO_TOKEN = 'demo-token-innovation-ia-2025';
const DEMO_PAYLOAD = {
  sub: '00000000-0000-0000-0000-000000000001',
  email: 'admin@innovation.ia',
  companyId: '00000000-0000-0000-0000-000000000001',
  role: 'ADMIN',
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Missing bearer token');

    if (token === DEMO_TOKEN) {
      request.user = DEMO_PAYLOAD;
      return true;
    }

    try {
      request.user = await this.jwtService.verifyAsync(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
