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

function money(value: number | string) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function date(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
}

function monthLabel(value: string) {
  const [year, month] = value.split('-');
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(Number(year), Number(month) - 1, 1)).replace('.', '');
}

function InvoiceModal({ invoice, companies, onClose, onSaved }: {
  invoice?: PlatformInvoice;
  companies: { data: PlatformCompany[]; loading: boolean; error: string | null; refetch: () => void };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    companyId: invoice?.companyId ?? '',
    description: invoice?.description ?? 'Mensalidade Innovation RH',
    amount: invoice ? String(invoice.amount) : '',
    dueDate: invoice?.dueDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    billingType: invoice?.billingType ?? 'UNDEFINED' as PlatformBillingType,
    status: invoice?.status ?? 'OPEN' as PlatformInvoiceStatus,
    sendToAsaas: invoice ? false : true,
  });
  const [saving, setSaving] = useState(false);
  const selectedCompany = companies.data.find(company => company.id === form.companyId);

  async function save() {
    if (!form.companyId || !form.description.trim() || Number(form.amount) <= 0 || !form.dueDate) {
      toast.error('Preencha empresa, descricao, valor e vencimento.');
      return;
    }
    setSaving(true);
    try {
      if (invoice) {
        await api.platform.finance.update(invoice.id, {
          description: form.description.trim(),
          amount: Number(form.amount),
          dueDate: form.dueDate,
          billingType: form.billingType,
          status: form.status,
        });
      } else {
        await api.platform.finance.create({
          companyId: form.companyId,
          description: form.description.trim(),
          amount: Number(form.amount),
          dueDate: form.dueDate,
          billingType: form.billingType,
          sendToAsaas: form.sendToAsaas,
        });
      }
      toast.success(invoice ? 'Fatura atualizada.' : 'Fatura criada.');
      onSaved();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Nao foi possivel salvar a fatura.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[16px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-600">Financeiro</p>
            <h3 className="text-lg font-black text-slate-950">{invoice ? 'Editar fatura' : 'Nova cobranca'}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>

        <div className="space-y-4 p-6">
          {!invoice && companies.loading && <LoadingState label="Carregando empresas do banco..." />}
          {!invoice && companies.error && <ErrorState message={companies.error} onRetry={companies.refetch} />}
          {!invoice && !companies.loading && !companies.error && companies.data.length === 0 && (
            <EmptyState message="Nenhuma empresa cadastrada no banco. Cadastre uma empresa antes de criar a cobranca." />
          )}
          <label className="block text-xs font-bold text-slate-600">
            Empresa
            <select
              value={form.companyId}
              disabled={!!invoice || companies.loading || !!companies.error}
              onChange={event => setForm(current => ({ ...current, companyId: event.target.value }))}
              className="mt-1.5 h-11 w-full rounded-[9px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500 disabled:bg-slate-50"
            >
              <option value="">{companies.loading ? 'Carregando empresas...' : companies.error ? 'Erro ao carregar empresas' : 'Selecione uma empresa'}</option>
              {companies.data.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </label>

          {!invoice && form.companyId && !selectedCompany?.asaasCustomerId && form.sendToAsaas && (
            <p className="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Esta empresa nao possui Customer ID Asaas. Desative o envio para criar uma fatura local.
            </p>
          )}

          <label className="block text-xs font-bold text-slate-600">
            Descricao
            <input value={form.description} maxLength={180} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} className="mt-1.5 h-11 w-full rounded-[9px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-600">
              Valor
              <input type="number" min="0.01" step="0.01" value={form.amount} onChange={event => setForm(current => ({ ...current, amount: event.target.value }))} className="mt-1.5 h-11 w-full rounded-[9px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
            </label>
            <label className="block text-xs font-bold text-slate-600">
              Vencimento
              <input type="date" value={form.dueDate} onChange={event => setForm(current => ({ ...current, dueDate: event.target.value }))} className="mt-1.5 h-11 w-full rounded-[9px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-600">
              Forma de pagamento
              <select value={form.billingType} onChange={event => setForm(current => ({ ...current, billingType: event.target.value as PlatformBillingType }))} className="mt-1.5 h-11 w-full rounded-[9px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500">
                {Object.entries(BILLING_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            {invoice && (
              <label className="block text-xs font-bold text-slate-600">
                Status
                <select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value as PlatformInvoiceStatus }))} className="mt-1.5 h-11 w-full rounded-[9px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500">
                  {Object.entries(STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
                </select>
              </label>
            )}
          </div>

          {!invoice && (
            <label className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700">
              <input type="checkbox" checked={form.sendToAsaas} onChange={event => setForm(current => ({ ...current, sendToAsaas: event.target.checked }))} className="h-4 w-4 accent-teal-600" />
              Criar cobranca automaticamente no Asaas
            </label>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="h-10 rounded-[8px] border border-slate-200 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button disabled={saving || (!invoice && (companies.loading || !!companies.error || companies.data.length === 0))} onClick={save} className="crystal-button h-10 rounded-[8px] px-5 text-xs font-black text-white disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar fatura'}</button>
        </div>
      </div>
    </div>
  );
}

export default function FinancePage({ params: { tenant } }: { params: { tenant: string } }) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<PlatformInvoiceStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PlatformInvoice>();
  const [workingId, setWorkingId] = useState<string>();

  const companies = useQuery(() => api.platform.listCompanies(), []);
  const summary = useQuery(() => api.platform.finance.summary({ from, to }), [from, to]);
  const invoices = useQuery(
    () => api.platform.finance.list({ page, limit: 20, status, search: deferredSearch, from, to }),
    [page, status, deferredSearch, from, to],
  );

  function refresh() {
    invoices.refetch();
    summary.refetch();
  }

  async function remove(invoice: PlatformInvoice) {
    if (!window.confirm(`Excluir a fatura de ${invoice.company.name}?${invoice.asaasPaymentId ? '\nA cobranca aberta tambem sera cancelada no Asaas.' : ''}`)) return;
    setWorkingId(invoice.id);
    try {
      await api.platform.finance.delete(invoice.id);
      toast.success('Fatura excluida.');
      refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Nao foi possivel excluir.');
    } finally {
      setWorkingId(undefined);
    }
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

  async function exportCsv() {
    try {
      const result = await api.platform.finance.list({ limit: 100, status, search: deferredSearch, from, to });
      const rows = [
        ['Empresa', 'Documento', 'Descricao', 'Valor', 'Vencimento', 'Status', 'Forma', 'ID Asaas'],
        ...result.items.map(item => [item.company.name, item.company.document || '', item.description || '', String(item.amount), item.dueDate.slice(0, 10), item.status, item.billingType, item.asaasPaymentId || '']),
      ];
      const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `financeiro-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Nao foi possivel exportar o relatorio.');
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
          <button onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"><ArrowDownToLine size={14} /> Exportar</button>
          <button onClick={() => setCreating(true)} className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white"><Plus size={14} /> Nova cobranca</button>
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
          <button onClick={refresh} className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-slate-200 text-slate-500 hover:bg-slate-50"><RefreshCw size={14} /></button>
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
                      {invoice.invoiceUrl && <a href={invoice.invoiceUrl} target="_blank" rel="noreferrer" title="Abrir cobranca" className="rounded-[7px] p-2 text-slate-500 hover:bg-white hover:text-teal-700 hover:shadow-sm"><ExternalLink size={14} /></a>}
                      {invoice.asaasPaymentId && <button disabled={workingId === invoice.id} onClick={() => sync(invoice)} title="Sincronizar" className="rounded-[7px] p-2 text-slate-500 hover:bg-white hover:text-teal-700 hover:shadow-sm disabled:opacity-40"><RefreshCw size={14} /></button>}
                      <button onClick={() => setEditing(invoice)} title="Editar" className="rounded-[7px] p-2 text-slate-500 hover:bg-white hover:text-sky-700 hover:shadow-sm"><Pencil size={14} /></button>
                      <button disabled={workingId === invoice.id} onClick={() => remove(invoice)} title="Excluir" className="rounded-[7px] p-2 text-slate-500 hover:bg-white hover:text-rose-700 hover:shadow-sm disabled:opacity-40"><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {invoices.data && invoices.data.pagination.total > 0 && <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><span>{invoices.data.pagination.total} faturas</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage(current => current - 1)} className="rounded border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40">Anterior</button><span className="font-bold text-slate-700">{page} / {invoices.data.pagination.pages}</span><button disabled={page >= invoices.data.pagination.pages} onClick={() => setPage(current => current + 1)} className="rounded border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40">Proxima</button></div></div>}
      </section>

      {(creating || editing) && <InvoiceModal invoice={editing} companies={{ data: companies.data ?? [], loading: companies.loading, error: companies.error, refetch: companies.refetch }} onClose={() => { setCreating(false); setEditing(undefined); }} onSaved={() => { setCreating(false); setEditing(undefined); refresh(); }} />}
    </div>
  );
}
