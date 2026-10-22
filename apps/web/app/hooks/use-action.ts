'use client';
import { useCallback, useRef, useState } from 'react';
import { createSingleFlight, newIdempotencyKey } from '@/app/lib/single-flight';

/**
 * Executa uma ação assíncrona (clique, submit) no máximo uma vez por vez.
 * A trava é uma ref síncrona: cliques repetidos no mesmo tick devolvem a mesma promessa.
 * `busy` serve só para desabilitar o botão e mostrar o carregando.
 */
export function useAction<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => Promise<TResult>) {
  const [busy, setBusy] = useState(false);
  const inflight = useRef<Promise<TResult> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback((...args: TArgs): Promise<TResult> => {
    if (inflight.current) return inflight.current;
    setBusy(true);
    const current = (async () => {
      try { return await fnRef.current(...args); }
      finally { setBusy(false); }
    })();
    inflight.current = current;
    const release = () => { if (inflight.current === current) inflight.current = null; };
    current.then(release, release);
    return current;
  }, []);

  return { run, busy };
}

/**
 * Chave de idempotência estável por tentativa: reenviar o mesmo formulário (após erro de rede ou duplo clique)
 * reaproveita a chave; depois de um sucesso chame `rotate()` para a próxima operação ganhar outra.
 */
export function useIdempotencyKey() {
  const key = useRef<string | null>(null);
  const get = useCallback(() => (key.current ??= newIdempotencyKey()), []);
  const rotate = useCallback(() => { key.current = null; }, []);
  return { get, rotate };
}

/**
 * Trava por ação: a MESMA ação com os MESMOS argumentos (duplo clique, Enter repetido) roda uma vez só e as demais
 * chamadas recebem o mesmo resultado; ações diferentes (outro cartão, outro registro) seguem normalmente.
 * Use `guard('nome', async (...) => { ... })` no lugar de `async function` e `busy` para desabilitar botões.
 */
export function useGuard() {
  const [running, setRunning] = useState(0);
  const flight = useRef(createSingleFlight()).current;

  const guard = useCallback(<TArgs extends unknown[], TResult>(name: string, fn: (...args: TArgs) => Promise<TResult>) =>
    (...args: TArgs): Promise<TResult> => {
      let key = name;
      try { key = `${name}:${JSON.stringify(args)}`; } catch { /* argumentos não serializáveis: trava só pelo nome */ }
      if (flight.isRunning(key)) return flight.run(key, () => fn(...args));
      setRunning((count) => count + 1);
      return flight.run(key, async () => {
        try { return await fn(...args); }
        finally { setRunning((count) => count - 1); }
      });
    }, [flight]);

  return { guard, busy: running > 0 };
}
