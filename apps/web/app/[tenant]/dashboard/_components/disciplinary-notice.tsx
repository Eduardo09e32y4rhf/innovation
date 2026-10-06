'use client';

import { AlertCircle, CalendarDays, Check, FileText, Handshake, Info, Loader2, UserRound, X } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  notification: any;
  extra: Record<string, any>;
  suspension: boolean;
  busy: boolean;
  error: string;
  refusing: boolean;
  reason: string;
  onAcknowledge: () => void;
  onStartRefuse: () => void;
  onConfirmRefuse: () => void;
  onCancelRefuse: () => void;
  onReasonChange: (value: string) => void;
  formatDate: (value?: string | null) => string | null;
};

export function DisciplinaryNotice({ notification, extra, suspension, busy, error, refusing, reason, onAcknowledge, onStartRefuse, onConfirmRefuse, onCancelRefuse, onReasonChange, formatDate }: Props) {
  const days = Number(extra.suspensionDays);
  const startDate = formatDate(extra.suspensionStart ?? extra.occurrenceDate) ?? 'Data não informada';
  const issueDate = formatDate(notification.createdAt) ?? 'Data não informada';
  const employeeName = extra.employeeName || notification.recipients?.[0]?.employee?.name || 'Colaborador';
  const title = suspension ? 'Termo de Suspensão' : 'Termo de Advertência';

  return <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-md sm:p-6">
    <section role="dialog" aria-modal="true" aria-labelledby="disciplinary-notice-title" className="relative my-auto max-h-[calc(100dvh-24px)] w-full max-w-4xl overflow-y-auto overflow-x-hidden rounded-[24px] border border-violet-200/70 bg-white shadow-[0_35px_100px_rgba(5,4,25,.42)] sm:max-h-[calc(100dvh-48px)] sm:rounded-[28px]">
      <header className="relative isolate min-h-[185px] overflow-hidden bg-[radial-gradient(circle_at_85%_5%,rgba(147,92,255,.55),transparent_30%),linear-gradient(115deg,#17113c_0%,#241052_45%,#34117b_100%)] px-5 pb-12 pt-6 text-white sm:min-h-[210px] sm:px-10 sm:pb-14 sm:pt-8">
        <span aria-hidden="true" className="absolute -right-14 -top-44 h-80 w-80 rounded-full border-[42px] border-violet-300/15" />
        <span aria-hidden="true" className="absolute bottom-[-64px] right-44 h-36 w-80 rounded-[50%] bg-violet-400/10" />
        <div className="relative z-10 max-w-[72%] sm:max-w-[68%]">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200/20 bg-violet-500/35 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-violet-50 sm:text-[11px]"><FileText size={14} aria-hidden="true" /> Termo disciplinar</span>
          <h1 id="disciplinary-notice-title" className="mt-4 text-[27px] font-bold leading-tight tracking-tight sm:text-4xl">{suspension ? <>Termo de <span className="bg-gradient-to-r from-purple-300 to-fuchsia-300 bg-clip-text text-transparent">Suspensão</span></> : <>Termo de <span className="bg-gradient-to-r from-purple-300 to-fuchsia-300 bg-clip-text text-transparent">Advertência</span></>}</h1>
          <p className="mt-2 max-w-lg text-xs leading-relaxed text-violet-100/80 sm:text-sm">Este documento formaliza {suspension ? 'a aplicação da suspensão disciplinar' : 'o registro da advertência disciplinar'}, conforme as políticas internas da empresa.</p>
        </div>
        <div aria-hidden="true" className="absolute right-3 top-6 flex h-32 w-32 items-center justify-center sm:right-12 sm:top-5 sm:h-44 sm:w-44">
          <span className="absolute h-32 w-32 rounded-full bg-violet-400/25 blur-2xl sm:h-40 sm:w-40" />
          <div className="relative flex h-20 w-16 rotate-[8deg] flex-col gap-2 rounded-2xl bg-gradient-to-br from-white to-violet-200 p-3 shadow-[0_18px_35px_rgba(5,2,27,.4)] sm:h-28 sm:w-24 sm:gap-2.5 sm:p-4">
            {[70, 100, 82, 55].map((width, index) => <span key={index} className="h-1.5 rounded-full bg-gradient-to-r from-violet-400 to-violet-700 sm:h-2" style={{ width: `${width}%` }} />)}
            {suspension && <span className="absolute -bottom-3 -right-4 grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-purple-800 text-white shadow-lg sm:-bottom-4 sm:-right-5 sm:h-14 sm:w-14"><span className="flex gap-1"><i className="h-4 w-1.5 rounded-full bg-white sm:h-5" /><i className="h-4 w-1.5 rounded-full bg-white sm:h-5" /></span></span>}
          </div>
        </div>
        <div aria-hidden="true" className="absolute -bottom-8 -left-[6%] h-14 w-[112%] rounded-[50%] bg-white" />
      </header>

      <main className="space-y-3 bg-white px-4 pb-5 pt-3 sm:space-y-4 sm:px-8 sm:pb-7">
        <dl className="grid overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 to-white sm:grid-cols-3">
          <Summary icon={<UserRound size={19} />} label="Colaborador" value={employeeName} />
          <Summary icon={<CalendarDays size={19} />} label={suspension ? 'Período da suspensão' : 'Data da ocorrência'} value={suspension ? `${startDate}${Number.isInteger(days) && days > 0 ? ` · ${days} ${days === 1 ? 'dia' : 'dias'}` : ''}` : formatDate(extra.occurrenceDate) ?? 'Data não informada'} />
          <Summary icon={<FileText size={19} />} label="Tipo de penalidade" value={suspension ? 'Suspensão disciplinar' : 'Advertência disciplinar'} />
        </dl>

        <section className="flex gap-3 rounded-2xl border border-rose-100 bg-rose-50/80 p-3.5 sm:gap-4 sm:p-4" aria-labelledby="disciplinary-reason-title">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600"><AlertCircle size={21} aria-hidden="true" /></span>
          <div className="min-w-0"><h2 id="disciplinary-reason-title" className="text-[10px] font-bold uppercase tracking-wide text-rose-700">Motivo {suspension ? 'da suspensão' : 'da advertência'}</h2><p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-700 sm:text-sm">{extra.legalReason || notification.message || 'Motivo não informado.'}</p>{notification.message && extra.legalReason && notification.message !== extra.legalReason && <p className="mt-2 whitespace-pre-wrap border-t border-rose-200/70 pt-2 text-xs leading-relaxed text-slate-600">{notification.message}</p>}</div>
        </section>

        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5 sm:p-4" aria-labelledby="disciplinary-info-title">
          <h2 id="disciplinary-info-title" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-indigo-700"><Info size={15} aria-hidden="true" /> Informações importantes</h2>
          <ul className="mt-2 space-y-1.5 pl-5 text-xs leading-relaxed text-slate-700 marker:text-indigo-500 sm:text-[13px]">
            {suspension ? <>
              <li>Durante o período de suspensão, você deverá permanecer ausente das atividades da empresa.</li>
              <li>Os dias de trabalho abrangidos pela suspensão serão considerados no controle de ponto e na folha, conforme as políticas internas.</li>
              <li>Em caso de dúvidas, procure a equipe de Gestão de Pessoas.</li>
            </> : <>
              <li>Esta advertência registra formalmente a ocorrência descrita neste termo.</li>
              <li>O registro ficará disponível para consulta conforme as políticas internas da empresa.</li>
              <li>Em caso de dúvidas ou se desejar apresentar informações adicionais, procure a equipe de Gestão de Pessoas.</li>
            </>}
          </ul>
        </section>

        <section className="flex gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-3.5 sm:gap-4 sm:p-4" aria-labelledby="disciplinary-ack-title">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Handshake size={20} aria-hidden="true" /></span>
          <div><h2 id="disciplinary-ack-title" className="text-[10px] font-bold uppercase tracking-wide text-violet-700">Registro de ciência</h2><p className="mt-1 text-xs leading-relaxed text-slate-700 sm:text-[13px]">Ao confirmar, você registra que recebeu e leu este documento. A confirmação de leitura registra ciência do conteúdo.</p></div>
        </section>

        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">{error}</p>}
        <footer className="flex flex-col gap-3 border-t border-violet-100 pt-4 sm:flex-row sm:items-center sm:justify-between sm:pt-5">
          <div className="flex items-center gap-2 text-[11px] leading-snug text-slate-500"><CalendarDays size={16} className="shrink-0 text-violet-500" aria-hidden="true" /><span>Data de emissão: <strong className="font-semibold text-slate-700">{issueDate}</strong><span className="block">Gestão de Pessoas</span></span></div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {notification.allowsRefusal && <button type="button" disabled={busy} onClick={onStartRefuse} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><X size={16} aria-hidden="true" /> Recusar</button>}
            <button type="button" disabled={busy} onClick={onAcknowledge} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 via-violet-600 to-purple-800 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(107,32,235,.28)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(107,32,235,.36)] disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />} Li e estou ciente</button>
          </div>
        </footer>
      </main>
    </section>

    {refusing && <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="refuse-notice-title" className="w-full max-w-md rounded-2xl border border-violet-100 bg-white p-5 shadow-2xl sm:p-6">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-amber-100 text-amber-700"><AlertCircle size={23} aria-hidden="true" /></span>
        <h2 id="refuse-notice-title" className="mt-3 text-lg font-bold text-slate-900">Confirmar recusa</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">Sua recusa será registrada e encaminhada à equipe de Gestão de Pessoas. Você pode informar uma observação, se desejar.</p>
        <label className="mt-4 block text-sm font-semibold text-slate-800">Observação <span className="font-normal text-slate-500">(opcional)</span><textarea value={reason} onChange={(event) => onReasonChange(event.target.value)} rows={4} maxLength={2000} placeholder="Caso queira, informe o motivo da recusa..." className="mt-2 w-full resize-y rounded-xl border border-slate-300 p-3 text-base font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 sm:text-sm" /></label>
        {error && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={busy} onClick={onCancelRefuse} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Voltar</button><button type="button" disabled={busy} onClick={onConfirmRefuse} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50">{busy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />} Confirmar recusa</button></div>
      </section>
    </div>}
  </div>;
}

function Summary({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="flex min-h-[74px] min-w-0 items-center gap-3 border-b border-violet-100 px-3 py-3 last:border-b-0 sm:min-h-[94px] sm:border-b-0 sm:border-r sm:px-4 sm:last:border-r-0"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">{icon}</span><span className="min-w-0"><dt className="text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:text-[10px]">{label}</dt><dd className="mt-1 break-words text-xs font-semibold leading-snug text-slate-900 sm:text-sm">{value}</dd></span></div>;
}
