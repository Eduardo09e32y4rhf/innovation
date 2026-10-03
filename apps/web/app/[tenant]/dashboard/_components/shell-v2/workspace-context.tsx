'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { getVisibleNavItems, type NavItem } from './nav-config';

type CompanyDetails = Awaited<ReturnType<typeof api.companies.me>>;
type WorkspaceContextValue = { company: CompanyDetails | null; items: NavItem[]; loading: boolean; error: string | null; retry: () => void };
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const query = useQuery(() => api.companies.me(), [user?.companyId], { enabled: Boolean(user?.companyId) });
  const value = useMemo<WorkspaceContextValue>(() => ({
    company: query.data ?? null,
    items: getVisibleNavItems(user, query.data?.activeModules ?? []),
    loading: query.loading,
    error: query.error ?? null,
    retry: query.refetch,
  }), [user, query.data, query.loading, query.error, query.refetch]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('WorkspaceProvider ausente na estrutura da aplicação.');
  return context;
}
