'use client';

import { ArrowUpRight, Globe2, Settings2, X } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { LoadingState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { api, type PlatformCompany } from '@/app/lib/api';
import { CompanyManageModal } from './_components/company-manage-modal';
import { getPlatformNavGroups } from './_components/platform-nav-config';
import { CompaniesView } from './_hub/companies-view';
import { errorText } from './_hub/format';
import { AcessosView } from './_hub/acessos-view';
import { AuditoriaView } from './_hub/auditoria-view';
import { ConfiguracaoView } from './_hub/configuracao-view';
import { ContratosView } from './_hub/contratos-view';
import { InteligenciaView } from './_hub/inteligencia-view';
import { OverviewView } from './_hub/overview-view';
import { PermissoesView } from './_hub/permissoes-view';
import { PropostasView } from './_hub/propostas-view';
import { resolveSub, subsFor } from './_hub/sections';
import { SubNav } from './_hub/sub-nav';
import { SuporteView } from './_hub/suporte-view';
import { ScopePicker } from './_hub/scope-picker';
import { TAB_LABEL, TAB_POLICY, type CompanyOption, type HubTab } from './_hub/types';

const SUBTITLE: Record<string, string> = {
  CONTABIL: 'Contabilidade e regras de cálculo de todas as empresas.',
  COMERCIAL: 'Sua carteira de clientes, propostas e contratos.',
  CEO: 'A visão do dono: clientes, caixa e operação.',
};

function Hub() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { tenant = '' } = useParams<{ tenant: string }>();
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const base = `/${tenant}/dashboard/platform`;

  const companyId = params.get('company') ?? undefined;
  const companyName = params.get('cn') ?? undefined;
  const allowed = useMemo(() => TAB_POLICY[role] ?? [], [role]);
  const tabs = useMemo(() => allowed.filter((tab) => (companyId ? !['empresas', 'configuracoes'].includes(tab) : true)), [allowed, companyId]);
  const requested = params.get('tab') as HubTab | null;
  const tab = tabs.includes(requested as HubTab) ? (requested as HubTab) : tabs[0] ?? 'resumo';
  const subs = subsFor(tab, role);
  const sub = resolveSub(tab, params.get('sub'), role);
  const shortcuts = useMemo(() => getPlatformNavGroups(role).filter((group) => !['overview', 'finance', 'plans', 'subscriptions', 'coupons'].includes(group.key)), [role]);

  // Contabilidade agora e uma aba propria do menu; links antigos (?tab=contabilidade) seguem para ela.
  useEffect(() => {
    if (requested !== 'contabilidade') return;
    const scope = companyId ? `?company=${companyId}${companyName ? `&cn=${encodeURIComponent(companyName)}` : ''}` : '';
    router.replace(`/${tenant}/dashboard/contabilidade${scope}`);
  }, [requested, router, tenant, companyId, companyName]);

  const [managing, setManaging] = useState<PlatformCompany | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const update = useCallback((changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) { if (value) next.set(key, value); else next.delete(key); }
    router.replace(`?${next.toString()}`, { scroll: false });
  }, [params, router]);

  const openCompany = (id: string, name?: string) => update({ company: id, cn: name ?? null, tab: tab === 'empresas' ? 'resumo' : tab });
  const selectCompany = (company: CompanyOption | null) => update(company ? { company: company.id, cn: company.name } : { company: null, cn: null });

  if (!user) return <LoadingState label="Carregando acesso…" />;
  if (!allowed.length) return <section className="card-v2 m-4 p-5"><h1 className="text-xl font-semibold">Acesso restrito</h1><p className="mt-2 text-sm text-fg-sub">Seu perfil não tem acesso à Plataforma.</p></section>;

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
  const goTab = (next: HubTab) => (next === 'financeiro' ? router.push(`/${tenant}/dashboard/faturas`) : update({ tab: next }));

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 px-3 py-4 sm:px-5 lg:px-6 2xl:max-w-[1800px] 2xl:px-10">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-800 p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden="true" className="absolute -right-10 -top-12 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest"><Globe2 size={13} aria-hidden="true" /> {companyId ? 'Empresa selecionada' : 'Central da plataforma'}</p>
            <h1 className="mt-2 truncate text-3xl font-black leading-tight">{companyId ? (companyName ?? 'Empresa') : 'Plataforma'}</h1>
            <p className="mt-1 text-sm text-white/80">{companyId ? 'Tudo desta empresa em um só lugar.' : SUBTITLE[role] ?? 'Clientes, cobrança e operação de todas as empresas.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ScopePicker selected={selected} onSelect={(company) => selectCompany(company)} />
            {companyId && <button type="button" onClick={() => selectCompany(null)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-3 text-sm font-semibold hover:bg-white/20"><X size={15} aria-hidden="true" /> Todas</button>}
            {companyId && canManageCompany && <Button variant="outline" onClick={openManage}><Settings2 size={16} aria-hidden="true" /> Gerenciar</Button>}
          </div>
        </div>
      </header>

      <nav aria-label="Seções da Plataforma" className="-mx-1 overflow-x-auto px-1">
        <ul className="flex min-w-max gap-1.5">
          {tabs.map((item) => (
            <li key={item}><button type="button" aria-current={tab === item ? 'page' : undefined} onClick={() => update({ tab: item, sub: null })}
              className={`min-h-11 rounded-full px-4 text-sm font-bold transition ${tab === item ? 'bg-slate-900 text-white shadow' : 'border border-border text-fg-sub hover:bg-bg-sub hover:text-fg'}`}>{TAB_LABEL[item]}</button></li>
          ))}
        </ul>
      </nav>

      <main className="space-y-6">
        <SubNav items={subs} current={sub} label="Subseções" onSelect={(key) => update({ sub: key })} />

        {tab === 'resumo' && sub === 'alertas' && <InteligenciaView params={{ tenant }} />}
        {tab === 'resumo' && sub !== 'alertas' && <OverviewView companyId={companyId} onOpenCompany={openCompany} onTab={goTab} />}
        {tab === 'empresas' && <CompaniesView onOpenCompany={openCompany} />}
        {tab === 'comercial' && sub === 'propostas' && <PropostasView />}
        {tab === 'comercial' && sub !== 'propostas' && <ContratosView params={{ tenant }} />}
        {tab === 'suporte' && <SuporteView />}
        {tab === 'auditoria' && <AuditoriaView />}
        {tab === 'configuracoes' && sub === 'permissoes' && <PermissoesView />}
        {tab === 'configuracoes' && sub === 'acessos' && <AcessosView />}
        {tab === 'configuracoes' && sub !== 'permissoes' && sub !== 'acessos' && <ConfiguracaoView params={{ tenant }} />}
        {tab === 'resumo' && sub !== 'alertas' && !companyId && shortcuts.length > 0 && (
          <section aria-label="Atalhos">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-fg-mut">Atalhos</h2>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {shortcuts.map((group) => {
                const Icon = group.icon;
                const href = group.key === 'finance' ? `/${tenant}/dashboard/faturas` : `${base}${group.href}`;
                return (
                  <li key={group.key}>
                    <Link href={href} className="group flex h-full items-start gap-3 rounded-2xl border border-border bg-bg p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700"><Icon size={18} aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-1 text-sm font-bold text-fg">{group.label}<ArrowUpRight size={13} className="shrink-0 text-fg-mut opacity-0 transition group-hover:opacity-100" aria-hidden="true" /></span><span className="block text-xs text-fg-sub">{group.description}</span></span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
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
