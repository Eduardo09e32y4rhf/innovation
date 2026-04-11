'use client';

/**
 * QueryClientProvider Global — Innovation.ia
 * ──────────────────────────────────────────────
 * Envolve todo o app com TanStack Query para:
 * - Cache automático de requisições
 * - Loading/error states gerenciados automaticamente
 * - Refetch inteligente (focus, reconnect, interval)
 * - Devtools no ambiente de desenvolvimento
 */
import { useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Dados são considerados "frescos" por 60s antes de refetch
            staleTime: 60 * 1000,
            // Mantém dados em cache por 5 minutos após unmount
            gcTime: 5 * 60 * 1000,
            // Retry automático: 1 tentativa adicional em falhas
            retry: 1,
            // Refetch quando a aba volta ao foco
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
