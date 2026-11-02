import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TurnstileService } from './turnstile.service';

/** Exige o token do Turnstile (header `x-turnstile-token` ou corpo `turnstileToken`) quando TURNSTILE_SECRET_KEY existe. */
@Injectable()
export class TurnstileGuard implements CanActivate {
  constructor(private readonly turnstile: TurnstileService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.turnstile.isEnabled()) return true;
    const request = context.switchToHttp().getRequest();
    const header = request.headers?.['x-turnstile-token'];
    const fromBody = request.body && typeof request.body === 'object' ? request.body.turnstileToken : undefined;
    const token = (Array.isArray(header) ? header[0] : header) ?? fromBody;
    await this.turnstile.verify(typeof token === 'string' ? token : undefined, request.ip ? String(request.ip) : undefined);
    return true;
  }
}

/**
 * SEG-10 (rotas publicas de suporte): aceita o token SE enviado e o valida. Sem token passa, porque o formulario atual do
 * site ainda nao o envia; com TURNSTILE_PUBLIC_SUPPORT_REQUIRED=true passa a exigir (ligar so depois que o site enviar).
 */
@Injectable()
export class TurnstileOptionalGuard implements CanActivate {
  constructor(private readonly turnstile: TurnstileService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.turnstile.isEnabled()) return true;
    const request = context.switchToHttp().getRequest();
    const header = request.headers?.['x-turnstile-token'];
    const fromBody = request.body && typeof request.body === 'object' ? request.body.turnstileToken : undefined;
    const raw = (Array.isArray(header) ? header[0] : header) ?? fromBody;
    const token = typeof raw === 'string' && raw.trim() ? raw : undefined;
    if (!token && process.env.TURNSTILE_PUBLIC_SUPPORT_REQUIRED?.trim().toLowerCase() !== 'true') return true;
    await this.turnstile.verify(token, request.ip ? String(request.ip) : undefined);
    return true;
  }
}
