import * as Sentry from '@sentry/node';

let enabled = false;

/** Liga o Sentry so se SENTRY_DSN estiver definido; sem DSN nada muda. */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV || process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
  });
  enabled = true;
}

export function reportError(error: unknown, context: { requestId?: string; method?: string; url?: string }) {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    scope.setTag('requestId', context.requestId ?? '');
    scope.setContext('request', { method: context.method, path: context.url?.split('?')[0] });
    Sentry.captureException(error);
  });
}