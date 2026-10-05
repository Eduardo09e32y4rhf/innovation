'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Building2, FileDown, RefreshCw, Search } from 'lucide-react';
import api, { ApiError, type FaturasCompanyList, type FaturasCompanyRow, type PlatformFinanceSummary } from '@/app/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/app/contexts/AuthContext';
import { hasPermission } from '@/app/lib/permissions';
import CompanyFicha from './_ficha';
import { billingLabel, money, shortDate } from './_format';
import Integration from './_integration';

const brl = money;
const day = shortDate;

const COMPANY_STATUS: Record<string, string> = { ACTIVE: 'Ativa', SUSPENDED: 'Bloqueada', CANCELLED: 'Cancelada' };
const BILLING_STATUS: Record<string, string> = {
  TRIAL: 'Em teste', PENDING_PAYMENT: 'Aguardando pagamento', ACTIVE: 'Em dia', PAST_DUE: 'Inadimplente', CANCELED: 'Cancelado',
};

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'bad' | 'ok' }) {
  return (
    <div className="card-v2 p-4">
      <p className="text-xs text-fg-mut">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone === 'bad' ? 'text-rose-600' : tone === 'ok' ? 'text-emerald-600' : 'text-fg'}`}>{value}</p>
    </div>
  );
}

export default function PlatformInvoicesView() {
  const { user } = useAuth();
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const [summary, setSummary] = useState<PlatformFinanceSummary>();
  const [data, setData] = useState<FaturasCompanyList>();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [billingStatus, setBillingStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<FaturasCompanyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Atalho vindo da Plataforma: /faturas?q=nome da empresa já filtra a lista.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setSearch(q);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, list] = await Promise.all([
        api.faturas.summary(),
        api.faturas.companies({ page, limit: 20, search: search.trim() || undefined, status: status || undefined, billingStatus: billingStatus || undefined }),
      ]);
      setSummary(s);
      setData(list);
      setSelected((current) => (current ? list.items.find((item) => item.id === current.id) ?? current : current));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível carregar as empresas.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, billingStatus]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (selected) {
    return (
      <div>
        <div className="px-3 pt-4 sm:px-5 lg:px-6">
          <button type="button" onClick={() => setSelected(null)} className="inline-flex items-center gap-1 text-sm font-medium text-fg-sub hover:text-fg">
            <ArrowLeft size={15} aria-hidden="true" /> Voltar para todas as empresas
          </button>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-fg-sub">
            <Building2 size={15} aria-hidden="true" />
            <strong className="text-fg">{selected.name}</strong>
            <span>· {COMPANY_STATUS[selected.status] ?? selected.status}</span>
            <span>· {billingLabel(selected)}</span>
            <span>· Plano {selected.plan}</span>
            {selected.subscription?.billingPaused && <span className="font-semibold text-amber-600">· Cobrança pausada</span>}
          </p>
        </div>
        <CompanyFicha company={selected} onChanged={() => void load()} />
      </div>
    );
  }

  const field = 'h-10 rounded-xl border border-line bg-transparent px-3 text-sm text-fg';

  return (
    <div className="space-y-4 p-3 sm:p-5 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg">Faturas · todas as empresas</h1>
          <p className="text-sm text-fg-mut">Situação financeira de empresas ativas, bloqueadas e canceladas.</p>
        </div>
        <span className="flex gap-2">
          <button type="button" className="btn btn-outline inline-flex items-center gap-1.5 text-sm" onClick={async () => { try { await api.faturas.downloadStatementPdf({}); } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Não foi possível gerar o extrato.'); } }}>
            <FileDown size={14} aria-hidden="true" /> Extrato PDF
          </button>
          <button type="button" onClick={() => void load()} disabled={loading} className="btn btn-outline inline-flex items-center gap-1.5 text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Atualizar
          </button>
        </span>
      </header>

      {summary && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi label="Receita mensal recorrente" value={brl(summary.mrr)} />
          <Kpi label="Recebido" value={brl(summary.totals.received)} tone="ok" />
          <Kpi label="Em aberto" value={brl(summary.totals.open)} />
          <Kpi label="Vencido" value={brl(summary.totals.overdue)} tone={summary.totals.overdue > 0 ? 'bad' : undefined} />
          <Kpi label="Assinaturas ativas" value={String(summary.activeSubscriptions)} />
        </section>
      )}

      <section className="flex flex-wrap gap-2">
        <label className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-mut" aria-hidden="true" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por nome, CNPJ ou identificador"
            aria-label="Buscar empresa" className={`${field} w-full pl-9`} />
        </label>
        <select aria-label="Situação da empresa" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={field}>
          <option value="">Todas as situações</option>
          {Object.entries(COMPANY_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select aria-label="Situação financeira" value={billingStatus} onChange={(e) => { setBillingStatus(e.target.value); setPage(1); }} className={field}>
          <option value="">Todo o financeiro</option>
          {Object.entries(BILLING_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </section>

      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}

      <section className="card-v2 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase text-fg-mut">
            <tr>
              <th className="p-3">Empresa</th><th className="p-3">Situação</th><th className="p-3">Financeiro</th>
              <th className="p-3">Próx. venc.</th><th className="p-3">Em aberto</th><th className="p-3">Vencido</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((c) => (
              <tr key={c.id} tabIndex={0} onClick={() => setSelected(c)} onKeyDown={(e) => { if (e.key === 'Enter') setSelected(c); }}
                className="cursor-pointer border-t border-line hover:bg-black/5 focus:bg-black/5 focus:outline-none">
                <td className="p-3"><p className="font-semibold text-fg">{c.name}</p><p className="text-xs text-fg-mut">{c.document ?? 'Sem CNPJ'}</p></td>
                <td className="p-3 text-fg-sub">{COMPANY_STATUS[c.status] ?? c.status}</td>
                <td className="p-3 text-fg-sub">{billingLabel(c)}{c.subscription?.billingPaused ? ' (pausada)' : ''}</td>
                <td className="p-3 text-fg-sub">{day(c.subscription?.nextDueDate)}</td>
                <td className="p-3 text-fg">{c.open.count ? `${brl(c.open.total)} (${c.open.count})` : '-'}</td>
                <td className={`p-3 ${c.overdue.count ? 'font-semibold text-rose-600' : 'text-fg'}`}>{c.overdue.count ? `${brl(c.overdue.total)} (${c.overdue.count})` : '-'}</td>
              </tr>
            ))}
            {!loading && !data?.items.length && <tr><td colSpan={6} className="p-6 text-center text-fg-mut">Nenhuma empresa encontrada.</td></tr>}
          </tbody>
        </table>
      </section>

      {hasPermission(user, 'faturas.cobrar') && <Integration canRetry={role === 'DEV'} />}

      {data && data.pagination.pages > 1 && (
        <nav className="flex items-center justify-between text-sm text-fg-sub" aria-label="Paginação">
          <span>{data.pagination.total} empresas · página {data.pagination.page} de {data.pagination.pages}</span>
          <span className="flex gap-2">
            <button type="button" className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
            <button type="button" className="btn btn-outline" disabled={page >= data.pagination.pages} onClick={() => setPage(page + 1)}>Próxima</button>
          </span>
        </nav>
      )}
    </div>
  );
}
