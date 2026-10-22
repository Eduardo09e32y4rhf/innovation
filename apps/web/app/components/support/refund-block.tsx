'use client';
import React, { useState } from 'react';
import { Banknote, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/app/lib/api';
import { useAction } from '@/app/hooks/use-action';
import { useConfirm } from '@/app/components/ui/confirm-provider';
import type { SupportTicket } from './support-model';
import {
  formatBRL, getRefundStatusLabel, getRefundStatusTone, hasRefund, refundDecisionActions, refundDecisionError, refundKindLabel,
} from './refund-model';

const TONE: Record<string, string> = {
  info: 'bg-sky-100 text-sky-800', brand: 'bg-blue-100 text-blue-800', warning: 'bg-amber-100 text-amber-800', violet: 'bg-violet-100 text-violet-800',
  success: 'bg-emerald-100 text-emerald-800', danger: 'bg-rose-100 text-rose-800', neutral: 'bg-slate-100 text-slate-700',
};
const BTN = 'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand';

/** Pedido de reembolso dentro da conversa. Na plataforma, mostra Aprovar e Recusar. */
export function RefundBlock({ ticket, userId, isPlatform, onChanged }: { ticket: SupportTicket; userId?: string; isPlatform: boolean; onChanged: () => void }) {
  const confirm = useConfirm();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const actions = refundDecisionActions(ticket, userId, isPlatform);

  const decide = useAction(async (kind: 'approve' | 'reject') => {
    const amount = formatBRL(ticket.refundAmount);
    if (kind === 'reject' && reason.trim().length < 3) { toast.error('Informe o motivo da recusa (mínimo de 3 caracteres).'); return; }
    const ok = await confirm(kind === 'approve'
      ? { title: 'Aprovar reembolso?', description: `Será pedido ao provedor de pagamento o estorno de ${amount}. Esta ação não pode ser desfeita.`, confirmText: 'Aprovar reembolso', variant: 'primary' }
      : { title: 'Recusar reembolso?', description: `O cliente será avisado com o motivo informado.`, confirmText: 'Recusar reembolso', variant: 'danger' });
    if (!ok) return;
    try {
      if (kind === 'approve') await api.platformSupport.approveRefund(ticket.id);
      else await api.platformSupport.rejectRefund(ticket.id, reason.trim());
      toast.success(kind === 'approve' ? 'Aprovação registrada.' : 'Reembolso recusado.');
      setRejecting(false); setReason('');
    } catch (err) { toast.error(refundDecisionError(err)); }
    onChanged();
  });

  if (!hasRefund(ticket)) return null;
  const status = ticket.refundStatus as string;
  const rows: Array<[string, string]> = [
    ['Fatura', ticket.invoiceId ? `#${ticket.invoiceId.slice(0, 8).toUpperCase()}` : '—'],
    ['Valor', formatBRL(ticket.refundAmount)],
    ['Tipo', refundKindLabel(ticket.refundKind)],
  ];
  return (
    <section aria-label="Pedido de reembolso" className="mt-4 rounded-xl border border-border bg-bg-elev p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-1.5 text-sm font-extrabold text-fg"><Banknote size={16} aria-hidden />Reembolso</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE[getRefundStatusTone(status)]}`}>{getRefundStatusLabel(status)}</span>
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
        {rows.map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-slate-500">{k}</dt><dd className="truncate font-semibold text-fg">{v}</dd></div>)}
      </dl>
      {status === 'REJECTED' && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-800"><strong>Motivo da recusa:</strong> {ticket.refundDecisionReason || 'não informado'}</p>}
      {status === 'FAILED' && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-800">O provedor de pagamento não concluiu o estorno. Nossa equipe entrará em contato.</p>}
      {status === 'AWAITING_SECOND_APPROVAL' && !isPlatform && <p className="mt-2 text-xs text-slate-600">Pelo valor, o pedido precisa de uma segunda aprovação da nossa equipe.</p>}
      {actions.hint && <p role="note" className="mt-2 text-xs text-slate-600">{actions.hint}</p>}
      {(actions.canApprove || actions.canReject) && (
        <div className="mt-3 flex flex-wrap items-start gap-2">
          {actions.canApprove && <button type="button" disabled={decide.busy} onClick={() => void decide.run('approve')} className={`${BTN} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700`}><Check size={14} aria-hidden />Aprovar</button>}
          {actions.canReject && <button type="button" aria-expanded={rejecting} disabled={decide.busy} onClick={() => setRejecting((v) => !v)} className={`${BTN} border-border bg-bg-elev text-fg hover:bg-bg-sub`}><X size={14} aria-hidden />Recusar</button>}
        </div>
      )}
      {rejecting && actions.canReject && (
        <form className="mt-2 flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); void decide.run('reject'); }}>
          <label htmlFor={`refund-reject-${ticket.id}`} className="text-xs font-semibold text-slate-600">Motivo da recusa (obrigatório, o cliente verá)</label>
          <textarea id={`refund-reject-${ticket.id}`} required minLength={3} maxLength={2000} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="input-v2 w-full resize-none py-2 text-sm" />
          <button type="submit" disabled={decide.busy || reason.trim().length < 3} className={`${BTN} self-start border-rose-600 bg-rose-600 text-white hover:bg-rose-700`}>Confirmar recusa</button>
        </form>
      )}
    </section>
  );
}
