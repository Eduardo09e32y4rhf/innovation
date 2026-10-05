"use client";

import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { Check, X, FileText, PartyPopper, Megaphone, Gavel, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

const PRIORITY: Record<string, number> = { SUSPENSION_NOTICE: 0, WARNING_NOTICE: 1, PROMOTION_NOTICE: 2 };

const fmtDate = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('pt-BR');
};

/** Tudo que o RH envia aparece assim que a pessoa entra, até ela confirmar. */
export function PendingNotificationsGate({ children }: { children: ReactNode }) {
  const { data: widget, refetch } = useQuery(() => api.notifications.dashboardWidget(), [], { pollMs: 30000 });
  const [error, setError] = useState('');
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState('');

  const respondMut = useMutation(
    ({ id, action, reason: why }: { id: string; action: 'ACKNOWLEDGE' | 'ACCEPT' | 'REFUSE' | 'READ'; reason?: string }) =>
      action === 'READ' ? api.notifications.markAsRead(id) : api.notifications.respond(id, action, why),
    {
      onSuccess: () => { setError(''); setRefusing(false); setReason(''); refetch(); },
      onError: (err) => setError(typeof err === 'string' ? err : 'Não foi possível registrar sua resposta. Tente novamente.'),
    },
  );

  const pending = (widget?.notifications ?? []).filter((n: any) => ['PENDING_RESPONSE', 'UNREAD'].includes(n.recipients?.[0]?.status) && n.source === 'MANUAL');
  const current = [...pending].sort((a: any, b: any) => {
    const sa = a.recipients?.[0]?.status === 'PENDING_RESPONSE' ? 0 : 1;
    const sb = b.recipients?.[0]?.status === 'PENDING_RESPONSE' ? 0 : 1;
    return sa - sb || (PRIORITY[a.type] ?? 9) - (PRIORITY[b.type] ?? 9);
  })[0];

  if (!current) return <>{children}</>;

  const needsConfirm = current.recipients?.[0]?.status === 'PENDING_RESPONSE';
  const extra = current.extraJson ?? {};
  const isWarning = current.type === 'WARNING_NOTICE';
  const isSuspension = current.type === 'SUSPENSION_NOTICE';
  const isPromotion = current.type === 'PROMOTION_NOTICE';
  const isPenalty = isWarning || isSuspension;
  const busy = respondMut.loading;
  const act = (action: 'ACKNOWLEDGE' | 'ACCEPT' | 'REFUSE' | 'READ') => { setError(''); respondMut.mutate({ id: current.id, action, reason: action === 'REFUSE' ? reason.trim() : undefined }).catch(() => undefined); };

  const Icon = isPenalty ? Gavel : isPromotion ? PartyPopper : Megaphone;
  const tone = isPenalty ? 'border-slate-900' : isPromotion ? 'border-emerald-500' : 'border-teal-600';
  const heading = isWarning ? 'Advertência' : isSuspension ? 'Suspensão disciplinar' : isPromotion ? 'Parabéns pela promoção!' : 'Comunicado da empresa';

  return (
    <>
      {children}
      <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-slate-900/90 p-4 backdrop-blur-md">
        <div className={`my-auto w-full max-w-3xl border-t-8 bg-white p-6 text-slate-900 shadow-2xl sm:p-10 ${tone}`}>
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{isPenalty ? 'Documento disciplinar' : 'Mensagem da empresa'}</p>
              <h1 className="mt-1 text-2xl font-black">{heading}</h1>
            </div>
            <Icon size={44} className={isPromotion ? 'text-emerald-600' : 'text-slate-800'} />
          </div>

          <div className="space-y-5 text-[15px] leading-relaxed text-slate-800">
            <p className="text-lg font-bold">{current.title}</p>

            {isPenalty && (
              <>
                <p>Comunicamos que, em razão da ocorrência registrada em <strong>{fmtDate(extra.occurrenceDate) ?? 'data não informada'}</strong>, foi aplicada a você a medida de <strong>{heading.toLowerCase()}</strong>.</p>
                <div className="border-l-4 border-slate-900 bg-slate-100 p-4"><strong>Motivo:</strong> {extra.legalReason}</div>
              </>
            )}
            {isSuspension && (
              <div className="border-2 border-slate-900 p-5 text-center font-bold">
                Suspensão de {extra.suspensionDays} dia(s), a partir de {fmtDate(extra.suspensionStart) ?? fmtDate(extra.occurrenceDate)}.
                <p className="mt-1 text-sm font-semibold text-slate-600">Os dias suspensos não são trabalhados nem remunerados e serão descontados na folha de pagamento.</p>
              </div>
            )}
            {isPromotion && (extra.newPosition || extra.newSalary || extra.effectiveDate) && (
              <div className="grid gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-3">
                {extra.newPosition && <p><span className="block text-xs font-bold uppercase text-emerald-700">Novo cargo</span>{extra.newPosition}</p>}
                {extra.newSalary && <p><span className="block text-xs font-bold uppercase text-emerald-700">Novo salário</span>{Number(extra.newSalary).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
                {extra.effectiveDate && <p><span className="block text-xs font-bold uppercase text-emerald-700">A partir de</span>{fmtDate(extra.effectiveDate)}</p>}
              </div>
            )}
            {current.message && <p className="whitespace-pre-wrap">{current.message}</p>}
            {extra.resetCode && (
              <div className="border-2 border-slate-900 bg-slate-50 p-5 text-center">
                <p className="mb-1 text-xs font-bold uppercase text-slate-600">Código de acesso</p>
                <code className="text-2xl font-black tracking-[0.2em]">{extra.resetCode}</code>
              </div>
            )}
            <p className="text-sm text-slate-500">Enviado por {current.createdByUser?.name || 'Recursos Humanos'} em {fmtDate(current.createdAt)}.</p>
          </div>

          {error && <p className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}

          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
            {refusing ? (
              <div className="space-y-3">
                <label className="block text-sm font-bold">Por que você está recusando assinar? (obrigatório)
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm font-normal" />
                </label>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setRefusing(false)} className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold">Voltar</button>
                  <button type="button" disabled={busy || reason.trim().length < 5} onClick={() => act('REFUSE')} className="rounded-lg bg-rose-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">Confirmar recusa</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                {needsConfirm && current.allowsRefusal && (
                  <button type="button" disabled={busy} onClick={() => setRefusing(true)} className="flex items-center justify-center gap-2 rounded-lg border-2 border-slate-900 bg-white px-6 py-3 text-sm font-black disabled:opacity-50"><X size={16} /> Recusar assinatura</button>
                )}
                <button type="button" disabled={busy} onClick={() => act(!needsConfirm ? 'READ' : current.requiresAcceptance ? 'ACCEPT' : 'ACKNOWLEDGE')} className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-black text-white shadow-lg hover:bg-slate-800 disabled:opacity-50">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : needsConfirm && isPenalty ? <FileText size={16} /> : <Check size={16} />}
                  {!needsConfirm ? 'Entendi' : isPenalty ? 'Assinar e ficar ciente' : isPromotion ? 'Obrigado!' : current.requiresAcceptance ? 'Aceitar' : 'Estou ciente'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
