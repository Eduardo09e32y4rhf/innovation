'use client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { subscribeAuthScope, getAuthScopeSnapshot } from '@/app/lib/auth-session';
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

type QueryController = {
  reset: () => void;
  refetch: () => void;
};

const queryControllers = new Set<QueryController>();

function registerQueryController(controller: QueryController) {
  queryControllers.add(controller);
  return () => {
    queryControllers.delete(controller);
  };
}

export function resetAllQueryStates() {
  queryControllers.forEach((controller) => controller.reset());
}

export function refetchAllQueryStates() {
  queryControllers.forEach((controller) => controller.refetch());
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
  const authScope = useSyncExternalStore(subscribeAuthScope, getAuthScopeSnapshot, getAuthScopeSnapshot);
  const authScopeKey = `${authScope.userId ?? 'anon'}|${authScope.companyId ?? 'none'}|${authScope.role ?? 'none'}|${authScope.token ? 'auth' : 'guest'}`;

  const run = useCallback(async (isRetry = false) => {
    if (!enabled) return;
    if (!isRetry) setLoading(true);
    if (!isRetry) setError(null);
    let hasError = false;
    try {
      setData(await ref.current());
      if (isRetry) setError(null);
    }
    catch (err) {
      hasError = true;
      if (!isRetry) {
        setTimeout(() => run(true), 1500);
      } else {
        setError(msgFrom(err));
      }
    }
    finally {
      if (isRetry || !hasError) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, authScopeKey, ...deps]);

  const reset = useCallback(() => {
    setData(undefined);
    setError(null);
    setLoading(enabled);
  }, [enabled, authScopeKey]);

  const controllerRef = useRef<QueryController>({ reset: () => undefined, refetch: () => undefined });
  controllerRef.current = {
    reset,
    refetch: () => {
      void run();
    },
  };

  useEffect(() => registerQueryController({
    reset: () => controllerRef.current.reset(),
    refetch: () => controllerRef.current.refetch(),
  }), []);

  useEffect(() => {
    setData(undefined);
    setError(null);
    setLoading(enabled);
  }, [authScopeKey, enabled, ...deps]);

  useEffect(() => { run(); }, [run]);
  useEffect(() => {
    if (!pollMs || !enabled) return;
    // Polling em segundo plano: pula aba oculta (nao gasta API/CPU) e nao pisca o estado de loading.
    const tick = () => { if (typeof document === 'undefined' || document.visibilityState === 'visible') void run(true); };
    const id = setInterval(tick, pollMs);
    const onVisible = () => { if (document.visibilityState === 'visible') void run(true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [pollMs, enabled, run]);

  return {
    data,
    loading,
    error,
    refetch: () => {
      void run();
    },
  };
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

  // Trava síncrona: dois cliques no mesmo tick chegam antes do re-render, então `loading` (estado) não os impede.
  const inflight = useRef<Promise<TResult> | null>(null);

  const mutate = useCallback((...args: unknown[]) => {
    if (inflight.current) return inflight.current;
    const input = args[0] as TInput;
    setLoading(true);
    setError(null);
    const run = (async () => {
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
    })();
    inflight.current = run;
    const release = () => { if (inflight.current === run) inflight.current = null; };
    run.then(release, release);
    return run;
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
    invalidateQueries: async () => {
      refetchAllQueryStates();
    },
    refetchQueries: async () => {
      refetchAllQueryStates();
    },
    resetQueries: async () => {
      resetAllQueryStates();
    },
  };
}
