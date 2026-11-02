import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageService } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import type { RedisService } from './redis.service';

/**
 * Armazenamento do Throttler no Redis: o limite sobrevive a reinicios e vale entre instancias.
 * Atomico (script Lua). Se o Redis cair, usa a memoria desta instancia (nunca "sem limite").
 */
const SCRIPT = `
local blockMs = redis.call('PTTL', KEYS[2])
if blockMs > 0 then
  local h = tonumber(redis.call('GET', KEYS[1]) or '0')
  local t = redis.call('PTTL', KEYS[1])
  return {h, t, 1, blockMs}
end
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); ttl = tonumber(ARGV[1]) end
if hits > tonumber(ARGV[2]) then
  redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
  return {hits, ttl, 1, tonumber(ARGV[3])}
end
return {hits, ttl, 0, 0}
`;

export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly memory = new ThrottlerStorageService();

  constructor(private readonly redis: Pick<RedisService, 'getClient' | 'getStatus'>) {}

  async increment(key: string, ttl: number, limit: number, blockDuration: number, throttlerName: string): Promise<ThrottlerStorageRecord> {
    if (this.redis.getStatus()) {
      try {
        const [hits, ttlMs, blocked, blockMs] = (await this.redis
          .getClient()
          .eval(SCRIPT, 2, `throttle:${key}`, `throttle:${key}:block`, String(ttl), String(limit), String(blockDuration))) as number[];
        return {
          totalHits: Number(hits),
          timeToExpire: Math.max(0, Math.ceil(Number(ttlMs) / 1000)),
          isBlocked: Number(blocked) === 1,
          timeToBlockExpire: Math.max(0, Math.ceil(Number(blockMs) / 1000)),
        };
      } catch {
        /* cai para a memoria abaixo */
      }
    }
    return this.memory.increment(key, ttl, limit, blockDuration, throttlerName);
  }

  onApplicationShutdown(): void {
    this.memory.onApplicationShutdown();
  }
}
