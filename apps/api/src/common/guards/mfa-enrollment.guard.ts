import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtUser } from '../types/auth.types';

/** Rotas que continuam abertas enquanto o MFA não foi configurado (para conseguir configurá-lo e sair). */
const ALLOWED_PREFIXES = ['/auth/', '/health'];

/**
 * Perfis de plataforma (DEV, CEO, CONTABIL, COMERCIAL) sem MFA recebem um token com `mfaPending`.
 * Com esse token, qualquer rota fora de /auth/* responde 403 MFA_ENROLLMENT_REQUIRED até a configuração ser concluída.
 */
@Injectable()
export class MfaEnrollmentGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers?.authorization as string | undefined;
    if (!header?.startsWith('Bearer ')) return true;
    const path = String(request.url || request.raw?.url || '');
    if (ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
    try {
      const payload = await this.jwt.verifyAsync<JwtUser>(header.slice(7));
      if (payload?.mfaPending) {
        throw new ForbiddenException({ code: 'MFA_ENROLLMENT_REQUIRED', message: 'Configure a autenticação em duas etapas para continuar.' });
      }
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      // Token inválido: o JwtAuthGuard responde 401.
    }
    return true;
  }
}
