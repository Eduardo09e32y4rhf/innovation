'use client';

import { ArrowRight, BriefcaseBusiness, CalendarDays, Check, CircleDollarSign, Loader2, PartyPopper, Trophy, X } from 'lucide-react';

type PromotionNoticeProps = {
  notification: any;
  extra: Record<string, any>;
  needsConfirm: boolean;
  busy: boolean;
  error: string;
  refusing: boolean;
  reason: string;
  onAct: () => void;
  onStartRefuse: () => void;
  onConfirmRefuse: () => void;
  onCancelRefuse: () => void;
  onReasonChange: (value: string) => void;
  formatDate: (value?: string | null) => string | null;
};

export function PromotionNotice({ notification, extra, needsConfirm, busy, error, refusing, reason, onAct, onStartRefuse, onConfirmRefuse, onCancelRefuse, onReasonChange, formatDate }: PromotionNoticeProps) {
  const details = [
    extra.newPosition && { label: 'Novo cargo', value: extra.newPosition, icon: BriefcaseBusiness, accent: 'violet' },
    extra.newSalary && { label: 'Novo salário', value: Number(extra.newSalary).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: CircleDollarSign, accent: 'fuchsia' },
    extra.effectiveDate && { label: 'Data de início', value: formatDate(extra.effectiveDate), icon: CalendarDays, accent: 'indigo' },
  ].filter(Boolean) as { label: string; value: string; icon: typeof BriefcaseBusiness; accent: string }[];

  return <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-md sm:p-6">
    <section role="dialog" aria-modal="true" aria-labelledby="promotion-title" className="my-auto w-full max-w-3xl overflow-hidden rounded-[26px] border border-violet-300/60 bg-white shadow-[0_30px_100px_rgba(13,7,38,.38)]">
      <header className="relative isolate min-h-[220px] overflow-hidden bg-[radial-gradient(circle_at_80%_20%,rgba(146,89,255,.48),transparent_30%),linear-gradient(120deg,#17123e_0%,#24135a_52%,#5423ad_100%)] px-6 pb-14 pt-7 text-white sm:min-h-[235px] sm:px-10 sm:pt-8">
        <span aria-hidden="true" className="absolute -right-16 -top-32 h-72 w-72 rounded-full border-[38px] border-violet-300/15" />
        <span aria-hidden="true" className="absolute right-[34%] top-9 text-2xl text-violet-200">✦</span>
        <span aria-hidden="true" className="absolute right-[42%] top-20 text-base text-violet-200/80">✦</span>
        <span aria-hidden="true" className="absolute right-8 top-12 rotate-12 text-amber-200">✦</span>
        <div className="relative z-10 max-w-[70%] sm:max-w-[68%]">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200/20 bg-violet-300/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-violet-100 sm:text-[11px]">
            <PartyPopper size={14} aria-hidden="true" /> Mensagem da empresa
          </span>
          <h1 id="promotion-title" className="mt-4 text-[26px] font-bold leading-tight tracking-tight sm:text-4xl">{notification.title || 'Parabéns pela promoção!'}</h1>
          <p className="mt-2 max-w-lg text-xs leading-relaxed text-violet-100/75 sm:text-sm">{notification.message || 'Seu crescimento é resultado do seu talento e dedicação.'}</p>
        </div>
        <div aria-hidden="true" className="absolute -bottom-8 right-2 flex h-48 w-48 items-center justify-center sm:right-8 sm:h-56 sm:w-56">
          <span className="absolute h-40 w-40 rounded-full bg-violet-400/30 blur-2xl" />
          <Trophy size={118} strokeWidth={1.1} className="relative -rotate-6 fill-amber-300/20 text-violet-100 drop-shadow-[0_18px_20px_rgba(0,0,0,.3)] sm:h-36 sm:w-36" />
          <span className="absolute right-6 top-4 text-4xl text-amber-300 drop-shadow">★</span>
        </div>
        <div aria-hidden="true" className="absolute -bottom-8 -left-[8%] h-14 w-[116%] rotate-[-1deg] rounded-[50%] bg-gradient-to-b from-violet-50 to-white" />
      </header>

      <div className="bg-gradient-to-b from-white to-violet-50/30 px-5 pb-5 pt-5 sm:px-8 sm:pb-7 sm:pt-3">
        {details.length > 0 && <dl className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
          {details.map(({ label, value, icon: Icon, accent }) => <div key={label} className="flex min-h-[76px] min-w-0 items-center gap-3 rounded-2xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/80 px-3.5 py-3 sm:min-h-[88px] sm:gap-3.5 sm:px-4">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent === 'fuchsia' ? 'bg-fuchsia-100 text-fuchsia-700' : accent === 'indigo' ? 'bg-indigo-100 text-indigo-700' : 'bg-violet-100 text-violet-700'}`}><Icon size={19} aria-hidden="true" /></span>
            <span className="min-w-0"><dt className="text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:text-[10px]">{label}</dt><dd className="mt-1 break-words text-sm font-semibold leading-snug text-slate-900 sm:text-[15px]">{value}</dd></span>
          </div>)}
        </dl>}

        <p className="mt-4 text-xs text-slate-500">Enviado por {notification.createdByUser?.name || 'Recursos Humanos'}{formatDate(notification.createdAt) ? ` · ${formatDate(notification.createdAt)}` : ''}</p>

        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">{error}</p>}
        <div className="mt-5 border-t border-violet-100 pt-4 sm:mt-5 sm:pt-4">
          {refusing ? <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-800">Por que você está recusando? (obrigatório)
              <textarea value={reason} onChange={(event) => onReasonChange(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-base font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 sm:text-sm" />
            </label>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={onCancelRefuse} className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Voltar</button>
              <button type="button" disabled={busy || reason.trim().length < 5} onClick={onConfirmRefuse} className="min-h-11 rounded-xl bg-rose-700 px-5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50">Confirmar recusa</button>
            </div>
          </div> : <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {needsConfirm && notification.allowsRefusal && <button type="button" disabled={busy} onClick={onStartRefuse} className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Recusar</button>}
            <button type="button" disabled={busy} onClick={onAct} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 via-violet-600 to-purple-800 px-6 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(107,32,235,.28)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(107,32,235,.36)] disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : needsConfirm ? <PartyPopper size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
              {!needsConfirm ? 'Entendi' : notification.requiresAcceptance ? 'Aceitar promoção' : 'Obrigado!'}
              {!busy && <ArrowRight size={16} aria-hidden="true" />}
            </button>
          </div>}
        </div>
      </div>
    </section>
  </div>;
}
