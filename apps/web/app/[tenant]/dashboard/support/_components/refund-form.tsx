'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api, type PlatformInvoice } from '@/app/lib/api';
import { useQuery } from '@/app/hooks/use-data';
import {
  REFUND_RULE_TEXT, formatBRL, listRefundableInvoices, parseAmount, refundRuleHint, refundableBalance, validateRefundForm,
} from '@/app/components/support/refund-model';

export const REFUND_FORM_ID = 'support-refund-form';

/** Pedido de reembolso (só administrador): fatura paga, total ou parcial, valor e motivo. */
export function RefundForm({ onCreated, onBusyChange }: { onCreated: (ticketNumber?: string) => void; onBusyChange: (busy: boolean) => void }) {
  const invoices = useQuery(() => api.faturas.empresaInvoices(), []);
  const list = useMemo(() => listRefundableInvoices(Array.isArray(invoices.data) ? invoices.data : []), [invoices.data]);
  const [invoiceId, setInvoiceId] = useState('');
  const [kind, setKind] = useState<'TOTAL' | 'PARTIAL'>('TOTAL');
  const [amountText, setAmountText] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const invoice: PlatformInvoice | undefined = list.find((i) => i.id === invoiceId);
  const available = invoice ? refundableBalance(invoice) : 0;

  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const problem = validateRefundForm({ invoiceId, kind, amountText, reason, available });
    setError(problem);
    if (problem) return;
    setBusy(true);
    try {
      const ticket = await api.support.requestRefund({ invoiceId, kind, amount: kind === 'PARTIAL' ? parseAmount(amountText) : undefined, reason: reason.trim() });
      toast.success(`Pedido de reembolso enviado${ticket?.ticketNumber ? ` (${ticket.ticketNumber})` : ''}.`);
      onCreated(ticket?.ticketNumber);
    } catch (err) {
      const message = (err as Error)?.message || 'Não foi possível enviar o pedido de reembolso.';
      setError(message); toast.error(message);
    } finally { setBusy(false); }
  };

  return (
    <form id={REFUND_FORM_ID} onSubmit={submit} className="space-y-4" noValidate>
      <h3 className="text-sm font-black text-fg">Pedir reembolso</h3>
      <p className="rounded-xl bg-bg-sub p-3 text-xs text-fg">{REFUND_RULE_TEXT}</p>
      {invoices.loading && !invoices.data && <p role="status" className="text-sm text-slate-500">Carregando faturas...</p>}
      {invoices.error && <p role="alert" className="text-sm text-rose-700">{invoices.error}</p>}
      {!invoices.loading && !invoices.error && list.length === 0 && <p className="text-sm text-slate-600">Não há faturas pagas com saldo para reembolso.</p>}
      {list.length > 0 && (
        <fieldset className="space-y-2" disabled={busy}>
          <legend className="mb-1 text-sm font-medium text-fg">Fatura paga</legend>
          {list.map((i) => (
            <label key={i.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 px-3 py-2.5 ${invoiceId === i.id ? 'border-brand bg-brand/10' : 'border-border hover:bg-bg-sub'}`}>
              <input type="radio" name="refund-invoice" className="mt-1" checked={invoiceId === i.id} onChange={() => setInvoiceId(i.id)} />
              <span className="min-w-0 text-sm"><strong className="block truncate">{i.description || 'Fatura'}</strong>
                <span className="text-xs text-slate-600">Pago em {i.paidAt ? new Date(i.paidAt).toLocaleDateString('pt-BR') : '—'} · {formatBRL(i.amount)} · saldo {formatBRL(refundableBalance(i))}</span></span>
            </label>
          ))}
        </fieldset>
      )}
      {invoice && (
        <>
          <p role="note" className="text-xs font-semibold text-slate-700">{refundRuleHint(invoice.paidAt)}</p>
          <fieldset className="flex flex-wrap gap-4" disabled={busy}>
            <legend className="mb-1 text-sm font-medium text-fg">Tipo</legend>
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="refund-kind" checked={kind === 'TOTAL'} onChange={() => setKind('TOTAL')} />Total ({formatBRL(available)})</label>
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="refund-kind" checked={kind === 'PARTIAL'} onChange={() => setKind('PARTIAL')} />Parcial</label>
          </fieldset>
          {kind === 'PARTIAL' && (
            <div>
              <label htmlFor="refund-amount" className="mb-1 block text-sm font-medium text-fg">Valor a devolver (R$)</label>
              <input id="refund-amount" inputMode="decimal" autoComplete="off" value={amountText} onChange={(e) => setAmountText(e.target.value)} placeholder="Ex.: 150,00" className="input-v2 h-11 w-full" />
            </div>
          )}
          <div>
            <label htmlFor="refund-reason" className="mb-1 block text-sm font-medium text-fg">Motivo (obrigatório)</label>
            <textarea id="refund-reason" rows={4} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Conte por que você está pedindo o reembolso." className="input-v2 w-full resize-none py-3" />
          </div>
        </>
      )}
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    </form>
  );
}
