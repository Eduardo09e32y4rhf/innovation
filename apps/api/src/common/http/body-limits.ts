export const DEFAULT_BODY_LIMIT = 1_048_576;

// Rotas JSON que carregam base64: logo ~5M chars (dto MaxLength) e mídia WhatsApp de até 10 MB (+33% do base64).
export const ROUTE_BODY_LIMITS: ReadonlyArray<{ method: string; url: string; bytes: number }> = [
  { method: 'PATCH', url: '/companies/me', bytes: 6 * 1024 * 1024 },
  { method: 'POST', url: '/communication/messages/send', bytes: 14 * 1024 * 1024 },
];

interface RouteLike {
  method: string | string[];
  url: string;
  bodyLimit?: number;
}

interface HookTarget {
  addHook(name: 'onRoute', hook: (route: RouteLike) => void): unknown;
}

export function applyRouteBodyLimits(instance: HookTarget): void {
  instance.addHook('onRoute', (route) => {
    const methods = [route.method].flat().map((method) => String(method).toUpperCase());
    const rule = ROUTE_BODY_LIMITS.find((item) => item.url === route.url && methods.includes(item.method));
    if (rule) route.bodyLimit = rule.bytes;
  });
}
