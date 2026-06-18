'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/app/lib/api';

/**
 * Hooks de dados sem dependencias externas (o projeto usa static export
 * e nao inclui TanStack Query). Cobrem o essencial: fetch com loading/erro,
 * refetch manual e mutations com estado.
 */

export interface QueryState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function messageFromError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Erro inesperado.';
}

/**
 * Busca dados ao montar e sempre que `deps` mudar.
 * `enabled = false` evita a chamada (ex.: aguardando auth).
 */
export function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
  options: { enabled?: boolean; pollMs?: number } = {},
): QueryState<T> {
  const { enabled = true, pollMs } = options;
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => {
    run();
  }, [run]);

  useEffect(() => {
    if (!pollMs || !enabled) return;
    const id = setInterval(run, pollMs);
    return () => clearInterval(id);
  }, [pollMs, enabled, run]);

  return { data, loading, error, refetch: run };
}

export interface MutationState<TInput, TResult> {
  mutate: (...args: TInput extends void ? [] : [input: TInput]) => Promise<TResult>;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Executa uma operacao de escrita e expoe loading/erro.
 * Lanca o erro para o caller poder tratar (try/catch no submit).
 */
export function useMutation<TInput = void, TResult = unknown>(
  fn: (input: TInput) => Promise<TResult>,
  options: { onSuccess?: (result: TResult, input: TInput) => void; onError?: (error: string) => void } = {},
): MutationState<TInput, TResult> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const mutate = useCallback(async (...args: unknown[]) => {
    const input = args[0] as TInput;
    setLoading(true);
    setError(null);
    try {
      const result = await fn(input);
      optionsRef.current.onSuccess?.(result, input);
      return result;
    } catch (err) {
      const message = messageFromError(err);
      setError(message);
      optionsRef.current.onError?.(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fn]);

  const reset = useCallback(() => setError(null), []);

  return { mutate: mutate as MutationState<TInput, TResult>['mutate'], reset, loading, error };
}
