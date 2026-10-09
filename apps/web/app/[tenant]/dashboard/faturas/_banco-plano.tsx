'use client';

import { Check, Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/app/components/ui';
import { ApiError, api, type EmpresaPlano, type PlanQuote, type SeatsQuote } from '@/app/lib/api';
import { money, shortDate } from './_format';

const fail = (e: unknown, fallback: string) => toast.error(e instanceof ApiError ? e.message : fallback);

function Footer({ onClose, busy, disabled, label, onConfirm, danger }: { onClose: () => void; busy: boolean; disabled?: boolean; label: string; onConfirm: () => void; danger?: boolean }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Voltar</button>
      <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy || disabled}>{busy ? 'Aplicando…' : label}</button>
    </div>
  );
}

function QuoteBox({ quote }: { quote: { kind: string; prorationAmount: number; remainingDays: number; cycleDays: number; nextTotal: number; effectiveAt?: string | null; downgradeEffectiveAt?: string | null } }) {
  const when = quote.effectiveAt ?? quote.downgradeEffectiveAt;
  return (
    <div className="rounded-2xl border border-line bg-black/[0.03] p-4 text-sm text-fg">
      {quote.kind === 'UPGRADE' && <>
        <p className="font-semibold">Vale agora</p>
        <p className="mt-1 text-fg-sub">Cobramos só a diferença dos {quote.remainingDays} dias que faltam do ciclo ({quote.remainingDays}/{quote.cycleDays}): <strong className="text-fg">{money(quote.prorationAmount)}</strong>. Esse valor é somado à sua próxima fatura, sem boleto separado.</p>
        <p className="mt-2">A partir do próximo ciclo: <strong>{money(quote.nextTotal)}</strong> por mês.</p>
      </>}
      {quote.kind === 'DOWNGRADE' && <>
        <p className="font-semibold">Vale no próximo ciclo{when ? ` (${shortDate(when)})` : ''}</p>
        <p className="mt-1 text-fg-sub">Você continua com o que tem hoje até lá, sem crédito pela diferença.</p>
        <p className="mt-2">Passa a custar <strong>{money(quote.nextTotal)}</strong> por mês.</p>
      </>}
      {quote.kind === 'SEM_MUDANCA' && <p>Nada muda: é a mesma quantidade de usuários.</p>}
    </div>
  );
}

export function PlanModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [plans, setPlans] = useState<EmpresaPlano[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [quote, setQuote] = useState<PlanQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.faturas.empresaPlanos().then(setPlans).catch((e) => { setPlans([]); fail(e, 'Não foi possível carregar os planos.'); }); }, []);

  async function pick(plan: EmpresaPlano) {
    if (plan.current) return;
    setSelected(plan.id); setQuote(null); setQuoting(true);
    try { setQuote(await api.faturas.empresaPlanQuote(plan.id)); } catch (e) { fail(e, 'Não foi possível calcular a troca.'); setSelected(null); }
    finally { setQuoting(false); }
  }
  async function confirm() {
    if (!selected) return;
    setBusy(true);
    try {
      const r = await api.faturas.empresaChangePlan(selected);
      toast.success(r.scheduled ? 'Troca agendada para o próximo ciclo.' : r.prorationAmount > 0 ? (r.prorationMerged ? `Plano alterado. Rateio de ${money(r.prorationAmount)} somado à sua próxima fatura.` : `Plano alterado. Fatura de ${money(r.prorationAmount)} gerada.`) : 'Plano alterado.');
      onDone(); onClose();
    } catch (e) { fail(e, 'Não foi possível trocar de plano.'); } finally { setBusy(false); }
  }

  return (
    <Modal isOpen onClose={() => !busy && onClose()} title="Alterar plano" description="Compare e escolha. Mostramos o valor exato antes de você confirmar." maxWidth="max-w-3xl"
      footer={<Footer onClose={onClose} busy={busy} disabled={!quote} label="Confirmar troca" onConfirm={() => void confirm()} />}>
      <div className="space-y-4">
        {!plans ? <p className="text-sm text-fg-sub">Carregando planos…</p> : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {plans.map((p) => (
              <li key={p.id}>
                <button type="button" disabled={p.current} onClick={() => void pick(p)} aria-pressed={selected === p.id}
                  className={`relative h-full w-full rounded-2xl border-2 p-4 text-left transition ${selected === p.id ? 'border-purple-600 bg-purple-50/60' : 'border-line hover:border-purple-300'} ${p.current ? 'cursor-default opacity-90' : ''}`}>
                  {p.current && <span className="absolute right-3 top-3 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">Seu plano</span>}
                  {!p.current && p.isRecommended && <span className="absolute right-3 top-3 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-800">Recomendado</span>}
                  <p className="text-base font-black text-fg">{p.name}</p>
                  <p className="mt-1 text-2xl font-black tabular-nums text-fg">{p.isFree ? 'Grátis' : p.monthlyTotal === null ? '—' : money(p.monthlyTotal)}<span className="text-xs font-semibold text-fg-mut">{p.isFree ? '' : ' /mês'}</span></p>
                  {p.description && <p className="mt-1 text-xs text-fg-sub">{p.description}</p>}
                  <ul className="mt-3 space-y-1 text-xs text-fg-sub">
                    <li className="flex items-center gap-1.5"><Check size={12} aria-hidden="true" /> até {p.maxUsers} usuários</li>
                    <li className="flex items-center gap-1.5"><Check size={12} aria-hidden="true" /> até {p.maxEmployees} funcionários</li>
                    {p.commitmentMonths > 1 && <li className="flex items-center gap-1.5"><Check size={12} aria-hidden="true" /> fidelidade de {p.commitmentMonths} meses</li>}
                  </ul>
                </button>
              </li>
            ))}
            {!plans.length && <li className="text-sm text-fg-sub">Nenhum plano disponível no momento.</li>}
          </ul>
        )}
        {quoting && <p className="text-sm text-fg-sub">Calculando…</p>}
        {quote && <QuoteBox quote={quote} />}
      </div>
    </Modal>
  );
}

export function SeatsModal({ current, used, onClose, onDone }: { current: number; used: number; onClose: () => void; onDone: () => void }) {
  const [seats, setSeats] = useState(current);
  const [quote, setQuote] = useState<SeatsQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setQuote(null);
    if (seats === current || seats < 1) return;
    setQuoting(true);
    const timer = window.setTimeout(() => {
      api.faturas.empresaSeatsQuote(seats).then(setQuote).catch((e) => fail(e, 'Não foi possível calcular.')).finally(() => setQuoting(false));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [seats, current]);

  async function confirm() {
    setBusy(true);
    try {
      const r = await api.faturas.empresaChangeSeats(seats);
      toast.success(r.scheduled ? 'Redução agendada para o próximo ciclo.' : r.prorationAmount > 0 ? (r.prorationMerged ? `Usuários atualizados. Rateio de ${money(r.prorationAmount)} somado à sua próxima fatura.` : `Usuários atualizados. Fatura de ${money(r.prorationAmount)} gerada.`) : 'Alteração aplicada.');
      onDone(); onClose();
    } catch (e) { fail(e, 'Não foi possível alterar os usuários.'); } finally { setBusy(false); }
  }
  const belowUsage = seats < used;

  return (
    <Modal isOpen onClose={() => !busy && onClose()} title="Alterar usuários" description={`Hoje você tem ${current} contratado(s) e ${used} em uso.`}
      footer={<Footer onClose={onClose} busy={busy} disabled={!quote || quote.kind === 'SEM_MUDANCA' || belowUsage} label="Confirmar" onConfirm={() => void confirm()} />}>
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-4">
          <button type="button" aria-label="Menos um usuário" className="flex h-12 w-12 items-center justify-center rounded-full border border-line hover:bg-black/5" onClick={() => setSeats((s) => Math.max(1, s - 1))}><Minus size={18} /></button>
          <input aria-label="Quantidade de usuários" inputMode="numeric" className="h-14 w-28 rounded-2xl border border-line bg-transparent text-center text-3xl font-black tabular-nums text-fg" value={seats} onChange={(e) => setSeats(Math.max(1, Math.min(10000, Math.trunc(Number(e.target.value.replace(/\D/g, ''))) || 1)))} />
          <button type="button" aria-label="Mais um usuário" className="flex h-12 w-12 items-center justify-center rounded-full border border-line hover:bg-black/5" onClick={() => setSeats((s) => Math.min(10000, s + 1))}><Plus size={18} /></button>
        </div>
        {belowUsage && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Você tem {used} usuário(s) ativo(s). Bloqueie ou exclua acessos antes de reduzir para {seats}.</p>}
        {quoting && <p className="text-center text-sm text-fg-sub">Calculando…</p>}
        {quote && !belowUsage && <QuoteBox quote={quote} />}
      </div>
    </Modal>
  );
}

export function CancelModal({ endDate, onClose, onDone }: { endDate?: string | null; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      const r = await api.faturas.empresaCancelar(reason.trim());
      toast.success(r.cancelAt ? `Assinatura cancelada. O acesso continua até ${shortDate(r.cancelAt)}.` : 'Assinatura cancelada.');
      onDone(); onClose();
    } catch (e) { fail(e, 'Não foi possível cancelar a assinatura.'); } finally { setBusy(false); }
  }

  return (
    <Modal isOpen onClose={() => !busy && onClose()} title="Cancelar assinatura" description="Sentimos muito ver você ir."
      footer={<Footer onClose={onClose} busy={busy} disabled={reason.trim().length < 5} label="Cancelar assinatura" danger onConfirm={() => void confirm()} />}>
      <div className="space-y-3">
        <ul className="space-y-1 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <li>• As cobranças futuras são interrompidas e faturas em aberto são canceladas.</li>
          <li>• O acesso continua até o fim do ciclo já pago{endDate ? ` (${shortDate(endDate)})` : ''}.</li>
          <li>• Seus dados ficam guardados conforme a lei; fale com o suporte para reativar.</li>
        </ul>
        <label className="block text-sm font-semibold text-fg">Por que está cancelando?
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} className="mt-1 w-full rounded-xl border border-line bg-transparent p-3 text-sm font-normal" />
        </label>
      </div>
    </Modal>
  );
}
