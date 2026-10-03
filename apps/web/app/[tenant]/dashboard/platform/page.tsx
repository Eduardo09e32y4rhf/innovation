'use client';

import { Settings2 } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { LoadingState } from '@/app/components/data-states';
import { Button, PageHeader } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { api, type PlatformCompany } from '@/app/lib/api';
import { CompanyManageModal } from './_components/company-manage-modal';
import { AccountingView } from './_hub/accounting-view';
import { CompaniesView } from './_hub/companies-view';
import { FinanceView } from './_hub/finance-view';
import { errorText } from './_hub/format';
import { AuditView, CommercialView, SettingsView, SupportView } from './_hub/more-views';
import { OverviewView } from './_hub/overview-view';
import { ScopePicker } from './_hub/scope-picker';
import { TAB_LABEL, TAB_POLICY, type CompanyOption, type HubTab } from './_hub/types';

function Hub() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { tenant = '' } = useParams<{ tenant: string }>();
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const base = `/${tenant}/dashboard/platform`;

  const companyId = params.get('company') ?? undefined;
  const companyName = params.get('cn') ?? undefined;
  const allowed = TAB_POLICY[role] ?? [];
  const tabs = useMemo(() => allowed.filter((tab) => (companyId ? !['empresas', 'configuracoes'].includes(tab) : true)), [allowed, companyId]);
  const requested = params.get('tab') as HubTab | null;
  const tab = tabs.includes(requested as HubTab) ? (requested as HubTab) : tabs[0] ?? 'resumo';

  const [managing, setManaging] = useState<PlatformCompany | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const update = useCallback((changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) { if (value) next.set(key, value); else next.delete(key); }
    router.replace(`?${next.toString()}`, { scroll: false });
  }, [params, router]);

  const selectCompany = (company: CompanyOption | null, name?: string) => update(company ? { company: company.id, cn: company.name } : { company: null, cn: null, ...(tab === 'empresas' ? {} : {}) });
  const openCompany = (id: string, name?: string) => update({ company: id, cn: name ?? null, tab: tab === 'empresas' ? 'resumo' : tab });

  if (!user) return <LoadingState label="Carregando acesso…" />;
  if (!allowed.length) return <section className="card-v2 m-4 p-5"><h1 className="text-xl font-semibold">Acesso restrito</h1><p className="mt-2 text-sm text-fg-sub">Seu perfil não tem acesso à Plataforma.</p></section>;

  const canEditAccounting = ['DEV', 'CEO', 'CONTABIL'].includes(role);
  const canManageCompany = ['DEV', 'CEO', 'COMERCIAL'].includes(role);

  async function openManage() {
    if (!companyId) return;
    try { setManaging(await api.platform.getCompany(companyId)); setSaveError(null); }
    catch (cause) { toast.error(errorText(cause, 'Não foi possível abrir a empresa.')); }
  }

  async function saveCompany(data: any) {
    if (!managing) return;
    setSaving(true); setSaveError(null);
    try { await api.platform.updateCompany(managing.id, data); toast.success('Empresa atualizada.'); setManaging(null); router.refresh(); update({}); }
    catch (cause) { setSaveError(errorText(cause, 'Não foi possível salvar.')); }
    finally { setSaving(false); }
  }

  const selected: CompanyOption | null = companyId ? { id: companyId, name: companyName ?? 'Empresa', slug: '', document: '', status: '', plan: '', billingStatus: '' } : null;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 px-3 py-4 sm:px-5 lg:px-6">
      <PageHeader
        title={companyId ? (companyName ?? 'Empresa') : 'Plataforma'}
        subtitle={companyId ? 'Tudo desta empresa em um só lugar.' : role === 'CONTABIL' ? 'Contabilidade e regras de cálculo de todas as empresas.' : 'Visão geral de todas as empresas, cobrança e contabilidade.'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ScopePicker selected={selected} onSelect={(company) => selectCompany(company)} />
            {companyId && canManageCompany && <Button variant="outline" onClick={openManage}><Settings2 size={16} aria-hidden="true" /> Gerenciar</Button>}
          </div>
        }
      />

      <nav aria-label="Seções da Plataforma" className="-mx-1 overflow-x-auto px-1">
        <ul className="flex min-w-max gap-1 border-b border-border">
          {tabs.map((item) => (
            <li key={item}><button type="button" aria-current={tab === item ? 'page' : undefined} onClick={() => update({ tab: item })}
              className={`min-h-11 border-b-2 px-4 py-2 text-sm font-medium transition ${tab === item ? 'border-purple-600 text-purple-700' : 'border-transparent text-fg-sub hover:text-fg'}`}>{TAB_LABEL[item]}</button></li>
          ))}
        </ul>
      </nav>

      <main>
        {tab === 'resumo' && <OverviewView companyId={companyId} onOpenCompany={openCompany} onTab={(next) => update({ tab: next })} />}
        {tab === 'empresas' && <CompaniesView onOpenCompany={openCompany} />}
        {tab === 'financeiro' && <FinanceView companyId={companyId} role={role} />}
        {tab === 'contabilidade' && <AccountingView companyId={companyId} canEdit={canEditAccounting} onOpenCompany={openCompany} />}
        {tab === 'comercial' && <CommercialView companyId={companyId} base={base} />}
        {tab === 'suporte' && <SupportView companyId={companyId} base={base} />}
        {tab === 'auditoria' && <AuditView companyId={companyId} />}
        {tab === 'configuracoes' && <SettingsView base={base} />}
      </main>

      {managing && <CompanyManageModal company={managing} onClose={() => setManaging(null)} onSave={saveCompany} loading={saving} error={saveError} />}
    </div>
  );
}

export default function PlatformHubPage() {
  return (
    <Suspense fallback={<LoadingState label="Carregando Plataforma…" />}>
      <Hub />
    </Suspense>
  );
}
