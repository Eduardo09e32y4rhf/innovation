/**
 * Trava síncrona de "voo único": enquanto a primeira execução de uma chave não termina,
 * as demais devolvem a MESMA promessa em vez de chamar a função de novo.
 * É síncrona de propósito (Map, não estado do React): dois cliques no mesmo tick
 * chegam antes de qualquer re-render e um `disabled` baseado em estado não os impede.
 */
export interface SingleFlight {
  run<T>(key: string, fn: () => Promise<T>): Promise<T>;
  isRunning(key: string): boolean;
  readonly size: number;
}

export function createSingleFlight(): SingleFlight {
  const running = new Map<string, Promise<unknown>>();
  return {
    run<T>(key: string, fn: () => Promise<T>): Promise<T> {
      const current = running.get(key);
      if (current) return current as Promise<T>;
      let promise: Promise<T>;
      try {
        promise = Promise.resolve(fn());
      } catch (err) {
        return Promise.reject(err);
      }
      running.set(key, promise);
      const release = () => { if (running.get(key) === promise) running.delete(key); };
      promise.then(release, release);
      return promise;
    },
    isRunning: (key) => running.has(key),
    get size() { return running.size; },
  };
}

/** Chave estável de idempotência: gerada uma vez por tentativa e reaproveitada nos reenvios. */
export function newIdempotencyKey(): string {
  const c = typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Chave de uma mutação HTTP; `null` quando não deve ser deduplicada (leitura, upload, corpo não serializável). */
export function mutationFlightKey(method: string | undefined, path: string, body: unknown): string | null {
  const m = (method ?? 'GET').toUpperCase();
  if (!MUTATING_METHODS.has(m)) return null;
  if (typeof FormData !== 'undefined' && body instanceof FormData) return null;
  try {
    return `${m} ${path} ${body === undefined ? '' : JSON.stringify(body)}`;
  } catch {
    return null;
  }
}
