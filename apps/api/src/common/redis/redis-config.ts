/** Conexão única do Redis: aceita REDIS_URL (redis://:senha@host:6379) ou REDIS_HOST/REDIS_PORT/REDIS_PASSWORD. */
export interface RedisConnection {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export function redisConnection(env: NodeJS.ProcessEnv = process.env): RedisConnection {
  if (env.REDIS_URL) {
    const url = new URL(env.REDIS_URL);
    const dbFromPath = Number(url.pathname.replace('/', ''));
    return {
      host: url.hostname,
      port: Number(url.port) || 6379,
      password: decodeURIComponent(url.password || '') || env.REDIS_PASSWORD || undefined,
      ...(Number.isInteger(dbFromPath) && dbFromPath > 0 ? { db: dbFromPath } : {}),
    };
  }
  return { host: env.REDIS_HOST || 'localhost', port: Number(env.REDIS_PORT) || 6379, password: env.REDIS_PASSWORD || undefined };
}
