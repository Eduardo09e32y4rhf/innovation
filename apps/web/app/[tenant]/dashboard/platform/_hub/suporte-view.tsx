'use client';

import React, { useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { SupportWorkspace } from '@/app/components/support/support-workspace';
import { PlatformActions } from '@/app/components/support/platform-actions';
import { platformSupportWorkspaceApi } from '@/app/components/support/support-api';
import { RefundBlock } from '@/app/components/support/refund-block';
import { PLATFORM_FILTERS } from '@/app/components/support/support-model';

/** Fila de atendimento da plataforma: mesmos componentes da empresa, mais nota interna, atribuir, prioridade, situação e duplicado. */
export function SuporteView() {
  const { user, isDev } = useAuth();
  const router = useRouter();
  const params = useParams();
  const query = useSearchParams();
  const tenant = String(params?.tenant || '');
  const companyId = query.get('companyId') || '';
  const ticketId = query.get('ticket');
  const workspaceApi = useMemo(() => platformSupportWorkspaceApi(companyId || undefined), [companyId]);

  useEffect(() => {
    if (user && !isDev) router.push(`/${tenant}/dashboard`);
  }, [user, isDev, router, tenant]);

  if (!isDev) return null;

  return (
    <div className="w-full min-w-0 px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
      <div className="flex min-w-0 flex-col gap-4">
        <PageHeader
          title="Suporte operacional"
          subtitle={companyId ? 'Fila da empresa selecionada. Notas internas ficam visíveis só para a equipe.' : 'Fila global de atendimento. Notas internas ficam visíveis só para a equipe.'}
        />
        <SupportWorkspace
          mode="platform" userId={user?.id} api={workspaceApi} filters={PLATFORM_FILTERS} initialTicketId={ticketId}
          emptyListText="Nenhum chamado na fila."
          refundBlock={(ticket, refresh) => <RefundBlock ticket={ticket} userId={user?.id} isPlatform onChanged={refresh} />}
          renderActions={(ticket, refresh) => <PlatformActions ticket={ticket} userId={user?.id} onChanged={refresh} />}
        />
      </div>
    </div>
  );
}
