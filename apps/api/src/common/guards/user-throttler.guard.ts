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

    const auth = String(req.headers?.authorization ?? '');
    if (auth.startsWith('Bearer ')) {
      return `tok:${createHash('sha256').update(auth.slice(7)).digest('hex').slice(0, 24)}`;
    }

    const refresh = req.cookies?.refresh_token ?? req.cookies?.rt;
    if (refresh) return `ref:${createHash('sha256').update(String(refresh)).digest('hex').slice(0, 24)}`;

    return `ip:${ip}`;
  }

  protected async shouldSkip(_context: ExecutionContext): Promise<boolean> {
    return false;
  }

  // req.ip is resolved by Fastify honoring only TRUST_PROXY hops; raw client headers are spoofable.
  private clientIp(req: Record<string, any>): string {
    return req.ip || 'unknown';
  }
}
