import { createHash } from 'node:crypto';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Limita por usuario (e nao so por IP). Quando o sistema roda atras de proxy/Next,
 * todos os usuarios chegam com o mesmo IP e um unico usuario errando a senha
 * bloqueava a empresa inteira.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const body = req.body ?? {};
    const email = String(body.email ?? body.username ?? '').trim().toLowerCase();
    const document = String(body.document ?? body.cpf ?? '').replace(/\D/g, '');
    const ip = this.clientIp(req);

    if (email) return `email:${email}`;
    if (document) return `doc:${document}`;
    // Corpo de login inválido não deve consumir o contador compartilhado com logins válidos do mesmo IP.
    const path = String(req.routeOptions?.url ?? req.routerPath ?? req.url ?? '').split('?')[0];
    if (String(req.method ?? '').toUpperCase() === 'POST' && /(?:^|\/)auth\/login$/.test(path)) return `login:missing:${ip}`;

    const auth = String(req.headers?.authorization ?? '');
    if (auth.startsWith('Bearer ')) {
      return `tok:${createHash('sha256').update(auth.slice(7)).digest('hex').slice(0, 24)}`;
    }

    const refresh = req.cookies?.refresh_token ?? req.cookies?.rt;
    if (refresh) return `ref:${createHash('sha256').update(String(refresh)).digest('hex').slice(0, 24)}`;

    return `ip:${ip}`;
  }

  // O limitador `ip` (throttler.config.ts) usa req.ip; este tracker serve ao limitador por conta.
  protected async shouldSkip(_context: ExecutionContext): Promise<boolean> {
    return false;
  }

  // req.ip is resolved by Fastify honoring only TRUST_PROXY hops; raw client headers are spoofable.
  private clientIp(req: Record<string, any>): string {
    return req.ip || 'unknown';
  }
}
