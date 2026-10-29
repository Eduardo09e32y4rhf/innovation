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
