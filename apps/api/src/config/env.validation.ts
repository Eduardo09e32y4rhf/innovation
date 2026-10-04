const WEAK_JWT_MARKERS = ['TROQUE_', 'local-development', 'innovation-secret-key', 'changeme', 'secret'];

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

  // Provedores de pagamento: só exigimos o segredo do webhook de quem está configurado.
  if (text('ASAAS_API_KEY') && !(text('ASAAS_WEBHOOK_TOKEN') || text('ASAAS_WEBHOOK_SECRET'))) {
    problems.push('ASAAS_WEBHOOK_TOKEN is required when ASAAS_API_KEY is set.');
  }
  if (text('ASAAS_WEBHOOK_TOKEN') && text('ASAAS_WEBHOOK_TOKEN').length < 32) problems.push('ASAAS_WEBHOOK_TOKEN must have at least 32 characters.');
  if (text('MERCADOPAGO_ACCESS_TOKEN') && !text('MERCADOPAGO_WEBHOOK_SECRET')) {
    problems.push('MERCADOPAGO_WEBHOOK_SECRET is required when MERCADOPAGO_ACCESS_TOKEN is set.');
  }
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

  if (process.env.NODE_ENV === 'production') {
    const problems = productionEnvProblems(config);
    if (problems.length) {
      throw new Error(`Insecure production configuration:\n - ${problems.join('\n - ')}`);
    }
  }

  return config;
}
