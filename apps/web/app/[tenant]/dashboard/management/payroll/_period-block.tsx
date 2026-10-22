'use client';

import { BadgeCheck } from 'lucide-react';
import { useCallback, useId, useState } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/app/components/ui/confirm-provider';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { brl, fmtDayMonth, hrActions, periodTotals, statusLabel, statusTone } from '../../contabilidade/_model';

/** Bloco da competência (fluxo com o contador). Sem período publicado/visível, não renderiza nada: a tela atual segue igual. */
export function PeriodBlock({ month, role }: { month: string; role: string }) {
  const confirm = useConfirm();
  const uid = useId();
  const [returning, setReturning] = useState(false);
  const [comment, setComment] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const q = useQuery(useCallback(() => api.payrollPeriods.get(month), [month]), [month]);
  const done = (msg: string) => () => { toast.success(msg); setReturning(false); setComment(''); q.refetch(); };
  const ret = useMutation((c: string) => api.payrollPeriods.return(month, c), { onSuccess: done('Competência devolvida ao contador.'), onError: setErr });
  const release = useMutation(() => api.payrollPeriods.release(month), { onSuccess: done('Holerites liberados.'), onError: (m) => toast.error(m) });
  const paid = useMutation(() => api.payrollPeriods.paid(month), { onSuccess: done('Competência marcada como paga.'), onError: (m) => toast.error(m) });

  const p = q.data;
  const act = hrActions(p?.status, role);
  if (!p || !act.showBlock) return null;
  const totals = periodTotals(p);
  const [yy, mm] = month.split('-');
  const busy = ret.loading || release.loading || paid.loading;

  async function onRelease() {
    if (!(await confirm({ title: 'Liberar holerites?', description: `Os holerites de ${mm}/${yy} ficarão disponíveis para os funcionários.`, confirmText: 'Liberar holerites', variant: 'primary' }))) return;
    await release.mutate().catch(() => undefined);
  }
  async function onPaid() {
    if (!(await confirm({ title: 'Marcar como pago?', description: 'Registra a quitação da competência; não faz transferência bancária.', confirmText: 'Marcar como pago', variant: 'primary' }))) return;
    await paid.mutate().catch(() => undefined);
  }
  function onReturn(e: React.FormEvent) {
    e.preventDefault();
    if (comment.trim().length < 5) { setErr('Explique o que precisa ser corrigido (mínimo 5 caracteres).'); return; }
    setErr(null);
    void ret.mutate(comment.trim()).catch(() => undefined);
  }

  return (
    <section aria-labelledby={`${uid}-t`} className="space-y-4 rounded-[14px] border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={`${uid}-t`} className="text-base font-semibold">Competência {mm}/{yy}</h2>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusTone(p.status)}`}>{statusLabel(p.status)}</span>
        {p.publishedAt && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"><BadgeCheck size={14} aria-hidden="true" /> Conferida pelo contador em {fmtDayMonth(p.publishedAt)}</span>}
      </div>
      {p.status === 'RETURNED' && <p className="text-sm text-amber-900">Devolvida ao contador{p.returnComment ? `: ${p.returnComment}` : '.'} Aguardando nova publicação.</p>}
      {p.status !== 'RETURNED' && (
        <>
          <dl className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
            {([['Funcionários', String(totals.employees)], ['Bruto', brl(totals.gross)], ['INSS', brl(totals.inss)], ['FGTS', brl(totals.fgts)], ['IRRF', brl(totals.irrf)], ['Descontos', brl(totals.discounts)], ['Líquido', brl(totals.net)]] as const).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-slate-200 p-3"><dt className="text-xs text-slate-500">{k}</dt><dd className="mt-1 font-semibold">{v}</dd></div>
            ))}
          </dl>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
            {p.employees.map((e) => (
              <li key={e.employeeId} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2">
                <span className="min-w-0 break-words font-medium">{e.name}{e.hasManualAdjustment && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Ajustado</span>}</span>
                <span className="text-slate-600">Bruto {brl(e.gross)} · Desc. {brl(e.discounts)} · <strong className="text-slate-900">Líq. {brl(e.net)}</strong></span>
              </li>
            ))}
          </ul>
        </>
      )}
      {(act.returnToAccountant || act.release || act.markPaid) && (
        <div className="flex flex-wrap gap-2">
          {act.release && <button type="button" onClick={onRelease} disabled={busy} className="btn btn-primary min-h-11">{release.loading ? 'Liberando…' : 'Liberar holerites'}</button>}
          {act.returnToAccountant && !returning && <button type="button" onClick={() => setReturning(true)} disabled={busy} className="btn btn-outline min-h-11">Devolver ao contador</button>}
          {act.markPaid && <button type="button" onClick={onPaid} disabled={busy} className="btn btn-primary min-h-11">{paid.loading ? 'Salvando…' : 'Marcar como pago'}</button>}
        </div>
      )}
      {act.returnToAccountant && returning && (
        <form onSubmit={onReturn} className="space-y-2" noValidate>
          <label htmlFor={`${uid}-c`} className="text-sm font-semibold">Comentário para o contador (obrigatório)</label>
          <textarea id={`${uid}-c`} rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} className="input-v2 w-full" aria-invalid={!!err} />
          {err && <p role="alert" className="text-sm text-rose-700">{err}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="btn btn-primary min-h-11">{ret.loading ? 'Devolvendo…' : 'Devolver ao contador'}</button>
            <button type="button" onClick={() => { setReturning(false); setErr(null); }} className="btn btn-outline min-h-11">Cancelar</button>
          </div>
        </form>
      )}
    </section>
  );
}
