export function validateEnv(config: Record<string, unknown>) {
  if (!config.JWT_SECRET && config.SECRET_KEY) {
    config.JWT_SECRET = config.SECRET_KEY;
  }
  if (!config.JWT_SECRET && process.env.NODE_ENV !== 'production') {
    config.JWT_SECRET = 'innovation-rh-connect-local-development-secret';
  }

  const required = ['DATABASE_URL', 'JWT_SECRET'];
  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  if (process.env.NODE_ENV === 'production') {
    if (!config.ALLOWED_ORIGINS) {
      throw new Error('ALLOWED_ORIGINS is required in production.');
    }
    // if (!config.ASAAS_WEBHOOK_SECRET) {
    //   throw new Error('ASAAS_WEBHOOK_SECRET is required in production.');
    // }

    const jwtSecret = String(config.JWT_SECRET ?? '');
    if (jwtSecret.length < 32 || jwtSecret.startsWith('TROQUE_') || jwtSecret.includes('local-development')) {
      throw new Error('JWT_SECRET must be a strong production secret with at least 32 characters.');
    }

    const databaseUrl = String(config.DATABASE_URL ?? '');
    const isLocalDatabase = /@(localhost|127\.0\.0\.1|postgres|db|pgbouncer|innovation-postgres)(:|\/)/i.test(databaseUrl);
    if (databaseUrl.startsWith('postgres') && !isLocalDatabase && !/sslmode=(require|verify-ca|verify-full)/i.test(databaseUrl)) {
      throw new Error('Production DATABASE_URL for remote PostgreSQL must require SSL. Add sslmode=require or stronger.');
    }
  }

  return config;
}