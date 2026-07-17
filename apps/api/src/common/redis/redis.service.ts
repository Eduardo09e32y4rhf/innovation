import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: any;
  private isConnected = false;

  constructor() {
    const host = process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : (process.env.REDIS_HOST || 'localhost');
    const port = process.env.REDIS_URL ? parseInt(new URL(process.env.REDIS_URL).port || '6379') : parseInt(process.env.REDIS_PORT || '6379');
    this.client = new Redis({
      host,
      port,
      lazyConnect: true,
      enableAutoPipelining: true,
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
    });

    this.client.on('connect', () => {
      this.isConnected = true;
    });

    this.client.on('close', () => {
      this.isConnected = false;
    });

    this.client.on('error', (err: any) => {
      console.error('[Redis] Connection error:', err.message);
      this.isConnected = false;
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      this.isConnected = true;
      console.log('[Redis] Connected successfully');
    } catch (error) {
      this.isConnected = false;
      console.warn('[Redis] Not available — running without Redis cache:', error instanceof Error ? error.message : String(error));
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
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
    const result = await this.client.set(
      `lock:${lockKey}`,
      Date.now().toString(),
      'PX',
      ttlSeconds * 1000,
      'NX',
    );
    return result === 'OK';
  }

  /**
   * Release a distributed lock.
   */
  async releaseLock(lockKey: string): Promise<void> {
    if (!this.isConnected) return;
    await this.client.del(`lock:${lockKey}`);
  }

  /**
   * Get cached value
   */
  async get(key: string): Promise<string | null> {
    if (!this.isConnected) return null;
    return this.client.get(key);
  }

  /**
   * Set cached value with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected) return;
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Delete cache key
   */
  async del(key: string): Promise<void> {
    if (!this.isConnected) return;
    await this.client.del(key);
  }

  /**
   * Increment and get (for rate limiting)
   */
  async incr(key: string): Promise<number> {
    if (!this.isConnected) return 0;
    return this.client.incr(key);
  }

  /**
   * Set key expiry
   */
  async expire(key: string, seconds: number): Promise<void> {
    if (!this.isConnected) return;
    await this.client.expire(key, seconds);
  }
}