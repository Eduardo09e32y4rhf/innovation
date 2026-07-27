'use client';

import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Copy,
  CreditCard,
  Edit2,
  ExternalLink,
  Loader2,
  MoreHorizontal,
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
import { useAuth } from '@/app/contexts/AuthContext';
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

const EMPTY_FORM = {
  companyId: '',
  amount: '',
  dueDate: '',
  description: '',
  billingType: 'UNDEFINED' as PlatformBillingType,
  sendToAsaas: true,
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

function toIsoDate(value: string) {
  return new Date(`${value}T12:00:00`).toISOString();
}

export default function FinancePage({ params: { tenant } }: { params: { tenant: string } }) {
  const { user } = useAuth();
  const role = String(user?.role || user?.profile || '').toUpperCase();
  const canManage = role === 'DEV' || role === 'COMERCIAL' || role === 'ADMIN';
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<PlatformInvoiceStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [workingId, setWorkingId] = useState<string>();
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<PlatformInvoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const summary = useQuery(() => api.platform.finance.summary({ from, to }), [from, to]);
  const invoices = useQuery(
    () => api.platform.finance.list({ page, limit: 20, status, search: deferredSearch, from, to }),
    [page, status, deferredSearch, from, to],
  );
  const companies = useQuery(() => api.platform.listCompanies(), []);

  function refresh() {
    invoices.refetch();
    summary.refetch();
    companies.refetch();
  }

  const companyById = useMemo(() => {
    return new Map((companies.data ?? []).map((company) => [company.id, company]));
  }, [companies.data]);

  function startCreate() {
    setEditingInvoice(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function startEdit(invoice: PlatformInvoice) {
    setEditingInvoice(invoice);
    setForm({
      companyId: invoice.companyId,
      amount: String(parseMoney(invoice.amount)),
      dueDate: String(invoice.dueDate).slice(0, 10),
      description: invoice.description || '',
      billingType: invoice.billingType || 'UNDEFINED',
      sendToAsaas: Boolean(invoice.asaasPaymentId),
    });
    setShowModal(true);
  }

  async function submitInvoice(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingInvoice) {
        await api.platform.finance.update(editingInvoice.id, {
          description: form.description,
          amount: parseMoney(form.amount),
          dueDate: toIsoDate(form.dueDate),
          billingType: form.billingType,
        });
        toast.success('Cobrança atualizada.');
      } else {
        await api.platform.finance.create({
          companyId: form.companyId,
          amount: parseMoney(form.amount),
          dueDate: toIsoDate(form.dueDate),
          description: form.description,
          billingType: form.billingType,
          sendToAsaas: form.sendToAsaas,
        });
        toast.success(form.sendToAsaas ? 'Cobrança enviada ao Asaas.' : 'Cobrança local registrada.');
      }
      setShowModal(false);
      setEditingInvoice(null);
      setForm(EMPTY_FORM);
      refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : editingInvoice ? 'Não foi possível atualizar.' : 'Não foi possível criar a cobrança.');
    } finally {
      setSaving(false);
    }
  }

  async function removeInvoice(invoice: PlatformInvoice) {
    if (!window.confirm(`Cancelar a cobrança ${invoice.description || 'selecionada'}?`)) return;
    setWorkingId(invoice.id);
    try {
      await api.platform.finance.delete(invoice.id);
      toast.success('Cobrança cancelada.');
      refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível cancelar.');
    } finally {
      setWorkingId(undefined);
    }
  }

  async function refundInvoice(invoice: PlatformInvoice) {
    if (!window.confirm(`Solicitar reembolso de ${money(invoice.amount)}?`)) return;
    setWorkingId(invoice.id);
    try {
      await api.platform.finance.refund(invoice.id);
      toast.success('Reembolso solicitado com sucesso.');
      refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível estornar a cobrança.');
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
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível sincronizar.');
    } finally {
      setWorkingId(undefined);
    }
  }

  async function exportPdf() {
    try {
      const result = await api.platform.finance.list({ limit: 500, status, search: deferredSearch, from, to });
      const rows = result.items.map((item) => [
        item.company?.name || 'Empresa',
        item.company?.document || '-',
        item.description || 'Mensalidade',
        money(item.amount),
        item.dueDate ? date(item.dueDate) : '-',
        STATUS[item.status]?.label ?? item.status,
        BILLING_LABEL[item.billingType] ?? item.billingType,
        item.asaasPaymentId ? 'Asaas' : 'Local',
      ].map((cell) => `<td style="padding:3px 4px;font-size:7px;color:#334155;">${escapeHtml(cell)}</td>`).join(''));
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
      toast.error('Não foi possível exportar o PDF.');
    }
  }

  async function exportCsv() {
    try {
      const result = await api.platform.finance.list({ limit: 500, status, search: deferredSearch, from, to });
      const rows = result.items.map((item) => [
        `"${item.company?.name || 'Empresa'}"`,
        `"${item.company?.document || '-'}"`,
        `"${item.description || 'Mensalidade'}"`,
        `"${Number(item.amount).toFixed(2)}"`,
        `"${item.dueDate ? date(item.dueDate) : '-'}"`,
        `"${STATUS[item.status]?.label ?? item.status}"`,
        `"${BILLING_LABEL[item.billingType] ?? item.billingType}"`,
        `"${item.asaasPaymentId ? 'Asaas' : 'Local'}"`,
      ].join(','));
      const header = '"Empresa","Documento","Cobrança","Valor R$","Vencimento","Status","Forma","Integração"\n';
      const csv = '\uFEFF' + header + rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `extrato-bancario-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success('Extrato bancário (CSV/Excel) gerado com sucesso!');
    } catch {
      toast.error('Não foi possível gerar o extrato bancário.');
    }
  }

  const totals = summary.data?.totals;
  const chartData = summary.data?.monthly.map((item) => ({ ...item, label: monthLabel(item.month) })) ?? [];
  const chartMax = Math.max(1, ...chartData.flatMap((item) => [item.billed, item.received]));
  const recentInvoices = invoices.data?.items ?? [];

  if (invoices.error) {
    return <div className="mx-auto w-full py-6"><ErrorState message={invoices.error} onRetry={invoices.refetch} /></div>;
  }

  return (
    <div className="mx-auto w-full space-y-6 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">Controle da operacao</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Gestao da Plataforma</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Cobranças, reembolsos e sincronização Asaas em um painel único e prático.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <button onClick={startCreate} className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-teal-600 px-4 text-xs font-black text-white hover:bg-teal-700 shadow-sm">
              <Plus size={14} /> Nova cobrança
            </button>
          )}
          <button onClick={exportPdf} className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
            <ArrowDownToLine size={14} className="text-slate-500" /> Exportar PDF/HTML
          </button>
          <button onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-sm">
            <ArrowDownToLine size={14} className="text-emerald-600" /> Extrato Bancário (CSV)
          </button>
        </div>
      </header>

      {companies.loading || summary.loading ? <LoadingState label="Carregando financeiro..." /> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'MRR Contratado', value: summary.data?.mrr, icon: TrendingUp, tone: 'bg-violet-950 text-white' },
          { label: 'Faturado', value: totals?.billed, icon: WalletCards, tone: 'bg-slate-950 text-white' },
          { label: 'Recebido', value: totals?.received, icon: CheckCircle2, tone: 'bg-emerald-600 text-white' },
          { label: 'A receber', value: totals?.open, icon: Banknote, tone: 'bg-white text-slate-950' },
          { label: 'Em atraso', value: totals?.overdue, icon: CalendarDays, tone: 'bg-rose-50 text-rose-950' },
        ].map((card) => (
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
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Conversao</p>
              <h3 className="mt-1 text-lg font-black text-slate-950">Receita confirmada</h3>
            </div>
            <TrendingUp size={20} className="text-teal-600" />
          </div>
          <div className="mt-8 flex items-end gap-3">
            <span className="text-5xl font-black text-slate-950">{summary.data?.conversionRate ?? 0}%</span>
            <span className="pb-1 text-xs font-bold text-slate-400">do faturado</span>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${Math.min(summary.data?.conversionRate ?? 0, 100)}%` }} />
          </div>
          <p className="mt-4 text-xs text-slate-500">{summary.data?.count ?? 0} faturas no periodo selecionado.</p>
        </div>

        <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ultimos meses</p>
              <h3 className="mt-1 text-lg font-black text-slate-950">Faturado x recebido</h3>
            </div>
            <MoreHorizontal className="text-slate-300" />
          </div>
          <div className="h-52">
            {chartData.length ? (
              <div className="flex h-full items-end gap-2 border-b border-slate-200 pt-3">
                {chartData.map((item) => (
                  <div key={item.month} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${item.label}: ${money(item.billed)} faturado / ${money(item.received)} recebido`}>
                    <div className="flex flex-1 items-end justify-center gap-1">
                      <div className="w-[38%] rounded-t bg-slate-900 transition-all" style={{ height: `${Math.max(3, (item.billed / chartMax) * 100)}%` }} />
                      <div className="w-[38%] rounded-t bg-teal-500 transition-all" style={{ height: `${Math.max(3, (item.received / chartMax) * 100)}%` }} />
                    </div>
                    <span className="mt-2 truncate text-center text-[10px] font-bold text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">Sem dados para o grafico.</div>
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar empresa ou CNPJ..."
              className="h-10 w-full rounded-[8px] border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-teal-500"
            />
          </div>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as PlatformInvoiceStatus | '');
              setPage(1);
            }}
            className="h-10 rounded-[8px] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
          </select>
          <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className="h-10 rounded-[8px] border border-slate-200 px-3 text-xs text-slate-600 outline-none" />
          <input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className="h-10 rounded-[8px] border border-slate-200 px-3 text-xs text-slate-600 outline-none" />
          <button onClick={refresh} className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-slate-200 text-slate-500 hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
        </div>

        {invoices.loading ? (
          <div className="p-10"><LoadingState label="Carregando financeiro..." /></div>
        ) : !recentInvoices.length ? (
          <div className="p-10"><EmptyState message="Nenhuma fatura encontrada para estes filtros." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3">Empresa</th>
                  <th className="px-4 py-3">Cobrança</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Integração</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInvoices.map((invoice) => (
                  <tr key={invoice.id} className="group hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="text-sm font-black text-slate-900">{invoice.company.name}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{invoice.company.document || 'Sem documento'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="max-w-[230px] truncate text-xs font-bold text-slate-700">{invoice.description || 'Mensalidade'}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{BILLING_LABEL[invoice.billingType]}</p>
                    </td>
                    <td className="px-4 py-4 text-xs font-bold text-slate-600">{date(invoice.dueDate)}</td>
                    <td className="px-4 py-4 text-sm font-black text-slate-950">{money(invoice.amount)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${STATUS[invoice.status].className}`}>{STATUS[invoice.status].label}</span>
                    </td>
                    <td className="px-4 py-4">
                      {invoice.asaasPaymentId ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700"><span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> Asaas</span> : <span className="text-[10px] font-bold text-slate-400">Local</span>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        {invoice.invoiceUrl && (
                          <>
                            <button type="button" onClick={() => navigator.clipboard.writeText(invoice.invoiceUrl || '').then(() => toast.success('Link copiado.'))} className="rounded-[7px] p-2 text-slate-500 hover:bg-white hover:text-teal-700 hover:shadow-sm" title="Copiar link">
                              <Copy size={14} />
                            </button>
                            <a href={invoice.invoiceUrl} target="_blank" rel="noreferrer" className="rounded-[7px] p-2 text-slate-500 hover:bg-white hover:text-teal-700 hover:shadow-sm" title="Abrir">
                              <ExternalLink size={14} />
                            </a>
                          </>
                        )}
                        {canManage && (
                          <>
                            <button type="button" onClick={() => startEdit(invoice)} className="rounded-[7px] p-2 text-slate-500 hover:bg-white hover:text-violet-700 hover:shadow-sm" title="Editar">
                              <Edit2 size={14} />
                            </button>
                            {invoice.status !== 'CANCELED' && (
                              <button type="button" onClick={() => removeInvoice(invoice)} disabled={workingId === invoice.id} className="rounded-[7px] p-2 text-slate-500 hover:bg-white hover:text-rose-700 hover:shadow-sm disabled:opacity-40" title="Cancelar / Excluir">
                                <Trash2 size={14} />
                              </button>
                            )}
                            {invoice.status === 'PAID' && (
                              <button type="button" onClick={() => refund(invoice)} disabled={workingId === invoice.id} className="rounded-[7px] p-2 text-slate-500 hover:bg-white hover:text-amber-700 hover:shadow-sm disabled:opacity-40" title="Reembolsar (Estorno 7 dias)">
                                {workingId === invoice.id ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />}
                              </button>
                            )}
                          </>
                        )}
                        {invoice.asaasPaymentId && canManage && (
                          <button type="button" disabled={workingId === invoice.id} onClick={() => sync(invoice)} title="Sincronizar Asaas" className="rounded-[7px] p-2 text-slate-500 hover:bg-white hover:text-teal-700 hover:shadow-sm disabled:opacity-40">
                            {workingId === invoice.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {invoices.data && invoices.data.pagination.total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            <span>{invoices.data.pagination.total} faturas</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40">Anterior</button>
              <span className="font-bold text-slate-700">{page} / {invoices.data.pagination.pages}</span>
              <button disabled={page >= invoices.data.pagination.pages} onClick={() => setPage((current) => current + 1)} className="rounded border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40">Proxima</button>
            </div>
          </div>
        )}
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-[20px] bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-black text-slate-900">{editingInvoice ? 'Editar cobrança' : 'Nova cobrança'}</h2>
                <p className="mt-1 text-xs text-slate-500">{editingInvoice ? 'Ajuste valor, vencimento ou descrição.' : 'Crie uma cobrança local ou envie ao Asaas.'}</p>
              </div>
              <button onClick={() => { setShowModal(false); setEditingInvoice(null); setForm(EMPTY_FORM); }} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={18} />
              </button>
            </header>
            <form onSubmit={submitInvoice} className="space-y-4 p-6">
              {!editingInvoice && (
                <label className="block text-xs font-bold text-slate-600">
                  Empresa
                  <select required value={form.companyId} onChange={(event) => setForm({ ...form, companyId: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900">
                    <option value="">Selecione</option>
                    {((companies.data ?? []).filter((company: PlatformCompany) => company.status === 'ACTIVE')).map((company) => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </label>
              )}
              {editingInvoice && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Empresa vinculada: <span className="font-bold text-slate-900">{companyById.get(editingInvoice.companyId)?.name || editingInvoice.company.name}</span>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-600">
                  Valor
                  <input required min="0.01" step="0.01" type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900" />
                </label>
                <label className="block text-xs font-bold text-slate-600">
                  Vencimento
                  <input required type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900" />
                </label>
              </div>
              <label className="block text-xs font-bold text-slate-600">
                Descrição
                <input required minLength={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900" placeholder="Mensalidade, taxa extra..." />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-600">
                  Forma de cobrança
                  <select value={form.billingType} onChange={(event) => setForm({ ...form, billingType: event.target.value as PlatformBillingType })} className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900">
                    <option value="UNDEFINED">Cliente escolhe</option>
                    <option value="PIX">PIX</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="CREDIT_CARD">Cartão</option>
                  </select>
                </label>
                {!editingInvoice ? (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3">
                    <input type="checkbox" checked={form.sendToAsaas} onChange={(event) => setForm({ ...form, sendToAsaas: event.target.checked })} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600" />
                    <span>
                      <span className="block text-sm font-black text-slate-900">Enviar automaticamente ao Asaas</span>
                      <span className="mt-1 block text-xs text-slate-600">Cria a cobrança no Asaas e salva o ID para sincronização por webhook.</span>
                    </span>
                  </label>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    Cobranças já criadas no Asaas podem ser ajustadas sem recriar a fatura.
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingInvoice(null); setForm(EMPTY_FORM); }} className="flex-1 rounded-xl bg-slate-100 py-3 text-xs font-bold text-slate-600 hover:bg-slate-200">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="crystal-button flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-black text-white disabled:opacity-60">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editingInvoice ? 'Salvar alterações' : 'Gerar cobrança'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
