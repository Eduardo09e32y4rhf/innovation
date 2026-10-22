'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { LoadingState } from '@/app/components/data-states';
import { PlatformRevenueReport } from '@/app/components/billing/platform-revenue-report';
import { useAuth } from '@/app/contexts/AuthContext';
import { AreaTabs } from '../_components/area-tabs';
import { NoAccess, PageShell } from '../_components/page-shell';
import { FINANCEIRO_TABS, resolveTab, tabAccess, tabsFor } from '../_lib/platform-access';
import { AjustesFiscaisView } from './_views/_ajustes-fiscais';
import { AssinaturasView } from './_views/assinaturas/assinaturas-view';
import { CuponsView } from './_views/_cupons';
import { PlanosView } from './_views/_planos';
import PlatformInvoicesView from './_views/_platform-view';
import { ReembolsosView } from './_views/_reembolsos';

/** Financeiro: uma aba por assunto (`?aba=`). Quem só lê (Contabilidade) abre as mesmas abas sem os botões de alteração. */
function Financeiro() {
  const { user } = useAuth();
  const search = useSearchParams();
  const { tenant = '' } = useParams<{ tenant: string }>();
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const tab = resolveTab(FINANCEIRO_TABS, search.get('aba'), role);
  const readOnly = tab ? tabAccess(tab, role) !== 'write' : true;
  return (
    <PageShell title="Financeiro" subtitle={readOnly ? 'Cobrança, planos e receita (somente consulta).' : 'Cobrança, planos e receita de todas as empresas.'}>
      <AreaTabs tabs={tabsFor(FINANCEIRO_TABS, role)} current={tab?.key} label="Seções do Financeiro" keepParams={[]} />
      {/* As telas têm margem própria; este recuo evita somar duas margens. */}
      <div className="-mx-3 min-w-0 sm:-mx-5 lg:-mx-6">
        {!tab && <div className="px-3"><NoAccess /></div>}
        {tab?.key === 'faturas' && <PlatformInvoicesView readOnly={readOnly} />}
        {tab?.key === 'assinaturas' && <AssinaturasView params={{ tenant }} />}
        {tab?.key === 'planos' && <PlanosView params={{ tenant }} readOnly={readOnly} />}
        {tab?.key === 'cupons' && <CuponsView readOnly={readOnly} />}
        {tab?.key === 'reembolsos' && <ReembolsosView readOnly={readOnly} />}
        {tab?.key === 'ajustes-fiscais' && <AjustesFiscaisView readOnly={readOnly} />}
        {tab?.key === 'relatorio' && <div className="px-3 sm:px-5 lg:px-6"><PlatformRevenueReport /></div>}
      </div>
    </PageShell>
  );
}

export default function FinanceiroPage() {
  return <Suspense fallback={<LoadingState label="Carregando Financeiro…" />}><Financeiro /></Suspense>;
}
