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

/** Rota protegida por JwtAuthGuard (classe ou metodo): ali o limite por IP prejudicaria empresas atras de NAT. */
export function isJwtGuarded(context: ExecutionContext): boolean {
  const guards = [
    ...((Reflect.getMetadata('__guards__', context.getHandler()) as any[]) ?? []),
    ...((Reflect.getMetadata('__guards__', context.getClass()) as any[]) ?? []),
  ];
  return guards.some((g) => g?.name === 'JwtAuthGuard');
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
 * (so rotas sem JwtAuthGuard; usa o limite do @Throttle da rota x THROTTLE_IP_FACTOR, ou o global).
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
        skipIf: (ctx) => !isWebhookRequest(ctx) && isJwtGuarded(ctx),
      },
    ],
  };
}
