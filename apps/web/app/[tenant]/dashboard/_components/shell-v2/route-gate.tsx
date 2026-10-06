'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/ui/data-state';
import { NAV_ITEMS, tenantRoute } from './nav-config';
import { useWorkspace } from './workspace-context';
import { useAuth } from '@/app/contexts/AuthContext';
import { resolveUserRole } from '@/app/lib/user-role';

export function WorkspaceRouteGate({ children }: { children: ReactNode }) {
  const { items, loading, error, retry } = useWorkspace();
  const { user } = useAuth();
  const role = resolveUserRole(user);
  const pathname = usePathname();
  const params = useParams();
  const tenant = String(params?.tenant || '');
  const owner = NAV_ITEMS.filter((item) => {
    const route = tenantRoute(tenant, item.href);
    return pathname === route || pathname.startsWith(route + '/');
  }).sort((a, b) => b.href.length - a.href.length)[0];
  if (role === 'RH_RS' && owner?.id !== 'jobs') return <EmptyState title="Acesso restrito" message="Seu perfil tem acesso somente ao módulo Vagas." action={<Link href={tenantRoute(tenant, '/dashboard/jobs')} className="btn btn-outline">Ir para Vagas</Link>} />;
  if (owner?.moduleKey && loading) return <LoadingState message="Verificando os módulos da empresa..." />;
  if (owner?.moduleKey && error) return <ErrorState title="Não foi possível verificar o acesso" message="Os módulos da empresa não puderam ser carregados." onRetry={retry} />;
  if (owner && !items.some((item) => item.id === owner.id)) return <EmptyState title="Acesso restrito" message="Esta área não está disponível para seu perfil ou para os módulos da empresa." action={<Link href={tenantRoute(tenant, '/dashboard')} className="btn btn-outline">Voltar ao Dashboard</Link>} />;
  return <>{children}</>;
}
