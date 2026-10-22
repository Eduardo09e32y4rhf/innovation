'use client';

import { RefreshCw } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { PageShell, StateBlock } from './_components/page-shell';
import { InteligenciaView } from './_hub/inteligencia-view';
import { platformHub } from './_hub/hub-api';
import { GlobalOverviewPanel } from './_hub/overview/global-overview';
import { platformLinks } from './_lib/platform-links';
import { visibleExtras } from './_lib/platform-access';

/** Visão geral: números reais de /platform-hub/overview (empresas, caixa do mês, atrasos, chamados). */
export default function VisaoGeralPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { tenant = '' } = useParams<{ tenant: string }>();
  const links = platformLinks(tenant);
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const overview = useQuery(() => platformHub.overview(), []);
  const data = overview.data?.scope === 'GLOBAL' ? overview.data : undefined;
  const alerts = visibleExtras(role, 'visao-geral').some((extra) => extra.key === 'inteligencia');

  return (
    <PageShell title="Visão geral" subtitle="Clientes, caixa e operação de todas as empresas em um só lugar."
      actions={<Button variant="outline" onClick={() => overview.refetch()} disabled={overview.loading}><RefreshCw size={15} className={overview.loading ? 'animate-spin' : ''} aria-hidden="true" /> Atualizar</Button>}>
      <StateBlock loading={overview.loading && !overview.data} error={overview.error} empty={!data} emptyText="Sem dados da plataforma para mostrar." loadingLabel="Carregando visão geral…" onRetry={overview.refetch}>
        {data && <GlobalOverviewPanel data={data} onOpenCompany={(id) => router.push(links.ficha(id))} onFinance={() => router.push(links.financeiro())} />}
      </StateBlock>
      {alerts && <InteligenciaView params={{ tenant }} />}
    </PageShell>
  );
}
