'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, Download, FileText, Receipt, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import api, { ApiError, type CompanyBillingResult, type PlatformInvoice } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { hasPermission } from '@/app/lib/permissions';
import CompanyPlanActions from './_company-plan';

type Tab = 'abertas' | 'pagas' | 'comprovantes' | 'notas';

const TABS: { id: Tab; label: string }[] = [
  { id: 'abertas', label: 'Em aberto' },
  { id: 'pagas', label: 'Pagas' },
  { id: 'comprovantes', label: 'Comprovantes' },
  { id: 'notas', label: 'Notas fiscais' },
];

const brl = (value: number | string) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const day = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-');

function statusBadge(invoice: PlatformInvoice) {
  if (invoice.status === 'PAID') return <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">Paga</span>;
  if (invoice.status === 'OVERDUE') return <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-600">Vencida</span>;
  if (invoice.status === 'CANCELED') return <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-semibold text-fg-mut">Cancelada</span>;
  return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600">Aberta</span>;
}

function LinkButton({ href, children }: { href?: string | null; children: React.ReactNode }) {
  if (!href) return <span className="text-xs text-fg-mut">Indisponível</span>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-outline inline-flex items-center gap-1.5 text-xs">{children}</a>;
}

/** Sem companyId: faturas da própria empresa. Com companyId: ficha de uma empresa na visão plataforma (somente leitura). */
export default function CompanyInvoicesView({ companyId, rowActions, reloadKey = 0 }: { companyId?: string; rowActions?: (invoice: PlatformInvoice) => React.ReactNode; reloadKey?: number } = {}) {
  const { user } = useAuth();
  const canPay = !companyId && hasPermission(user, 'faturas.pagar');
  const canChangePlan = !companyId && hasPermission(user, 'faturas.plano');
  const [tab, setTab] = useState<Tab>('abertas');
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [billing, setBilling] = useState<CompanyBillingResult>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (companyId) {
        setInvoices(await api.faturas.companyInvoices(companyId));
        setBilling(undefined);
      } else {
        const [list, status] = await Promise.all([api.faturas.empresaInvoices(), api.faturas.empresaStatus()]);
        setInvoices(list);
        setBilling(status);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível carregar as faturas.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { void load(); }, [load, reloadKey]);

  const groups = useMemo(() => {
    const paid = invoices.filter((i) => i.status === 'PAID');
    return {
      abertas: invoices.filter((i) => i.status === 'OPEN' || i.status === 'OVERDUE'),
      pagas: paid,
      comprovantes: paid,
      notas: invoices.filter((i) => i.fiscalPdfUrl || i.fiscalXmlUrl || i.invoiceNumber),
    } satisfies Record<Tab, PlatformInvoice[]>;
  }, [invoices]);

  const rows = groups[tab];
  const overdue = groups.abertas.filter((i) => i.status === 'OVERDUE');
  const sub = billing?.subscription;

  async function pay(invoice: PlatformInvoice) {
    if (invoice.invoiceUrl) { window.open(invoice.invoiceUrl, '_blank', 'noopener,noreferrer'); return; }
    try {
      const result = await api.faturas.empresaCheckout();
      const link = result.paymentUrl || result.invoice?.invoiceUrl;
      if (link) window.open(link, '_blank', 'noopener,noreferrer');
      else toast.error('O provedor não retornou o link de pagamento.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Não foi possível gerar o link de pagamento.');
    }
  }

  return (
    <div className="space-y-4 p-3 sm:p-5 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-fg"><Receipt size={20} aria-hidden="true" /> {companyId ? 'Faturas da empresa' : 'Faturas'}</h1>
          <p className="text-sm text-fg-mut">Faturas, comprovantes e notas fiscais {companyId ? 'desta empresa' : 'da sua empresa'}.</p>
        </div>
        {canChangePlan && <CompanyPlanActions currentSeats={billing?.subscription?.seatQuantity} onDone={() => void load()} />}
        <button type="button" onClick={() => void load()} disabled={loading} className="btn btn-outline inline-flex items-center gap-1.5 text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Atualizar
        </button>
      </header>

      {sub && (
        <section className="card-v2 grid gap-3 p-4 sm:grid-cols-3">
          <div><p className="text-xs text-fg-mut">Plano</p><p className="font-semibold text-fg">{billing?.plan?.name ?? '-'}</p></div>
          <div><p className="text-xs text-fg-mut">Próximo vencimento</p><p className="font-semibold text-fg">{day(sub.nextDueDate)}</p></div>
          <div><p className="text-xs text-fg-mut">Usuários contratados</p><p className="font-semibold text-fg">{sub.seatQuantity}</p></div>
        </section>
      )}

      {overdue.length > 0 && (
        <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm font-semibold text-rose-600">
          Você tem {overdue.length} fatura(s) vencida(s). Regularize para evitar o bloqueio do acesso.
        </p>
      )}

      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`btn text-sm ${tab === t.id ? 'btn-primary' : 'btn-outline'}`}>
            {t.label} <span className="ml-1 opacity-70">{groups[t.id].length}</span>
          </button>
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {loading && !invoices.length ? <p role="status" className="text-sm text-fg-mut">Carregando faturas...</p> : (
        <section className="card-v2 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-fg-mut">
              <tr>
                <th className="p-3">Descrição</th>
                <th className="p-3">{tab === 'abertas' ? 'Vencimento' : 'Pago em'}</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">{tab === 'notas' ? 'Nota fiscal' : tab === 'comprovantes' ? 'Comprovante' : 'Ação'}</th>
                {rowActions && <th className="p-3 text-right">Ajustes</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((invoice) => (
                <tr key={invoice.id} className="border-t border-line">
                  <td className="p-3 text-fg">{invoice.description || 'Mensalidade Innovation RH'}</td>
                  <td className="p-3 text-fg-sub">{tab === 'abertas' ? day(invoice.dueDate) : day(invoice.paidAt ?? invoice.dueDate)}</td>
                  <td className="p-3 font-semibold text-fg">{brl(invoice.amount)}</td>
                  <td className="p-3">{statusBadge(invoice)}</td>
                  <td className="p-3 text-right">
                    {tab === 'abertas' && (canPay
                      ? <button type="button" onClick={() => void pay(invoice)} className="btn btn-primary inline-flex items-center gap-1.5 text-xs"><CreditCard size={13} aria-hidden="true" /> Pagar</button>
                      : <span className="text-xs text-fg-mut">Sem permissão para pagar</span>)}
                    {tab === 'pagas' && <LinkButton href={invoice.receiptUrl || invoice.invoiceUrl}><Download size={13} aria-hidden="true" /> Recibo</LinkButton>}
                    {tab === 'comprovantes' && <LinkButton href={invoice.receiptUrl}><Download size={13} aria-hidden="true" /> Baixar</LinkButton>}
                    {tab === 'notas' && (
                      <span className="inline-flex flex-wrap justify-end gap-2">
                        {invoice.invoiceNumber && <span className="self-center text-xs text-fg-mut">Nº {invoice.invoiceNumber}</span>}
                        <LinkButton href={invoice.fiscalPdfUrl}><FileText size={13} aria-hidden="true" /> PDF</LinkButton>
                        {invoice.fiscalXmlUrl && <LinkButton href={invoice.fiscalXmlUrl}><FileText size={13} aria-hidden="true" /> XML</LinkButton>}
                      </span>
                    )}
                  </td>
                  {rowActions && <td className="p-3 text-right">{rowActions(invoice)}</td>}
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={rowActions ? 6 : 5} className="p-6 text-center text-fg-mut">Nada por aqui ainda.</td></tr>}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
