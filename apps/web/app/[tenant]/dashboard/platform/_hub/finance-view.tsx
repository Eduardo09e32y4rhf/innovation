'use client';

import { ExternalLink, FileDown } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { api, type PlatformInvoiceStatus } from '@/app/lib/api';
import { INVOICE_STATUS, date, dateTime, errorText, money } from './format';

const STATUSES: [PlatformInvoiceStatus | '', string][] = [['', 'Todas'], ['OPEN', 'Em aberto'], ['OVERDUE', 'Vencidas'], ['PAID', 'Pagas'], ['CANCELED', 'Canceladas']];

function Integration({ companyId, canRetry }: { companyId?: string; canRetry: boolean }) {
  const events = useQuery(() => api.platform.finance.webhookEvents({ companyId, limit: 15 }), [companyId]);
  if (events.error) return <ErrorState message={events.error} onRetry={events.refetch} />;
  const rows = events.data ?? [];
  return (
    <details className="card-v2 p-4">
      <summary className="cursor-pointer text-sm font-semibold">Integração de pagamentos ({rows.filter((row) => row.status === 'FAILED').length} com falha)</summary>
      <ul className="mt-3 divide-y divide-border text-sm">
        {rows.map((event) => (
          <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="min-w-0"><span className="font-medium">{event.eventType}</span> <span className="text-fg-sub">· {event.company?.name ?? 'sem empresa'} · {dateTime(event.createdAt)}</span>{event.errorMessage && <span className="block truncate text-xs text-rose-700">{event.errorMessage}</span>}</span>
            <span className="flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs ${event.status === 'FAILED' ? 'bg-rose-50 text-rose-700' : event.status === 'PROCESSED' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>{event.status}</span>
              {canRetry && event.status === 'FAILED' && <Button size="sm" variant="outline" onClick={async () => { try { await api.platform.finance.retryWebhookEvent(event.id); toast.success('Evento reenviado para processamento.'); events.refetch(); } catch (cause) { toast.error(errorText(cause, 'Não foi possível reprocessar.')); } }}>Reprocessar</Button>}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="py-3 text-fg-sub">Nenhum evento recente.</li>}
      </ul>
    </details>
  );
}

export function FinanceView({ companyId, role }: { companyId?: string; role: string }) {
  const [status, setStatus] = useState<PlatformInvoiceStatus | ''>('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const summary = useQuery(() => api.platform.finance.summary({ companyId }), [companyId]);
  const invoices = useQuery(() => api.platform.finance.list({ page, limit: 12, status, companyId }), [page, status, companyId]);
  const canWrite = ['DEV', 'CEO'].includes(role);
  const s = summary.data;
  const pages = invoices.data?.pagination.pages ?? 1;

  async function act(id: string, action: () => Promise<unknown>, success: string) {
    setBusy(id);
    try { await action(); toast.success(success); invoices.refetch(); summary.refetch(); }
    catch (cause) { toast.error(errorText(cause, 'Não foi possível concluir.')); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      {s && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[['Faturado', money(s.totals.billed)], ['Recebido', money(s.totals.received)], ['Em aberto', money(s.totals.open)], ['Em atraso', money(s.totals.overdue)], ['Receita recorrente', money(s.mrr)]].map(([label, value]) => <div key={label} className="card-v2 p-4"><p className="text-sm text-fg-sub">{label}</p><p className={`mt-1 text-lg font-semibold tabular-nums ${label === 'Em atraso' && s.totals.overdue > 0 ? 'text-rose-600' : ''}`}>{value}</p></div>)}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="flex flex-wrap gap-1.5">
          {STATUSES.map(([value, label]) => <button key={label} role="tab" aria-selected={status === value} type="button" onClick={() => { setStatus(value); setPage(1); }} className={`rounded-full border px-3 py-1.5 text-sm ${status === value ? 'border-purple-600 bg-purple-600 text-white' : 'border-border hover:bg-bg-sub'}`}>{label}</button>)}
        </div>
        <Button variant="outline" onClick={async () => { try { await api.platform.finance.downloadStatementPdf({ status, companyId }); } catch (cause) { toast.error(errorText(cause, 'Não foi possível gerar o extrato.')); } }}><FileDown size={15} aria-hidden="true" /> Extrato PDF</Button>
      </div>

      {invoices.error && <ErrorState message={invoices.error} onRetry={invoices.refetch} />}
      {invoices.loading && !invoices.data ? <LoadingState label="Carregando faturas…" /> : (invoices.data?.items.length ?? 0) === 0 ? <EmptyState message="Nenhuma fatura encontrada." /> : (
        <div className="card-v2 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Faturas</caption>
            <thead className="border-b border-border bg-bg-sub text-xs text-fg-sub"><tr>{['Empresa', 'Vencimento', 'Valor', 'Situação', 'Pago em', ''].map((label, index) => <th key={index} scope="col" className="px-3 py-2.5 font-medium">{label}</th>)}</tr></thead>
            <tbody>
              {invoices.data?.items.map((invoice) => {
                const tone = INVOICE_STATUS[invoice.status] ?? { label: invoice.status, tone: 'bg-zinc-100' };
                return (
                  <tr key={invoice.id} className="border-b border-border last:border-0">
                    <th scope="row" className="px-3 py-2.5 text-left font-medium">{invoice.company.name}<span className="block text-xs font-normal text-fg-sub">{invoice.description ?? invoice.plan?.name ?? ''}</span></th>
                    <td className="px-3 py-2.5">{date(invoice.dueDate)}</td><td className="px-3 py-2.5 tabular-nums">{money(invoice.amount)}</td>
                    <td className="px-3 py-2.5"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone.tone}`}>{tone.label}</span></td>
                    <td className="px-3 py-2.5 text-fg-sub">{invoice.paidAt ? date(invoice.paidAt) : '—'}</td>
                    <td className="px-3 py-2.5"><div className="flex justify-end gap-1.5">
                      {invoice.invoiceUrl && <a className="btn btn-ghost btn-sm" href={invoice.invoiceUrl} target="_blank" rel="noreferrer noopener" aria-label="Abrir fatura"><ExternalLink size={14} /></a>}
                      {canWrite && invoice.asaasPaymentId && <Button size="sm" variant="ghost" isLoading={busy === invoice.id} onClick={() => act(invoice.id, () => api.platform.finance.sync(invoice.id), 'Fatura sincronizada.')}>Sincronizar</Button>}
                      {canWrite && invoice.status === 'PAID' && <Button size="sm" variant="ghost" className="text-rose-700" onClick={() => { if (window.confirm('Solicitar estorno desta fatura?')) void act(invoice.id, () => api.platform.finance.refund(invoice.id), 'Estorno solicitado.'); }}>Estornar</Button>}
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && <nav aria-label="Paginação" className="flex items-center justify-between text-sm"><Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button><span>Página {page} de {pages}</span><Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Próxima</Button></nav>}
      {canWrite && <Integration companyId={companyId} canRetry={role === 'DEV'} />}
    </div>
  );
}
