'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/app/lib/api';

function msgFrom(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Erro inesperado.';
}

export interface QueryState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
  options: { enabled?: boolean; pollMs?: number } = {},
): QueryState<T> {
  const { enabled = true, pollMs } = options;
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef(fetcher);
  ref.current = fetcher;

  const run = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try { setData(await ref.current()); }
    catch (err) { setError(msgFrom(err)); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => { run(); }, [run]);
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

export function useMutation<TInput = void, TResult = unknown>(
  fn: (input: TInput) => Promise<TResult>,
  options: { onSuccess?: (result: TResult, input: TInput) => void; onError?: (error: string) => void } = {},
): MutationState<TInput, TResult> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const optsRef = useRef(options);
  optsRef.current = options;

  const mutate = useCallback(async (...args: unknown[]) => {
    const input = args[0] as TInput;
    setLoading(true);
    setError(null);
    try {
      const result = await fn(input);
      optsRef.current.onSuccess?.(result, input);
      return result;
    } catch (err) {
      const message = msgFrom(err);
      setError(message);
      optsRef.current.onError?.(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fn]);

  return {
    mutate: mutate as MutationState<TInput, TResult>['mutate'],
    loading,
    error,
    reset: useCallback(() => setError(null), []),
  };
}


export function useQueryClient() {
  return {
    invalidateQueries: async () => undefined,
    refetchQueries: async () => undefined,
    resetQueries: async () => undefined,
  };
}
