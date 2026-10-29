import { featureFlagProblems } from '../common/feature-flags';

/**
 * Variaveis OPCIONAIS (nunca exigidas, nem em producao) do Cloudflare Turnstile (captcha gratuito; ver docs/TURNSTILE.md):
 *  - TURNSTILE_SECRET_KEY: segredo do widget (API). Sem ela o captcha fica DESLIGADO e nada muda.
 *  - NEXT_PUBLIC_TURNSTILE_SITE_KEY: chave publica do widget (web, definida no build). Sem ela os formularios nao exibem o widget.
 */
export const OPTIONAL_TURNSTILE_ENV = ['TURNSTILE_SECRET_KEY', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'] as const;

const WEAK_JWT_MARKERS = ['TROQUE_', 'local-development', 'innovation-secret-key', 'changeme', 'secret'];

const PLACEHOLDER_MARKERS = ['troque_', 'token_seguro', 'sua_', 'your_', 'changeme', 'example'];

/** Retorna os problemas encontrados (lista vazia = ambiente seguro). Função pura, testável. */
export function productionEnvProblems(config: Record<string, unknown>): string[] {
  const problems: string[] = [];
  const text = (key: string) => String(config[key] ?? '').trim();

  if (!text('ALLOWED_ORIGINS')) problems.push('ALLOWED_ORIGINS is required in production.');

  const jwt = text('JWT_SECRET');
  if (jwt.length < 32 || WEAK_JWT_MARKERS.some((marker) => jwt.toLowerCase().includes(marker.toLowerCase()))) {
    problems.push('JWT_SECRET must be a strong production secret with at least 32 characters (use openssl rand -hex 32).');
  }

  const kms = text('KMS_MASTER_KEY');
  if (!/^[0-9a-fA-F]{64}$/.test(kms)) problems.push('KMS_MASTER_KEY must be 64 hex characters (openssl rand -hex 32).');
  else if (kms === jwt) problems.push('KMS_MASTER_KEY must differ from JWT_SECRET.');

  const databaseUrl = text('DATABASE_URL');
  const isLocalDatabase = /@(localhost|127\.0\.0\.1|postgres|db|pgbouncer|innovation-postgres)(:|\/)/.test(databaseUrl);
  if (databaseUrl.startsWith('postgres')) {
    if (!isLocalDatabase && !/sslmode=(require|verify-ca|verify-full)/i.test(databaseUrl)) {
      problems.push('Production DATABASE_URL for remote PostgreSQL must require SSL (sslmode=require or stronger).');
    }
    const password = /:\/\/[^:]+:([^@]*)@/.exec(databaseUrl)?.[1] ?? '';
    if (password.length < 16 || ['innovation', 'postgres', 'password', 'changeme'].includes(decodeURIComponent(password).toLowerCase())) {
      problems.push('DATABASE_URL uses a weak or default database password (minimum 16 characters).');
    }
  }

  const redisUrl = text('REDIS_URL');
  if (redisUrl && !/^rediss?:\/\/[^@/]*:[^@]+@/.test(redisUrl) && !text('REDIS_PASSWORD')) {
    problems.push('Redis must require a password in production (REDIS_URL=redis://:password@host:6379 or REDIS_PASSWORD).');
  }

  // Segredos de webhook/métricas são obrigatórios em produção, independentemente do provedor configurado.
  const required = (key: string, minLength: number) => {
    const value = text(key);
    if (!value) problems.push(`${key} is required in production.`);
    else if (value.length < minLength || PLACEHOLDER_MARKERS.some((m) => value.toLowerCase().includes(m))) {
      problems.push(`${key} must be a real secret with at least ${minLength} characters (not an example value).`);
    }
  };
  required('METRICS_TOKEN', 16);
  if (!text('ASAAS_WEBHOOK_TOKEN') && text('ASAAS_WEBHOOK_SECRET')) required('ASAAS_WEBHOOK_SECRET', 32);
  else required('ASAAS_WEBHOOK_TOKEN', 32);
  required('MERCADOPAGO_WEBHOOK_SECRET', 16);
  return problems;
}

export function validateEnv(config: Record<string, unknown>) {
  if (!config.JWT_SECRET && config.SECRET_KEY) {
    config.JWT_SECRET = config.SECRET_KEY;
  }
  if (!config.JWT_SECRET && process.env.NODE_ENV !== 'production') {
    config.JWT_SECRET = 'innovation-rh-connect-local-development-secret';
  }

  for (const key of ['DATABASE_URL', 'JWT_SECRET']) {
    if (!config[key]) throw new Error(`Missing required environment variable: ${key}`);
  }

  const flagProblems = featureFlagProblems(config);
  if (flagProblems.length) throw new Error(`Invalid feature flags:\n - ${flagProblems.join('\n - ')}`);

  if (process.env.NODE_ENV === 'production') {
    const problems = productionEnvProblems(config);
    if (problems.length) {
      throw new Error(`Insecure production configuration:\n - ${problems.join('\n - ')}`);
    }
  }

  return config;
}
