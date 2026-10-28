import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RedisService } from './redis.service';

function serviceWithClient(client: any, connected = true): RedisService {
  const service = new RedisService();
  (service as any).client.disconnect();
  (service as any).client = client;
  (service as any).isConnected = connected;
  return service;
}

/** In-memory protocol double shared by replicas; the Lua compare/delete is exercised against real Redis in integration. */
function lockClient(locks = new Map<string, string>()) {
  return {
    locks,
    set: vi.fn(async (key: string, value: string) => {
      if (locks.has(key)) return null;
      locks.set(key, value);
      return 'OK';
    }),
    eval: vi.fn(async (_script: string, _keys: number, key: string, token: string) => {
      if (locks.get(key) !== token) return 0;
      locks.delete(key);
      return 1;
    }),
  };
}

describe('RedisService: cache opcional, coordenação obrigatória', () => {
  it('cache degrada em erro, mas lock não é concedido', async () => {
    const boom = () => Promise.reject(new Error('Command timed out'));
    const service = serviceWithClient({ set: boom, get: boom, setex: boom, del: boom, incr: boom, expire: boom, eval: boom });
    await expect(service.get('k')).resolves.toBeNull();
    await expect(service.set('k', 'v', 10)).resolves.toBeUndefined();
    await expect(service.set('k', 'v')).resolves.toBeUndefined();
    await expect(service.del('k')).resolves.toBeUndefined();
    await expect(service.incr('k')).resolves.toBe(0);
    await expect(service.expire('k', 5)).resolves.toBeUndefined();
    await expect(service.acquireLock('cron:x', 5)).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.releaseLock('cron:x', 'token')).resolves.toBeUndefined();
  });

  it('Redis desconectado recusa todas as aquisições concorrentes sem tocar no cliente', async () => {
    const client = lockClient();
    const service = serviceWithClient(client, false);
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => service.acquireLock('x')));
    expect(results.every((result) => result.status === 'rejected')).toBe(true);
    expect(client.set).not.toHaveBeenCalled();
  });

  it('20 chamadas em duas réplicas concedem um token e mantêm TTL/NX', async () => {
    const client = lockClient();
    const replicas = [serviceWithClient(client), serviceWithClient(client)];
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => replicas[i % 2].acquireLock('x', 5)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.find(Boolean)).toMatch(/^[0-9a-f-]{36}$/);
    expect(client.set).toHaveBeenCalledWith('lock:x', results.find(Boolean), 'PX', 5000, 'NX');
  });

  it('execução antiga na mesma instância ou em outra não apaga lock sucessor após expirar', async () => {
    const client = lockClient();
    const first = serviceWithClient(client);
    const second = serviceWithClient(client);
    const oldToken = (await first.acquireLock('x'))!;
    client.locks.delete('lock:x'); // expiration
    const newToken = (await second.acquireLock('x'))!;
    expect(newToken).not.toBe(oldToken);
    await first.releaseLock('x', oldToken);
    expect(client.locks.get('lock:x')).toBe(newToken);
    await second.releaseLock('x', newToken);
    expect(client.locks.has('lock:x')).toBe(false);
  });

  it.each([0, -1, NaN, Infinity])('TTL inválido %s não cria lock', async (ttl) => {
    const client = lockClient();
    await expect(serviceWithClient(client).acquireLock('x', ttl)).rejects.toBeInstanceOf(RangeError);
    expect(client.set).not.toHaveBeenCalled();
  });

  it('a estratégia de reconexão limita o intervalo a 5s', () => {
    const service = new RedisService();
    const strategy = (service as any).client.options.retryStrategy;
    (service as any).client.disconnect();
    expect(strategy(1)).toBe(200);
    expect(strategy(6)).toBe(1200);
    for (const n of [50, 500, 5000]) expect(strategy(n)).toBe(5000);
  });
});
