'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { AreaTabs } from '../_components/area-tabs';
import { NoAccess, PageShell } from '../_components/page-shell';
import { AuditoriaView } from '../_hub/auditoria-view';
import { SISTEMA_TABS, resolveTab, tabAccess, tabsFor } from '../_lib/platform-access';
import { AcessosView } from './_tabs/acessos-view';
import { ConfiguracaoView } from './_tabs/configuracao/configuracao-view';
import { PermissoesView } from './_tabs/permissoes-view';
import { VisitasView } from './_tabs/visitas-view';

/** Sistema: configuração, permissões, acessos, auditoria e visitas do site (uma aba por vez, em `?aba=`). */
function Sistema() {
  const { user } = useAuth();
  const search = useSearchParams();
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const tab = resolveTab(SISTEMA_TABS, search.get('aba'), role);
  const readOnly = tab ? tabAccess(tab, role) !== 'write' : true;
  return (
    <PageShell title="Sistema" subtitle={readOnly ? 'Configuração, acessos e auditoria da plataforma (somente consulta).' : 'Configuração, permissões, acessos e auditoria da plataforma.'}>
      <AreaTabs tabs={tabsFor(SISTEMA_TABS, role)} current={tab?.key} label="Seções do Sistema" />
      {!tab && <NoAccess />}
      {tab?.key === 'configuracao' && <ConfiguracaoView />}
      {tab?.key === 'permissoes' && <PermissoesView />}
      {tab?.key === 'acessos' && <AcessosView />}
      {tab?.key === 'auditoria' && <AuditoriaView />}
      {tab?.key === 'visitas' && <VisitasView />}
    </PageShell>
  );
}

export default function SistemaPage() {
  return <Suspense fallback={<LoadingState label="Carregando Sistema…" />}><Sistema /></Suspense>;
}
