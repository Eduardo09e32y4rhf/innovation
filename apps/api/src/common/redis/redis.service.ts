import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
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

  /**
   * Acquire a distributed lock for a resource.
   * Returns true if lock was acquired, false otherwise.
   */
  async acquireLock(lockKey: string, ttlSeconds = 10): Promise<boolean> {
    if (!this.isConnected) return true; // fallback: allow if Redis is down
    try {
      const result = await this.client.set(`lock:${lockKey}`, Date.now().toString(), 'PX', ttlSeconds * 1000, 'NX');
      return result === 'OK';
    } catch {
      return true;
    }
  }

  /**
   * Release a distributed lock.
   */
  async releaseLock(lockKey: string): Promise<void> {
    if (!this.isConnected) return;
    await this.client.del(`lock:${lockKey}`).catch(() => undefined);
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