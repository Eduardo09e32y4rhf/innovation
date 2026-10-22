'use client';

import { Calculator } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback } from 'react';
import { LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { AccountingView } from '../platform/_hub/accounting-view';
import { ACCOUNTANT_ROLES, currentMonth } from './_model';
import { MonthView } from './_month-view';
import { OfficePanel } from './_office-panel';

function Contabilidade() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { tenant = '' } = useParams<{ tenant: string }>();
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const companyId = params.get('company') ?? undefined;
  const companyName = params.get('cn') ?? 'Empresa';
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.get('mes') ?? '') ? (params.get('mes') as string) : currentMonth();
  const tab = params.get('aba') === 'rotina' ? 'rotina' : 'folha';

  const update = useCallback((changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) { if (value) next.set(key, value); else next.delete(key); }
    router.replace(`?${next.toString()}`, { scroll: false });
  }, [params, router]);

  if (!user) return <LoadingState label="Carregando acesso…" />;
  if (!ACCOUNTANT_ROLES.includes(role)) {
    return <section className="card-v2 m-4 p-5"><h1 className="text-xl font-semibold">Acesso restrito</h1><p className="mt-2 text-sm text-fg-sub">Seu perfil não tem acesso à Contabilidade.</p><Link href={`/${tenant}/dashboard`} className="btn btn-outline mt-4">Voltar ao Dashboard</Link></section>;
  }

  const tabClass = (active: boolean) => `inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${active ? 'bg-slate-900 text-white' : 'border border-slate-200 hover:bg-slate-50'}`;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 px-3 py-4 sm:px-5 lg:px-6 2xl:max-w-[1800px] 2xl:px-10">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-800 p-5 text-white shadow-lg sm:p-7">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest"><Calculator size={13} aria-hidden="true" /> Contabilidade</p>
        <h1 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl">Contabilidade</h1>
        <p className="mt-1 text-sm text-white/80">Folha do mês das empresas atendidas e rotina do escritório.</p>
      </header>
      <nav aria-label="Seções da contabilidade" className="flex flex-wrap gap-2">
        <button type="button" aria-current={tab === 'folha' ? 'page' : undefined} className={tabClass(tab === 'folha')} onClick={() => update({ aba: null })}>Folha do mês</button>
        <button type="button" aria-current={tab === 'rotina' ? 'page' : undefined} className={tabClass(tab === 'rotina')} onClick={() => update({ aba: 'rotina' })}>Rotina do escritório</button>
      </nav>
      {tab === 'rotina' ? (
        <AccountingView companyId={companyId} canEdit onOpenCompany={(id, name) => update({ company: id, cn: name ?? null, aba: null })} />
      ) : companyId ? (
        <MonthView companyId={companyId} companyName={companyName} month={month} role={role} onBack={() => update({ company: null, cn: null })} />
      ) : (
        <OfficePanel month={month} onMonth={(m) => update({ mes: m })} onOpen={(id, name) => update({ company: id, cn: name })} />
      )}
    </div>
  );
}

export default function ContabilidadePage() {
  return (
    <Suspense fallback={<LoadingState label="Carregando Contabilidade…" />}>
      <Contabilidade />
    </Suspense>
  );
}
