import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller';

const make = (query: () => Promise<unknown>, redisUp = true) =>
  new HealthController({ $queryRaw: query } as never, { getStatus: () => redisUp } as never);

describe('HealthController', () => {
  it('live nao depende de banco nem Redis', () => {
    const query = vi.fn();
    expect(make(query, false).live().status).toBe('ok');
    expect(query).not.toHaveBeenCalled();
  });

  it('ready: banco ok -> 200, Redis fora e apenas degradado', async () => {
    const res = await make(async () => 1, false).ready();
    expect(res).toMatchObject({ status: 'ok', redis: { status: 'degraded (optional)' } });
  });

  it('ready: banco fora -> 503', async () => {
    const err = await make(async () => { throw new Error('ECONNREFUSED'); }).ready().catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(503);
  });

  it('banco pendurado nao pendura o health: responde 503 em ~2s', async () => {
    vi.useFakeTimers();
    const pending = make(() => new Promise(() => undefined)).check().catch((e) => e);
    await vi.advanceTimersByTimeAsync(2100);
    const err = await pending;
    vi.useRealTimers();
    expect((err as HttpException).getStatus()).toBe(503);
  });
});
