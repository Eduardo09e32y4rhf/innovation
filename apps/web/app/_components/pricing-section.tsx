'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, type PublicPlatformPlan } from '@/app/lib/api';
import { PlanCard } from './plan-card';


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
        <p className="mt-3 text-sm text-white/70">Preço fixo por mês. Pague só pelo que passar do que está incluso. Todo plano pago começa com 30 dias grátis, sem cartão.</p>
      </div>

      <div className={`mx-auto mt-10 grid max-w-5xl items-center gap-5 ${plans.length > 1 ? 'md:grid-cols-2' : 'max-w-md'} ${plans.length > 2 ? 'lg:grid-cols-3' : ''}`}>
        {plans.map((plan) => (
          <div key={plan.id} className={plan.isRecommended ? 'lg:-my-3' : ''}>
            <PlanCard plan={plan} tone="dark" footer={<Link href={`/cadastro?planId=${plan.id}&seats=${plan.includedUnits || 1}`} className={`mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${plan.isRecommended ? 'bg-gradient-to-r from-purple-400 to-fuchsia-500 text-white hover:opacity-90' : 'border border-white/30 text-white hover:bg-white/10'}`}>Escolher {plan.name}</Link>} />
          </div>
        ))}
      </div>
    </div>
  );
}

