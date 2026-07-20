'use client';

import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import {
  ArrowDownToLine,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { buildPdfShell, escapeHtml, infoGrid, pdfTable, printPdf, section } from '@/app/lib/pdf-utils';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import api, {
  ApiError,
  PlatformBillingType,
  PlatformCompany,
  PlatformInvoice,
  PlatformInvoiceStatus,
} from '@/app/lib/api';

const STATUS: Record<PlatformInvoiceStatus, { label: string; className: string }> = {
  OPEN: { label: 'Em aberto', className: 'border-sky-200 bg-sky-50 text-sky-700' },
  PAID: { label: 'Pago', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  OVERDUE: { label: 'Vencido', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  CANCELED: { label: 'Cancelado', className: 'border-slate-200 bg-slate-100 text-slate-600' },
};

const BILLING_LABEL: Record<PlatformBillingType, string> = {
  UNDEFINED: 'Cliente escolhe',
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartao',
};

function parseMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value).trim();
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(/,/g, '');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function money(value: number | string | null | undefined) {
  return parseMoney(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function date(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
}

function monthLabel(value: string) {
  const [year, month] = value.split('-');
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(Number(year), Number(month) - 1, 1)).replace('.', '');
}

// InvoiceModal component removed because finance is now automated via Asaas

export default function FinancePage({ params: { tenant } }: { params: { tenant: string } }) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<PlatformInvoiceStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [workingId, setWorkingId] = useState<string>();

  const summary = useQuery(() => api.platform.finance.summary({ from, to }), [from, to]);
  const invoices = useQuery(
    () => api.platform.finance.list({ page, limit: 20, status, search: deferredSearch, from, to }),
    [page, status, deferredSearch, from, to],
  );

  function refresh() {
    invoices.refetch();
    summary.refetch();
  }


  async function sync(invoice: PlatformInvoice) {
    setWorkingId(invoice.id);
    try {
      await api.platform.finance.sync(invoice.id);
      toast.success('Status sincronizado com o Asaas.');
      refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Nao foi possivel sincronizar.');
    } finally {
      setWorkingId(undefined);
    }
  }

  async function exportPdf() {
    try {
      const result = await api.platform.finance.list({ limit: 500, status, search: deferredSearch, from, to });
      const rows = result.items.map(item => [
        item.company.name,
        item.company.document || '-',
        item.description || 'Mensalidade',
        money(item.amount),
        date(item.dueDate),
        STATUS[item.status]?.label ?? item.status,
        BILLING_LABEL[item.billingType] ?? item.billingType,
        item.asaasPaymentId ? 'Asaas' : 'Local',
      ].map(cell => `<td style="padding:3px 4px;font-size:7px;color:#334155;">${escapeHtml(cell)}</td>`).join(''));
      const filterLabel = [from ? `De ${date(from)}` : null, to ? `ate ${date(to)}` : null, status ? STATUS[status].label : null]
        .filter(Boolean)
        .join(' | ') || 'Todos os registros';
      const html = buildPdfShell(
        { title: 'Relatorio Financeiro da Plataforma', subtitle: filterLabel, landscape: true },
        { name: 'Innovation RH System', document: 'Plataforma SaaS' },
        `
          ${section('Resumo', infoGrid([
            { label: 'Faturado', value: money(summary.data?.totals.billed ?? 0) },
            { label: 'Recebido', value: money(summary.data?.totals.received ?? 0) },
            { label: 'A receber', value: money(summary.data?.totals.open ?? 0) },
            { label: 'Em atraso', value: money(summary.data?.totals.overdue ?? 0) },
          ], 4))}
          ${section('Faturas', rows.length
            ? pdfTable(['Empresa', 'Documento', 'Cobranca', 'Valor', 'Vencimento', 'Status', 'Forma', 'Integracao'], rows, { compact: true, border: true })
            : `<p style="font-size:10px;color:#64748b;">${escapeHtml('Nenhuma fatura encontrada para estes filtros.')}</p>`, { noBg: true })}
        `,
      );
      printPdf(html, `financeiro-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      toast.error('Nao foi possivel exportar o PDF.');
    }
  }

  const totals = summary.data?.totals;
  const chartData = summary.data?.monthly.map(item => ({ ...item, label: monthLabel(item.month) })) ?? [];
  const chartMax = Math.max(1, ...chartData.flatMap(item => [item.billed, item.received]));

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">Controle da operacao</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Gestao da Plataforma</h2>
          <div className="mt-4 flex max-w-full gap-4 overflow-x-auto border-b border-slate-200 whitespace-nowrap">
            <Link href={`/${tenant}/dashboard/platform`} className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800">Empresas</Link>
            <Link href={`/${tenant}/dashboard/platform/plans`} className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800">Planos & Assinaturas</Link>
            <Link href={`/${tenant}/dashboard/platform/finance`} className="border-b-2 border-teal-600 pb-2 text-sm font-black text-slate-950">Financeiro</Link>
            <Link href={`/${tenant}/dashboard/platform/permissions`} className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800">Permissoes Globais</Link>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPdf} className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"><ArrowDownToLine size={14} /> Exportar</button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Faturado', value: totals?.billed, icon: WalletCards, tone: 'bg-slate-950 text-white' },
          { label: 'Recebido', value: totals?.received, icon: CheckCircle2, tone: 'bg-emerald-600 text-white' },
          { label: 'A receber', value: totals?.open, icon: Banknote, tone: 'bg-white text-slate-950' },
          { label: 'Em atraso', value: totals?.overdue, icon: CalendarDays, tone: 'bg-rose-50 text-rose-950' },
        ].map(card => (
          <article key={card.label} className={`relative overflow-hidden rounded-[14px] border border-slate-200 p-5 shadow-sm ${card.tone}`}>
            <card.icon size={18} className="mb-5 opacity-75" />
            <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-65">{card.label}</p>
            <p className="mt-1 text-2xl font-black">{money(card.value ?? 0)}</p>
            <div className="absolute -bottom-10 -right-8 h-28 w-28 rounded-full bg-current opacity-[0.04]" />
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_2fr]">
        <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Conversao</p><h3 className="mt-1 text-lg font-black text-slate-950">Receita confirmada</h3></div>
            <TrendingUp size={20} className="text-teal-600" />
          </div>
          <div className="mt-8 flex items-end gap-3"><span className="text-5xl font-black text-slate-950">{summary.data?.conversionRate ?? 0}%</span><span className="pb-1 text-xs font-bold text-slate-400">do faturado</span></div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${Math.min(summary.data?.conversionRate ?? 0, 100)}%` }} /></div>
          <p className="mt-4 text-xs text-slate-500">{summary.data?.count ?? 0} faturas no periodo selecionado.</p>
        </div>

        <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ultimos meses</p><h3 className="mt-1 text-lg font-black text-slate-950">Faturado x recebido</h3></div><MoreHorizontal className="text-slate-300" /></div>
          <div className="h-52">
            {chartData.length ? (
              <div className="flex h-full items-end gap-2 border-b border-slate-200 pt-3">
                {chartData.map(item => (
                  <div key={item.month} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${item.label}: ${money(item.billed)} faturado / ${money(item.received)} recebido`}>
                    <div className="flex flex-1 items-end justify-center gap-1">
                      <div className="w-[38%] rounded-t bg-slate-900 transition-all" style={{ height: `${Math.max(3, (item.billed / chartMax) * 100)}%` }} />
                      <div className="w-[38%] rounded-t bg-teal-500 transition-all" style={{ height: `${Math.max(3, (item.received / chartMax) * 100)}%` }} />
                    </div>
                    <span className="mt-2 truncate text-center text-[10px] font-bold text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
            ) : <div className="flex h-full items-center justify-center text-xs text-slate-400">Sem dados para o grafico.</div>}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar empresa ou CNPJ..." className="h-10 w-full rounded-[8px] border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-teal-500" /></div>
          <select value={status} onChange={event => { setStatus(event.target.value as PlatformInvoiceStatus | ''); setPage(1); }} className="h-10 rounded-[8px] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none"><option value="">Todos os status</option>{Object.entries(STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select>
          <input type="date" value={from} onChange={event => { setFrom(event.target.value); setPage(1); }} className="h-10 rounded-[8px] border border-slate-200 px-3 text-xs text-slate-600 outline-none" />
          <input type="date" value={to} onChange={event => { setTo(event.target.value); setPage(1); }} className="h-10 rounded-[8px] border border-slate-200 px-3 text-xs text-slate-600 outline-none" />
          <button onClick={refresh} aria-label="Atualizar lista" className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-slate-200 text-slate-500 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none"><RefreshCw size={14} aria-hidden="true" /></button>
        </div>

        {invoices.error ? <div className="p-6"><ErrorState message={invoices.error} onRetry={invoices.refetch} /></div> : invoices.loading ? <div className="p-10"><LoadingState label="Carregando financeiro..." /></div> : !invoices.data?.items.length ? <div className="p-10"><EmptyState message="Nenhuma fatura encontrada para estes filtros." /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Empresa</th><th className="px-4 py-3">Cobranca</th><th className="px-4 py-3">Vencimento</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Integracao</th><th className="px-5 py-3 text-right">Acoes</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.data.items.map(invoice => (
                  <tr key={invoice.id} className="group hover:bg-slate-50/70">
                    <td className="px-5 py-4"><p className="text-sm font-black text-slate-900">{invoice.company.name}</p><p className="mt-0.5 text-[10px] text-slate-400">{invoice.company.document || 'Sem documento'}</p></td>
                    <td className="px-4 py-4"><p className="max-w-[230px] truncate text-xs font-bold text-slate-700">{invoice.description || 'Mensalidade'}</p><p className="mt-1 text-[10px] text-slate-400">{BILLING_LABEL[invoice.billingType]}</p></td>
                    <td className="px-4 py-4 text-xs font-bold text-slate-600">{date(invoice.dueDate)}</td>
                    <td className="px-4 py-4 text-sm font-black text-slate-950">{money(invoice.amount)}</td>
                    <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${STATUS[invoice.status].className}`}>{STATUS[invoice.status].label}</span></td>
                    <td className="px-4 py-4">{invoice.asaasPaymentId ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700"><span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> Asaas</span> : <span className="text-[10px] font-bold text-slate-400">Local</span>}</td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-1">
                      {invoice.invoiceUrl && <a href={invoice.invoiceUrl} target="_blank" rel="noreferrer" title="Abrir cobranca" aria-label="Abrir cobranca em nova aba" className="rounded-[7px] p-2 text-slate-500 hover:bg-white hover:text-teal-700 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none"><ExternalLink size={14} aria-hidden="true" /></a>}
                      {invoice.asaasPaymentId && <button disabled={workingId === invoice.id} onClick={() => sync(invoice)} title="Sincronizar" aria-label="Sincronizar fatura" className="rounded-[7px] p-2 text-slate-500 hover:bg-white hover:text-teal-700 hover:shadow-sm disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none"><RefreshCw size={14} aria-hidden="true" /></button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {invoices.data && invoices.data.pagination.total > 0 && <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><span>{invoices.data.pagination.total} faturas</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage(current => current - 1)} className="rounded border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40">Anterior</button><span className="font-bold text-slate-700">{page} / {invoices.data.pagination.pages}</span><button disabled={page >= invoices.data.pagination.pages} onClick={() => setPage(current => current + 1)} className="rounded border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40">Proxima</button></div></div>}
      </section>

    </div>
  );
}



