'use client';

import { ChevronRight, CreditCard, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { NewCompanyModal } from '../_components/new-company-modal';
import { BILLING_STATUS, COMPANY_STATUS, date } from './format';

const PAGE_SIZE = 12;
const STATUS_FILTERS: Array<[string, string]> = [['', 'Todas'], ['ACTIVE', 'Ativas'], ['SUSPENDED', 'Suspensas'], ['CANCELLED', 'Canceladas']];
const BILLING_FILTERS: Array<[string, string]> = [['', 'Qualquer cobrança'], ['PENDING_PAYMENT', 'Aguardando pagamento'], ['PAST_DUE', 'Inadimplentes'], ['TRIAL', 'Em teste'], ['ACTIVE', 'Em dia'], ['CANCELED', 'Canceladas']];

function Chip({ map, value }: { map: Record<string, { label: string; tone: string }>; value?: string | null }) {
  const item = map[value ?? ''] ?? { label: value ?? '—', tone: 'bg-zinc-100 text-zinc-600' };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.tone}`}>{item.label}</span>;
}

function Bar({ used, max }: { used: number; max?: number | null }) {
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div className="min-w-[90px]">
      <span className="text-xs tabular-nums text-fg-sub">{used}{max ? ` / ${max}` : ''}</span>
      {max ? <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-zinc-100" aria-hidden="true"><div className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} /></div> : null}
    </div>
  );
}

export function CompaniesView({ onOpenCompany }: { onOpenCompany: (id: string, name?: string) => void }) {
  const { tenant = '' } = useParams<{ tenant: string }>();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [billing, setBilling] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  useEffect(() => { const timer = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  const list = useQuery(() => api.platform.listCompanies({ page, limit: PAGE_SIZE, search: debounced || undefined, status: status || undefined, billingStatus: billing || undefined }), [page, debounced, status, billing]);
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = list.data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[240px] flex-1 sm:max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-fg-sub" aria-hidden="true" />
          <input className="input-v2 !rounded-full !pl-10 w-full text-base sm:text-sm" placeholder="Buscar por nome ou CNPJ" aria-label="Buscar empresas" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Button onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" /> Nova empresa</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1); }}
            className={`min-h-9 rounded-full px-3.5 text-xs font-bold ${status === value ? 'bg-slate-900 text-white' : 'border border-border text-fg-sub hover:bg-bg-sub'}`}>{label}</button>
        ))}
        <select aria-label="Filtrar por cobrança" value={billing} onChange={(event) => { setBilling(event.target.value); setPage(1); }} className="input-v2 !h-9 !rounded-full text-xs font-semibold">
          {BILLING_FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        {!list.loading && <span className="ml-auto text-xs font-semibold text-fg-sub">{total} empresa(s)</span>}
      </div>

      {list.error && <ErrorState message={list.error} onRetry={list.refetch} />}
      {list.loading && !list.data ? <LoadingState label="Carregando empresas…" /> : rows.length === 0 ? <EmptyState message="Nenhuma empresa encontrada com esses filtros." /> : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {rows.map((company) => (
            <li key={company.id} className="rounded-2xl border border-border bg-bg p-4 shadow-sm transition hover:shadow-md">
              <button type="button" onClick={() => onOpenCompany(company.id, company.name)} className="flex w-full items-start gap-3 text-left">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-teal-500 text-lg font-black text-white">{company.name.trim().charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold text-fg">{company.name}</span>
                  <span className="block text-xs text-fg-sub">{company.document || 'Sem documento'} · desde {date(company.createdAt)}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-1.5"><Chip map={COMPANY_STATUS} value={company.status} /><Chip map={BILLING_STATUS} value={company.billingStatus} />{company.plan && <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">{company.plan}</span>}</span>
                </span>
                <ChevronRight size={16} className="mt-1 shrink-0 text-fg-mut" aria-hidden="true" />
              </button>
              <div className="mt-3 grid grid-cols-2 gap-4 border-t border-border pt-3">
                <div><p className="text-[11px] font-semibold uppercase tracking-wide text-fg-mut">Usuários</p><Bar used={company.usersCount} max={company.maxUsers} /></div>
                <div><p className="text-[11px] font-semibold uppercase tracking-wide text-fg-mut">Funcionários</p><Bar used={company.employeesCount} max={company.maxEmployees} /></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => onOpenCompany(company.id, company.name)}>Abrir empresa</button>
                <Link href={`/${tenant}/dashboard/faturas?q=${encodeURIComponent(company.name)}`} className="btn btn-outline btn-sm inline-flex items-center gap-1.5"><CreditCard size={14} aria-hidden="true" /> Faturas</Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Paginação" className="flex items-center justify-between text-sm">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span>Página {page} de {pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Próxima</Button>
        </nav>
      )}
      {creating && <NewCompanyModal onClose={() => setCreating(false)} onDone={() => { setCreating(false); list.refetch(); }} />}
    </div>
  );
}
