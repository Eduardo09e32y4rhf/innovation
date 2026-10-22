import { describe, expect, it, vi } from 'vitest';
import { createSingleFlight, mutationFlightKey, newIdempotencyKey } from '../../../apps/web/app/lib/single-flight';

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('single-flight (duplo clique)', () => {
  it('5 cliques no mesmo tick executam a ação 1 vez e todos recebem o mesmo resultado', async () => {
    const flight = createSingleFlight();
    const d = deferred<string>();
    const action = vi.fn(() => d.promise);
    const calls = Array.from({ length: 5 }, () => flight.run('salvar', action));
    expect(action).toHaveBeenCalledTimes(1);
    d.resolve('ok');
    await expect(Promise.all(calls)).resolves.toEqual(['ok', 'ok', 'ok', 'ok', 'ok']);
  });

  it('libera a chave depois de concluir: um novo clique executa de novo', async () => {
    const flight = createSingleFlight();
    const action = vi.fn(async () => 'ok');
    await flight.run('k', action);
    expect(flight.isRunning('k')).toBe(false);
    await flight.run('k', action);
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('libera a chave quando a ação falha, e todos os cliques simultâneos recebem o mesmo erro', async () => {
    const flight = createSingleFlight();
    const d = deferred<string>();
    const action = vi.fn(() => d.promise);
    const a = flight.run('k', action);
    const b = flight.run('k', action);
    d.reject(new Error('falhou'));
    await expect(a).rejects.toThrow('falhou');
    await expect(b).rejects.toThrow('falhou');
    expect(action).toHaveBeenCalledTimes(1);
    expect(flight.size).toBe(0);
    await expect(flight.run('k', async () => 'de novo')).resolves.toBe('de novo');
  });

  it('erro síncrono na ação não deixa a chave presa', async () => {
    const flight = createSingleFlight();
    await expect(flight.run('k', () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(flight.isRunning('k')).toBe(false);
    await expect(flight.run('k', async () => 'ok')).resolves.toBe('ok');
  });

  it('chaves diferentes não se bloqueiam', async () => {
    const flight = createSingleFlight();
    const action = vi.fn(async () => 'ok');
    await Promise.all([flight.run('a', action), flight.run('b', action)]);
    expect(action).toHaveBeenCalledTimes(2);
  });
});

describe('chave de mutação HTTP', () => {
  it('só deduplica POST/PUT/PATCH/DELETE', () => {
    expect(mutationFlightKey('GET', '/employees', undefined)).toBeNull();
    expect(mutationFlightKey(undefined, '/employees', undefined)).toBeNull();
    expect(mutationFlightKey('POST', '/employees', { a: 1 })).toBe('POST /employees {"a":1}');
    expect(mutationFlightKey('delete', '/employees/1', undefined)).toBe('DELETE /employees/1 ');
  });

  it('corpos diferentes geram chaves diferentes (duas ações distintas não se confundem)', () => {
    expect(mutationFlightKey('POST', '/x', { a: 1 })).not.toBe(mutationFlightKey('POST', '/x', { a: 2 }));
  });

  it('upload (FormData) e corpo circular não são deduplicados', () => {
    expect(mutationFlightKey('POST', '/upload', new FormData())).toBeNull();
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(mutationFlightKey('POST', '/x', circular)).toBeNull();
  });
});

describe('Idempotency-Key', () => {
  it('gera chaves únicas e não vazias', () => {
    const keys = new Set(Array.from({ length: 200 }, () => newIdempotencyKey()));
    expect(keys.size).toBe(200);
    for (const k of keys) expect(k.length).toBeGreaterThanOrEqual(16);
  });
});
