'use client';

import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, type PublicPlatformPlan } from '@/app/lib/api';

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (value: unknown) => { const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const SEAT_SHORTCUTS = [5, 10, 25, 50, 100];

type Quote = { total: number; commitmentMonths: number; monthlyEquivalent?: number };

/** Planos reais da plataforma — sem valores de reserva: se a API falhar, o erro é mostrado com nova tentativa. */
export function PricingSection() {
  const [plans, setPlans] = useState<PublicPlatformPlan[] | null>(null);
  const [error, setError] = useState('');
  const [seats, setSeats] = useState(10);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});

  const load = useCallback(() => {
    setError(''); setPlans(null);
    api.auth.publicPlans().then((items) => setPlans(Array.isArray(items) ? items : []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os planos.'));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    if (!plans?.length) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      const entries = await Promise.all(plans.filter((p) => !p.isFree).map(async (p) => {
        try { return [p.id, await api.auth.quotePublicPlan({ planId: p.id, seatQuantity: seats })] as const; } catch { return null; }
      }));
      if (active) setQuotes(Object.fromEntries(entries.filter((e): e is NonNullable<typeof e> => e !== null)));
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [plans, seats]);

  if (error) return <div className="py-12 text-center text-white/80" role="alert">{error} <button type="button" onClick={load} className="font-semibold underline">Tentar de novo</button></div>;
  if (plans === null) return <p role="status" className="py-12 text-center text-white/70">Carregando planos…</p>;
  if (plans.length === 0) return <p className="py-12 text-center text-white/70">Planos em atualização. <Link href="/suporte" className="font-semibold underline">Fale com a gente</Link>.</p>;

  return (
    <div>
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Planos simples, preço por usuário</h2>
        <p className="mt-3 text-white/70">Ajuste o tamanho da equipe e veja o valor. O total final, com descontos de ciclo e cupom, aparece no checkout.</p>
      </div>

      <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur">
        <label htmlFor="seats" className="flex items-baseline justify-between text-sm font-medium text-white">
          <span>Usuários na plataforma</span><span className="text-2xl font-bold tabular-nums">{seats}</span>
        </label>
        <input id="seats" type="range" min={1} max={200} value={seats} onChange={(e) => setSeats(Number(e.target.value))} className="mt-3 w-full accent-[var(--color-brand-400)]" />
        <div className="mt-3 flex flex-wrap gap-2">
          {SEAT_SHORTCUTS.map((n) => (
            <button key={n} type="button" onClick={() => setSeats(n)} aria-pressed={seats === n}
              className={`min-h-9 rounded-lg border px-3 text-xs font-semibold transition ${seats === n ? 'border-white bg-white text-[var(--color-brand-800)]' : 'border-white/20 text-white/80 hover:bg-white/10'}`}>{n}</button>
          ))}
        </div>
      </div>

      <div className={`mx-auto mt-10 grid max-w-5xl gap-5 ${plans.length > 1 ? 'md:grid-cols-2' : 'max-w-md'} ${plans.length > 2 ? 'lg:grid-cols-3' : ''}`}>
        {plans.map((plan) => {
          const quote = quotes[plan.id];
          const base = num(plan.baseMonthlyPrice) || num(plan.price);
          const monthly = quote ? (quote.monthlyEquivalent ?? quote.total / Math.max(1, quote.commitmentMonths)) : base + seats * num(plan.userMonthlyPrice);
          const over = Boolean(plan.maxUsers) && seats > plan.maxUsers;
          return (
            <article key={plan.id} className={`flex flex-col rounded-2xl p-6 ${plan.isRecommended ? 'bg-white text-zinc-900 shadow-2xl ring-2 ring-[var(--color-brand-300)]' : 'border border-white/15 bg-white/5 text-white'}`}>
              {plan.isRecommended && <span className="mb-3 w-fit rounded-full bg-[var(--color-brand)] px-3 py-1 text-xs font-semibold text-white">Recomendado</span>}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              {plan.description && <p className={`mt-1 text-sm ${plan.isRecommended ? 'text-zinc-600' : 'text-white/70'}`}>{plan.description}</p>}
              <p className="mt-5 text-4xl font-bold tabular-nums">{plan.isFree ? 'Grátis' : brl(monthly)}{!plan.isFree && <span className={`text-sm font-medium ${plan.isRecommended ? 'text-zinc-500' : 'text-white/60'}`}> /mês</span>}</p>
              {!plan.isFree && <p className={`mt-1 text-xs ${plan.isRecommended ? 'text-zinc-500' : 'text-white/60'}`}>para {seats} usuário{seats > 1 ? 's' : ''}</p>}
              <ul className={`mt-5 flex-1 space-y-2 text-sm ${plan.isRecommended ? 'text-zinc-700' : 'text-white/85'}`}>
                {['Cadastro de funcionários e documentos', 'Escalas e ponto por localização', 'Férias e solicitações', ...(plan.activeModules?.includes('recruitment') ? ['Vagas e recrutamento'] : []), ...(plan.activeModules?.includes('management') ? ['Gestão, folha e ASO'] : [])].map((item) => (
                  <li key={item} className="flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0 text-[var(--color-brand-400)]" aria-hidden="true" />{item}</li>
                ))}
              </ul>
              {over && <p className="mt-3 text-xs text-amber-500">Este plano permite até {plan.maxUsers} usuários.</p>}
              <Link href={`/cadastro?planId=${plan.id}&seats=${seats}`} className={`mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${plan.isRecommended ? 'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-700)]' : 'bg-white text-[var(--color-brand-800)] hover:bg-purple-50'}`}>
                Começar <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
