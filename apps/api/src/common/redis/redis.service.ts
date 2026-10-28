import { Injectable, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { redisConnection } from './redis-config';
import { setCronLockRedis } from './cron-lock.decorator';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: any;
  private isConnected = false;

  constructor() {
    this.client = new Redis({
      ...redisConnection(),
      lazyConnect: true,
      enableAutoPipelining: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      commandTimeout: 1500,
      // Nunca desiste: o Redis e opcional, mas a API precisa voltar a usa-lo sozinha quando ele reaparecer.
      retryStrategy: (times: number) => Math.min(times * 200, 5000),
    });

    this.client.on('ready', () => {
      if (!this.isConnected) console.log('[Redis] Connected successfully');
      this.isConnected = true;
      this.outageLogged = false;
    });

    this.client.on('close', () => {
      this.isConnected = false;
    });

    this.client.on('error', (err: any) => {
      // Um aviso por queda, nao um por tentativa de reconexao.
      if (this.isConnected || !this.outageLogged) console.error('[Redis] Connection error:', err.message);
      this.outageLogged = true;
      this.isConnected = false;
    });
  }

  private outageLogged = false;

  onModuleInit() {
    setCronLockRedis(this);
    // Nao aguardar: com Redis fora no boot a API sobe degradada e conecta quando ele voltar.
    this.client.connect().catch((error: unknown) => {
      console.warn('[Redis] Not available — running without Redis cache:', error instanceof Error ? error.message : String(error));
    });
  }

  async onModuleDestroy() {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }

  getClient(): any {
    return this.client;
  }

  getStatus(): boolean {
    return this.isConnected;
  }

  /** A unique token belongs to one acquisition, never to the process or resource. */
  async acquireLock(lockKey: string, ttlSeconds = 10): Promise<string | null> {
    if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0 || !Number.isSafeInteger(ttlSeconds * 1000)) {
      throw new RangeError('Lock TTL must be a positive number of milliseconds.');
    }
    if (!this.isConnected) throw new ServiceUnavailableException('Coordenação temporariamente indisponível.');
    const token = randomUUID();
    try {
      const result = await this.client.set(`lock:${lockKey}`, token, 'PX', ttlSeconds * 1000, 'NX');
      return result === 'OK' ? token : null;
    } catch {
      throw new ServiceUnavailableException('Coordenação temporariamente indisponível.');
    }
  }

  /** Compare and delete in Redis: an expired owner cannot remove its successor's lock. */
  async releaseLock(lockKey: string, token: string): Promise<void> {
    if (!this.isConnected || !token) return;
    await this.client.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1, `lock:${lockKey}`, token,
    ).catch(() => undefined);
  }

  /**
   * Get cached value
   */
  async get(key: string): Promise<string | null> {
    if (!this.isConnected) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  /**
   * Set cached value with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected) return;
    try {
      if (ttlSeconds) await this.client.setex(key, ttlSeconds, value);
      else await this.client.set(key, value);
    } catch {
      /* cache e opcional */
    }
  }

  /**
   * Delete cache key
   */
  async del(key: string): Promise<void> {
    if (!this.isConnected) return;
    await this.client.del(key).catch(() => undefined);
  }

  /**
   * Increment and get (for rate limiting)
   */
  async incr(key: string): Promise<number> {
    if (!this.isConnected) return 0;
    try {
      return await this.client.incr(key);
    } catch {
      return 0;
    }
  }

  /**
   * Set key expiry
   */
  async expire(key: string, seconds: number): Promise<void> {
    if (!this.isConnected) return;
    await this.client.expire(key, seconds).catch(() => undefined);
  }
}