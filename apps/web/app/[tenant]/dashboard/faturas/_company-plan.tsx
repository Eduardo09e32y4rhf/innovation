'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api, { ApiError, type PlanQuote, type PublicPlatformPlan, type SeatsQuote } from '@/app/lib/api';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const field = 'h-10 w-full rounded-xl border border-line bg-transparent px-3 text-sm text-fg';

type Mode = 'seats' | 'plan';

/** Troca de usuários e de plano feita pelo administrador da empresa: upgrade cobra rateio por dia, downgrade vale no próximo ciclo. */
export default function CompanyPlanActions({ currentSeats, onDone }: { currentSeats?: number; onDone: () => void }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [seats, setSeats] = useState('');
  const [planId, setPlanId] = useState('');
  const [plans, setPlans] = useState<PublicPlatformPlan[]>([]);
  const [seatQuote, setSeatQuote] = useState<SeatsQuote | null>(null);
  const [planQuote, setPlanQuote] = useState<PlanQuote | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode !== 'plan') return;
    api.auth.publicPlans().then((items) => setPlans(Array.isArray(items) ? items : [])).catch(() => setPlans([]));
  }, [mode]);

  function close() { setMode(null); setSeats(''); setPlanId(''); setSeatQuote(null); setPlanQuote(null); }
  const fail = (e: unknown, fallback: string) => toast.error(e instanceof ApiError ? e.message : fallback);

  async function quoteSeats() {
    try { setSeatQuote(await api.faturas.empresaSeatsQuote(Math.trunc(Number(seats)))); } catch (e) { fail(e, 'Não foi possível calcular.'); }
  }
  async function pickPlan(id: string) {
    setPlanId(id); setPlanQuote(null);
    if (!id) return;
    try { setPlanQuote(await api.faturas.empresaPlanQuote(id)); } catch (e) { fail(e, 'Não foi possível calcular.'); }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'seats') {
        const r = await api.faturas.empresaChangeSeats(Math.trunc(Number(seats)));
        toast.success(r.prorationAmount > 0 ? `Usuários atualizados. Rateio gerado: ${brl(r.prorationAmount)} (veja em Em aberto).` : r.scheduled ? 'Redução agendada para o próximo ciclo.' : 'Alteração aplicada.');
      } else {
        const r = await api.faturas.empresaChangePlan(planId);
        toast.success(r.scheduled ? 'Downgrade agendado para o próximo ciclo.' : r.prorationAmount > 0 ? `Plano alterado. Rateio gerado: ${brl(r.prorationAmount)} (veja em Em aberto).` : 'Plano alterado.');
      }
      onDone();
      close();
    } catch (err) {
      fail(err, 'Não foi possível concluir a alteração.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <span className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-outline text-sm" onClick={() => setMode('seats')}>Alterar usuários</button>
        <button type="button" className="btn btn-outline text-sm" onClick={() => setMode('plan')}>Trocar plano</button>
      </span>

      {mode && (
        <div role="dialog" aria-modal="true" aria-label={mode === 'seats' ? 'Alterar usuários' : 'Trocar plano'} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={confirm} className="card-v2 w-full max-w-md space-y-3 p-5">
            <h2 className="text-lg font-semibold text-fg">{mode === 'seats' ? 'Alterar usuários contratados' : 'Trocar de plano'}</h2>

            {mode === 'seats' ? (<>
              <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-fg-mut">Novo total de usuários (hoje: {currentSeats ?? '-'})</span>
                <input className={field} inputMode="numeric" required value={seats} onChange={(e) => { setSeats(e.target.value); setSeatQuote(null); }} /></label>
              <button type="button" className="btn btn-outline text-sm" disabled={!seats} onClick={() => void quoteSeats()}>Calcular valor</button>
              {seatQuote && (
                <p className="rounded-xl bg-black/5 p-3 text-sm text-fg">
                  {seatQuote.kind === 'UPGRADE' && <>Vale agora. Rateio de {seatQuote.remainingDays}/{seatQuote.cycleDays} dias: <strong>{brl(seatQuote.prorationAmount)}</strong>. A partir do próximo ciclo: {brl(seatQuote.nextTotal)}.</>}
                  {seatQuote.kind === 'DOWNGRADE' && <>Vale no próximo ciclo{seatQuote.downgradeEffectiveAt ? ` (${new Date(seatQuote.downgradeEffectiveAt).toLocaleDateString('pt-BR')})` : ''}, sem crédito. Passa a {brl(seatQuote.nextTotal)}.</>}
                  {seatQuote.kind === 'SEM_MUDANCA' && <>Mesma quantidade de usuários.</>}
                </p>
              )}
            </>) : (<>
              <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-fg-mut">Novo plano</span>
                <select className={field} required value={planId} onChange={(e) => void pickPlan(e.target.value)}>
                  <option value="">Selecione</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select></label>
              {planQuote && (
                <p className="rounded-xl bg-black/5 p-3 text-sm text-fg">
                  {planQuote.kind === 'UPGRADE'
                    ? <>Vale agora. Rateio de {planQuote.remainingDays}/{planQuote.cycleDays} dias: <strong>{brl(planQuote.prorationAmount)}</strong>. A partir do próximo ciclo: {brl(planQuote.nextTotal)}.</>
                    : <>Vale no próximo ciclo{planQuote.effectiveAt ? ` (${new Date(planQuote.effectiveAt).toLocaleDateString('pt-BR')})` : ''}, sem crédito. Passa a {brl(planQuote.nextTotal)}.</>}
                </p>
              )}
            </>)}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn btn-outline" onClick={close} disabled={busy}>Voltar</button>
              <button type="submit" className="btn btn-primary" disabled={busy || (mode === 'plan' && !planQuote) || (mode === 'seats' && !seatQuote)}>{busy ? 'Aplicando...' : 'Confirmar'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
