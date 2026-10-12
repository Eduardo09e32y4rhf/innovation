'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, type PublicPlatformPlan } from '@/app/lib/api';

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (value: unknown) => { const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };

/** Textos dos cards por plano (layout aprovado). Admin e extra: os acessos = 1 admin + colaboradores contratados. */
const CARD_COPY: Record<string, { subtitle: string; items: (n: number) => string[]; unit: 'vaga' | 'colaborador' }> = {
  RS: {
    subtitle: 'Apenas Recrutamento e Seleção',
    items: (n) => [`${n} vagas por mês inclusas`, 'Recrutamento completo', 'Portal de carreiras e funil de candidatos'],
    unit: 'vaga',
  },
  BASICO: {
    subtitle: 'RH completo para a sua equipe',
    items: (n) => [`${n} colaboradores inclusos`, `${n + 1} acessos: 1 admin + ${n} colaboradores`, 'Escalas, férias e fechamento da equipe', 'Ponto por localização, com ajuste aprovado pelo gestor'],
    unit: 'colaborador',
  },
  PREMIUM: {
    subtitle: 'RH completo + Recrutamento e Seleção',
    items: (n) => [`${n} colaboradores inclusos`, '60 vagas por mês inclusas', 'Tudo do plano Básico', 'Recrutamento e Seleção completo'],
    unit: 'colaborador',
  },
};

function planCopy(plan: PublicPlatformPlan) {
  const included = plan.includedUnits ?? 0;
  const copy = CARD_COPY[plan.code ?? ''];
  const extra = num(plan.userMonthlyPrice);
  const unit = copy?.unit ?? 'colaborador';
  return {
    subtitle: copy?.subtitle ?? plan.description ?? '',
    items: copy?.items(included) ?? [plan.description ?? ''].filter(Boolean),
    extra: extra > 0 ? { label: unit === 'vaga' ? 'Vaga adicional' : 'Colaborador adicional', text: `${brl(extra)} por ${unit}` } : null,
  };
}
/** Planos reais da plataforma — sem valores de reserva: se a API falhar, o erro é mostrado com nova tentativa. */
export function PricingSection() {
  const [plans, setPlans] = useState<PublicPlatformPlan[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError(''); setPlans(null);
    api.auth.publicPlans().then((items) => setPlans(Array.isArray(items) ? items : []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os planos.'));
  }, []);
  useEffect(load, [load]);

  if (error) return <div className="py-12 text-center text-white/80" role="alert">{error} <button type="button" onClick={load} className="font-semibold underline">Tentar de novo</button></div>;
  if (plans === null) return <p role="status" className="py-12 text-center text-white/70">Carregando planos…</p>;
  if (plans.length === 0) return <p className="py-12 text-center text-white/70">Planos em atualização. <Link href="/suporte" className="font-semibold underline">Fale com a gente</Link>.</p>;

  return (
    <div>
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Escolha o plano <span className="bg-gradient-to-r from-amber-200 to-pink-300 bg-clip-text text-transparent">da sua empresa</span></h2>
        <p className="mt-3 text-sm text-white/70">Preço fixo por mês. Pague só pelo que passar do que está incluso.</p>
      </div>

      <div className={`mx-auto mt-10 grid max-w-5xl items-center gap-5 ${plans.length > 1 ? 'md:grid-cols-2' : 'max-w-md'} ${plans.length > 2 ? 'lg:grid-cols-3' : ''}`}>
        {plans.map((plan) => {
          const price = num(plan.baseMonthlyPrice) || num(plan.price);
          const { subtitle, items, extra } = planCopy(plan);
          const light = Boolean(plan.isRecommended);
          const [reais, cents] = price.toFixed(2).split('.');
          return (
            <article key={plan.id} className={`relative flex flex-col rounded-2xl p-6 ${light ? 'bg-white text-zinc-900 shadow-[0_0_40px_rgba(192,132,252,0.55)] ring-2 ring-purple-300 lg:-my-3 lg:py-9' : 'border border-white/15 bg-white/5 text-white'}`}>
              {light && <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900">⚡ Mais popular</span>}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              {subtitle && <p className={`mt-1 text-xs ${light ? 'text-purple-600' : 'text-purple-200'}`}>{subtitle}</p>}
              <p className="mt-5 flex items-baseline gap-1 font-bold tabular-nums">
                {plan.isFree ? <span className="text-4xl">Grátis</span> : (
                  <>
                    <span className="text-sm">R$</span>
                    <span className="text-5xl">{reais},{cents}</span>
                    <span className={`text-xs font-medium ${light ? 'text-zinc-500' : 'text-white/60'}`}>/mês</span>
                  </>
                )}
              </p>
              <hr className={`my-4 ${light ? 'border-zinc-200' : 'border-white/15'}`} />
              <ul className={`flex-1 space-y-2 text-sm ${light ? 'text-zinc-700' : 'text-white/85'}`}>
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0 text-[var(--color-brand-400)]" aria-hidden="true" />{item}</li>
                ))}
              </ul>
              {extra && (
                <p className={`mt-5 rounded-lg px-3 py-2 text-xs ${light ? 'bg-purple-50 text-zinc-700' : 'bg-white/10 text-white/80'}`}>{extra.label}: <strong>{extra.text}</strong></p>
              )}
              <Link href={`/cadastro?planId=${plan.id}&seats=${plan.includedUnits || 1}`} className={`mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${light ? 'bg-gradient-to-r from-purple-400 to-fuchsia-500 text-white hover:opacity-90' : 'border border-white/30 text-white hover:bg-white/10'}`}>
                Escolher {plan.name}
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}

