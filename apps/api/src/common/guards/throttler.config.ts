import type { ExecutionContext } from '@nestjs/common';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';

/** Nome do segundo limitador: conta requisicoes por IP (o `default` conta por conta/identificador). */
export const IP_THROTTLER = 'ip';
export const GLOBAL_LIMIT = 300;
export const GLOBAL_TTL_MS = 60_000;
/** Webhooks (Asaas, Mercado Pago): limite generoso por IP em vez de @SkipThrottle. */
export const WEBHOOK_LIMIT = 600;

const THROTTLER_LIMIT = 'THROTTLER:LIMIT';
const THROTTLER_TTL = 'THROTTLER:TTL';

function request(context: ExecutionContext): Record<string, any> {
  return context.switchToHttp().getRequest() ?? {};
}

export function isWebhookRequest(context: ExecutionContext): boolean {
  const req = request(context);
  const url = String(req.routeOptions?.url ?? req.routerPath ?? req.url ?? '');
  return /\/webhooks?(\/|$|\?)/.test(url);
}

/** Fluxos cuja credencial já é contada por e-mail ou token; o IP compartilhado não deve bloquear outras contas. */
export function isIdentityScopedRoute(req: Record<string, any>): boolean {
  const path = String(req.routeOptions?.url ?? req.routerPath ?? req.url ?? '').split('?')[0].replace(/^\/api(?=\/)/, '');
  const method = String(req.method ?? '').toUpperCase();
  if ((path.startsWith('/public/') && path.includes('/:token')) || path === '/commercial/email/trial-token/:token') return true;
  if (method === 'POST' && (
    /^\/auth\/(?:login|register-company|mfa\/verify|verify-email|password-reset\/(?:request|validate-code|confirm))$/.test(path)
    || /^\/candidate-portal\/auth\/(?:register|login|forgot-password|reset-password)$/.test(path)
    || /^\/public\/(?:candidate-requests(?:\/confirm)?|consents\/(?:confirm|revoke))$/.test(path)
    || /^\/public\/candidate-documents\/:token(?:\/(?:code|verify|upload))?$/.test(path)
  )) return true;
  return method === 'GET' && /^\/public\/(?:candidate-status|candidate-documents)\/:token$/.test(path);
}

export function isIdentityScopedRequest(context: ExecutionContext): boolean {
  const req = request(context);
  const body = req.body ?? {};
  const hasAccount = [body.email, body.username, body.document, body.cpf]
    .some((value) => typeof value === 'string' && value.trim());
  const hasCredential = [body.mfaToken, body.challengeToken, body.resetToken, body.verificationToken, body.token, req.params?.token, req.query?.token]
    .some((value) => typeof value === 'string' && value.trim());
  return isIdentityScopedRoute(req) && (hasAccount || hasCredential);
}

/** Rotas com sessão própria limitam por token; não bloqueiam outras pessoas no mesmo IP/NAT. */
export function isJwtGuarded(context: ExecutionContext): boolean {
  const guards = [
    ...((Reflect.getMetadata('__guards__', context.getHandler()) as any[]) ?? []),
    ...((Reflect.getMetadata('__guards__', context.getClass()) as any[]) ?? []),
  ];
  return guards.some((g) => g?.name === 'JwtAuthGuard' || g?.name === 'CandidateAuthGuard');
}

/** Multiplicador do limite por IP em relacao ao limite da rota (padrao 1 = igual ao da rota; aumente atras de NAT). */
export function ipFactor(): number {
  const n = Number(process.env.THROTTLE_IP_FACTOR);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function routeValue(context: ExecutionContext, key: string): number | undefined {
  const v = Reflect.getMetadata(`${key}default`, context.getHandler()) ?? Reflect.getMetadata(`${key}default`, context.getClass());
  return typeof v === 'number' ? v : undefined;
}

/**
 * Dois limitadores: `default` (por conta/identificador ou token, limites do @Throttle da rota) e `ip`
 * (rotas sem JwtAuthGuard/CandidateAuthGuard; usa o limite da rota x THROTTLE_IP_FACTOR).
 */
export function buildThrottlerOptions(storage?: any): ThrottlerModuleOptions {
  return {
    storage,
    throttlers: [
      { name: 'default', ttl: GLOBAL_TTL_MS, limit: GLOBAL_LIMIT, skipIf: (ctx) => isWebhookRequest(ctx) },
      {
        name: IP_THROTTLER,
        ttl: (ctx) => (isWebhookRequest(ctx) ? GLOBAL_TTL_MS : routeValue(ctx, THROTTLER_TTL) ?? GLOBAL_TTL_MS),
        limit: (ctx) => (isWebhookRequest(ctx) ? WEBHOOK_LIMIT : Math.ceil((routeValue(ctx, THROTTLER_LIMIT) ?? GLOBAL_LIMIT) * ipFactor())),
        getTracker: (req) => `ip:${req.ip || 'unknown'}`,
        skipIf: (ctx) => !isWebhookRequest(ctx) && (isJwtGuarded(ctx) || isIdentityScopedRequest(ctx)),
      },
    ],
  };
}
