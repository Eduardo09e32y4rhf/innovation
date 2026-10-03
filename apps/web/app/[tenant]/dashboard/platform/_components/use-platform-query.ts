'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import type { QueryState } from '@/app/hooks/use-data';
export { useMutation } from '@/app/hooks/use-data';

// A resposta de uma empresa/competência anterior nunca substitui o contexto atual.
export function useQuery<T>(fetcher: () => Promise<T>, deps: ReadonlyArray<unknown> = [], options: { enabled?: boolean; pollMs?: number } = {}): QueryState<T> {
  const { user } = useAuth();
  const enabled = options.enabled ?? true;
  const scope = `${user?.id || ''}|${user?.companyId || ''}|${user?.profile || user?.role || ''}`;
  const key = JSON.stringify([scope, enabled, ...deps]);
  const [state, setState] = useState<{ key: string; data?: T; loading: boolean; error: string | null }>({ key, loading: enabled, error: null });
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;
  const generation = useRef(0);
  const run = useCallback(async (background = false) => {
    if (!enabled) return;
    const requestId = ++generation.current;
    if (!background) setState(previous => ({ ...previous, key, loading: true, error: null }));
    try {
      const data = await fetchRef.current();
      if (requestId === generation.current) setState({ key, data, loading: false, error: null });
    } catch (error) {
      if (requestId === generation.current) setState(previous => ({ ...previous, key, loading: false, error: error instanceof Error ? error.message : 'Não foi possível carregar os dados.' }));
    }
  }, [key, enabled]);
  useEffect(() => {
    setState({ key, loading: enabled, error: null });
    void run();
    const interval = enabled && options.pollMs ? window.setInterval(() => void run(true), options.pollMs) : undefined;
    return () => { generation.current++; if (interval) window.clearInterval(interval); };
  }, [key, enabled, options.pollMs, run]);
  return { data: state.key === key ? state.data : undefined, loading: state.key === key ? state.loading : enabled, error: state.key === key ? state.error : null, refetch: () => void run() };
}
