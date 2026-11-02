import { describe, expect, it, vi } from 'vitest';
import { RedisService } from './redis.service';

// Cliente falso que sempre rejeita, como um Redis que caiu no meio da chamada.
function serviceWithBrokenClient(): RedisService {
  const svc = new RedisService();
  const boom = () => Promise.reject(new Error('Command timed out'));
  (svc as any).client.disconnect();
  (svc as any).client = { set: boom, get: boom, setex: boom, del: boom, incr: boom, expire: boom };
  (svc as any).isConnected = true;
  return svc;
}

describe('RedisService degradado (INF-03: sem Redis usa memoria, nunca libera tudo)', () => {
  it('erro de comando nao propaga: cache vazio, lock liberado, contador 0', async () => {
    const svc = serviceWithBrokenClient();
    await expect(svc.get('k')).resolves.toBeNull();
    await expect(svc.set('k', 'v', 10)).resolves.toBeUndefined();
    await expect(svc.set('k', 'v')).resolves.toBeUndefined();
    await expect(svc.del('k')).resolves.toBeUndefined();
    // INF-03: contador cai para memoria (nunca 0) e lock cai para instancia unica.
    await expect(svc.incr('k')).resolves.toBe(1);
    await expect(svc.incr('k')).resolves.toBe(2);
    await expect(svc.expire('k', 5)).resolves.toBeUndefined();
    await expect(svc.acquireLock('cron:x', 5)).resolves.toBe(true);
    await expect(svc.acquireLock('cron:x', 5)).resolves.toBe(false);
    await expect(svc.releaseLock('cron:x')).resolves.toBeUndefined();
    await expect(svc.acquireLock('cron:x', 5)).resolves.toBe(true);
  });

  it('desconectado: tudo vira no-op sem tocar no cliente', async () => {
    const svc = new RedisService();
    (svc as any).client.disconnect();
    (svc as any).isConnected = false;
    await expect(svc.get('k')).resolves.toBeNull();
    await expect(svc.incr('k')).resolves.toBe(1);
    await expect(svc.incr('k')).resolves.toBe(2);
    await expect(svc.acquireLock('x')).resolves.toBe(true);
    await expect(svc.acquireLock('x')).resolves.toBe(false);
  });

  it('INF-03: contador em memoria expira junto com expire() e o alerta e logado uma vez', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const svc = new RedisService();
    (svc as any).client.disconnect();
    (svc as any).isConnected = false;
    expect(await svc.incr('w')).toBe(1);
    await svc.expire('w', 10);
    expect(await svc.incr('w')).toBe(2);
    vi.advanceTimersByTime(11_000);
    expect(await svc.incr('w')).toBe(1);
    expect(await svc.acquireLock('l', 5)).toBe(true);
    vi.advanceTimersByTime(6_000);
    expect(await svc.acquireLock('l', 5)).toBe(true);
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('[Redis] ALERTA')).length).toBe(1);
    warn.mockRestore();
    vi.useRealTimers();
  });

  it('a estrategia de reconexao nunca desiste e limita o intervalo a 5s', () => {
    const svc = new RedisService();
    const strategy = (svc as any).client.options.retryStrategy as (n: number) => number | null;
    (svc as any).client.disconnect();
    expect(strategy(1)).toBe(200);
    expect(strategy(6)).toBe(1200);
    for (const n of [50, 500, 5000]) expect(strategy(n)).toBe(5000);
  });
});
