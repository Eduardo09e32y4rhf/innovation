'use client';

import Link from 'next/link';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import { LoadingState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { api, type PlatformCompany } from '@/app/lib/api';
import { AreaTabs } from '../../_components/area-tabs';
import { CompanyManageModal } from '../../_components/company-manage-modal';
import { NoAccess, PageShell, StateBlock } from '../../_components/page-shell';
import { AuditoriaView } from '../../_hub/auditoria-view';
import { errorText } from '../../_hub/format';
import { BILLING_STATUS, COMPANY_STATUS } from '../../_hub/format';
import { FICHA_TABS, resolveTab, tabAccess, tabsFor } from '../../_lib/platform-access';
import { platformLinks } from '../../_lib/platform-links';
import { TabAssinatura } from './_tabs/tab-assinatura';
import { TabDocumentos } from './_tabs/tab-documentos';
import { TabFaturas } from './_tabs/tab-faturas';
import { TabGeral } from './_tabs/tab-geral';
import { TabSuporte } from './_tabs/tab-suporte';
import { TabUsuarios } from './_tabs/tab-usuarios';

function Ficha() {
  const { user } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const { tenant = '', companyId = '' } = useParams<{ tenant: string; companyId: string }>();
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const links = platformLinks(tenant);
  const company = useQuery(() => api.platform.getCompany(companyId), [companyId]);
  const tab = resolveTab(FICHA_TABS, search.get('aba'), role);
  const canWrite = tab ? tabAccess(tab, role) === 'write' : false;
  const canManage = FICHA_TABS[0] && tabAccess(FICHA_TABS[0], role) === 'write';
  const [managing, setManaging] = useState<PlatformCompany | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const item = company.data;

  async function save(data: unknown) {
    if (!managing) return;
    setSaving(true); setSaveError(null);
    try { await api.platform.updateCompany(managing.id, data as never); toast.success('Empresa atualizada.'); setManaging(null); company.refetch(); router.refresh(); }
    catch (cause) { setSaveError(errorText(cause, 'Não foi possível salvar.')); }
    finally { setSaving(false); }
  }

  return (
    <PageShell title={item?.name ?? 'Empresa'}
      subtitle={item ? `${item.document || 'Sem documento'} · ${COMPANY_STATUS[item.status]?.label ?? item.status} · ${BILLING_STATUS[item.billingStatus ?? '']?.label ?? 'Sem cobrança'}` : 'Carregando ficha…'}
      actions={<span className="flex flex-wrap gap-2">
        <Link href={links.clientes()} className="btn btn-outline inline-flex min-h-11 items-center gap-1.5 text-sm"><ArrowLeft size={15} aria-hidden="true" /> Todos os clientes</Link>
        {canManage && item && <Button variant="outline" onClick={() => setManaging(item)}><Settings2 size={16} aria-hidden="true" /> Gerenciar</Button>}
      </span>}>
      <AreaTabs tabs={tabsFor(FICHA_TABS, role)} current={tab?.key} label="Seções da ficha do cliente" />
      <StateBlock loading={company.loading && !item} error={company.error} empty={!item} emptyText="Empresa não encontrada." loadingLabel="Carregando empresa…" onRetry={company.refetch}>
        {item && !tab && <NoAccess />}
        {item && tab?.key === 'geral' && <TabGeral companyId={companyId} />}
        {item && tab?.key === 'assinatura' && <TabAssinatura companyId={companyId} canWrite={canWrite} />}
        {item && tab?.key === 'faturas' && <TabFaturas companyId={companyId} />}
        {item && tab?.key === 'usuarios' && <TabUsuarios company={item} canWrite={canWrite} />}
        {item && tab?.key === 'documentos' && <TabDocumentos companyId={companyId} />}
        {item && tab?.key === 'suporte' && <TabSuporte companyId={companyId} canOpenQueue={role === 'DEV'} />}
        {item && tab?.key === 'auditoria' && <AuditoriaView companyId={companyId} />}
      </StateBlock>
      {managing && <CompanyManageModal company={managing} onClose={() => setManaging(null)} onSave={save} loading={saving} error={saveError} />}
    </PageShell>
  );
}

export default function FichaPage() {
  return <Suspense fallback={<LoadingState label="Carregando ficha…" />}><Ficha /></Suspense>;
}
