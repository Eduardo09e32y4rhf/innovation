'use client';

import { Calculator, X } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback } from 'react';
import { LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { AccountingView } from '../platform/_hub/accounting-view';
import { ScopePicker } from '../platform/_hub/scope-picker';
import type { CompanyOption } from '../platform/_hub/types';

const ALLOWED = ['DEV', 'CEO', 'CONTABIL'];

function Contabilidade() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { tenant = '' } = useParams<{ tenant: string }>();
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const companyId = params.get('company') ?? undefined;
  const companyName = params.get('cn') ?? undefined;

  const update = useCallback((changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) { if (value) next.set(key, value); else next.delete(key); }
    router.replace(`?${next.toString()}`, { scroll: false });
  }, [params, router]);

  if (!user) return <LoadingState label="Carregando acesso…" />;
  if (!ALLOWED.includes(role)) {
    return <section className="card-v2 m-4 p-5"><h1 className="text-xl font-semibold">Acesso restrito</h1><p className="mt-2 text-sm text-fg-sub">Seu perfil não tem acesso à Contabilidade.</p><Link href={`/${tenant}/dashboard`} className="btn btn-outline mt-4">Voltar ao Dashboard</Link></section>;
  }

  const selected: CompanyOption | null = companyId ? { id: companyId, name: companyName ?? 'Empresa', slug: '', document: '', status: '', plan: '', billingStatus: '' } : null;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 px-3 py-4 sm:px-5 lg:px-6 2xl:max-w-[1800px] 2xl:px-10">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-800 p-5 text-white shadow-lg sm:p-7">
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest"><Calculator size={13} aria-hidden="true" /> Contabilidade</p>
            <h1 className="mt-2 break-words text-2xl font-black leading-tight sm:text-3xl">{companyId ? (companyName ?? 'Empresa') : 'Contabilidade'}</h1>
            <p className="mt-1 text-sm text-white/80">Regras de cálculo, conferência de fechamentos e aprovação da folha. Ao aprovar, a folha do funcionário já fica correta.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ScopePicker selected={selected} onSelect={(company) => update(company ? { company: company.id, cn: company.name } : { company: null, cn: null })} />
            {companyId && <button type="button" onClick={() => update({ company: null, cn: null })} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-3 text-sm font-semibold hover:bg-white/20"><X size={15} aria-hidden="true" /> Todas</button>}
          </div>
        </div>
      </header>
      <AccountingView companyId={companyId} canEdit onOpenCompany={(id, name) => update({ company: id, cn: name ?? null })} />
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
