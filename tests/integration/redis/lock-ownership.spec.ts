import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { RedisService } from '../../../apps/api/src/common/redis/redis.service';
import { redisConnection } from '../../../apps/api/src/common/redis/redis-config';

describe('Locks com Redis real', () => {
  const replicas = [new RedisService(), new RedisService()];
  const key = `integration:${randomUUID()}`;
  beforeAll(async () => {
    if (!['localhost', '127.0.0.1'].includes(redisConnection().host)) throw new Error('Redis local de testes obrigatório.');
    await Promise.all(replicas.map(replica => replica.getClient().connect()));
  });
  afterAll(async () => {
    if (replicas[0].getStatus()) await replicas[0].getClient().del(`lock:${key}`);
    await Promise.all(replicas.map(replica => replica.onModuleDestroy()));
  });

  it('20 aquisições concedem um token, e proprietário expirado não remove sucessor', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => replicas[i % 2].acquireLock(key, 10)));
    expect(results.filter(Boolean)).toHaveLength(1);
    const oldToken = results.find(Boolean)!;
    const ttl = await replicas[0].getClient().pttl(`lock:${key}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(10000);
    // Expire immediately to deterministically exercise a stale in-flight owner.
    await replicas[0].getClient().pexpire(`lock:${key}`, 0);
    const newToken = (await replicas[1].acquireLock(key, 10))!;
    expect(newToken).toBeTruthy();
    expect(newToken).not.toBe(oldToken);
    await replicas[0].releaseLock(key, oldToken);
    expect(await replicas[0].getClient().get(`lock:${key}`)).toBe(newToken);
    await replicas[1].releaseLock(key, newToken);
    expect(await replicas[0].getClient().get(`lock:${key}`)).toBeNull();
  });
});
