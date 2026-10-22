'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Filtros e página vivem na URL (compartilháveis e sobrevivem ao recarregar).
 * `set` troca vários parâmetros de uma vez; valor vazio remove o parâmetro; mudar um filtro volta para a página 1.
 */
export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const get = useCallback((key: string, fallback = '') => params.get(key) ?? fallback, [params]);
  const set = useCallback((changes: Record<string, string | number | null | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === undefined || value === '') next.delete(key);
      else next.set(key, String(value));
    }
    if (!('page' in changes)) next.delete('page');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  return { get, set, page: Math.max(1, Number(params.get('page')) || 1) };
}
