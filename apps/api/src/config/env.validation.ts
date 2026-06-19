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

    const jwtSecret = String(config.JWT_SECRET ?? '');
    if (jwtSecret.length < 32 || jwtSecret.startsWith('TROQUE_') || jwtSecret.includes('local-development')) {
      throw new Error('JWT_SECRET must be a strong production secret with at least 32 characters.');
    }
  }

  return config;
}