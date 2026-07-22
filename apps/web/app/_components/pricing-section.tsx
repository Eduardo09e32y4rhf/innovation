'use client';

import React, { useState, useEffect } from 'react';
import { api, type PublicPlatformPlan } from '@/app/lib/api';
import { Check, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function PricingSection({ onSelectPlan, onSeatQuantityChange, selectedPlanId, initialSeats = 1 }: { onSelectPlan?: (id: string) => void; onSeatQuantityChange?: (seats: number) => void; selectedPlanId?: string; initialSeats?: number }) {
  const [plans, setPlans] = useState<PublicPlatformPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [seatQuantity, setSeatQuantity] = useState(initialSeats);
  const [quotes, setQuotes] = useState<Record<string, { total: number; commitmentMonths: number }>>({});

  useEffect(() => {
    api.auth.publicPlans()
      .then(setPlans)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!plans.length) return;
    let active = true;
    const timer = window.setTimeout(() => {
      Promise.all(plans.map(async (plan) => {
        const quote = await api.auth.quotePublicPlan({ planId: plan.id, seatQuantity });
        return [plan.id, quote] as const;
      })).then((entries) => {
        if (active) setQuotes(Object.fromEntries(entries));
      }).catch(() => {
        if (active) setQuotes({});
      });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [plans, seatQuantity]);

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) {
    return <div className="py-20 text-center text-slate-500">Carregando planos...</div>;
  }

  if (plans.length === 0) return null;

  return (
    <div className="w-full">
      <div className="mb-12 text-center max-w-xl mx-auto">
        <h2 className="text-3xl font-black tracking-tight text-white mb-4">Planos Flexíveis e Transparentes</h2>
        <p className="text-slate-400 mb-8">Arraste para selecionar a quantidade de licenças da sua equipe. Quanto maior o ciclo, maior o seu desconto na assinatura base.</p>
        
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users className="text-teal-400" size={24} />
              <span className="text-lg font-bold text-white">Tamanho da Equipe</span>
            </div>
            <span className="text-2xl font-black text-teal-400">{seatQuantity} licença{seatQuantity > 1 ? 's' : ''}</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="1000" 
            value={seatQuantity} 
            onChange={(e) => { const seats = Number(e.target.value); setSeatQuantity(seats); onSeatQuantityChange?.(seats); }}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
            <span>1</span>
            <span>10</span>
            <span>50</span>
            <span>100</span>
            <span>1000+</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {plans.map((plan) => {
          const quote = quotes[plan.id];
          const total = quote?.total ?? 0;
          const monthlyEquivalent = quote ? quote.total / quote.commitmentMonths : 0;
          const isSelected = selectedPlanId === plan.id;
          
          return (
            <div 
              key={plan.id}
              className={`relative rounded-3xl border p-8 flex flex-col transition-all duration-300 ${plan.isRecommended ? 'border-teal-500/50 bg-teal-900/10 shadow-[0_0_40px_rgba(45,212,191,0.1)]' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'} ${isSelected ? 'ring-2 ring-teal-500' : ''}`}
            >
              {plan.isRecommended && (
                <div className="absolute -top-3 inset-x-0 flex justify-center">
                  <span className="bg-gradient-to-r from-teal-400 to-cyan-500 text-slate-950 text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full">
                    Mais Escolhido
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-black text-white">{plan.name}</h3>
                <p className="text-sm text-slate-400 mt-2 min-h-[40px]">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">{formatCurrency(monthlyEquivalent)}</span>
                  <span className="text-sm font-medium text-slate-500">/mês</span>
                </div>
                {plan.commitmentMonths && plan.commitmentMonths > 1 && (
                  <p className="text-xs text-teal-400 font-semibold mt-2">
                    Faturado {plan.cycle === 'YEARLY' ? 'anualmente' : plan.cycle === 'SEMIANNUALLY' ? 'semestralmente' : 'trimestralmente'} ({formatCurrency(total)})
                  </p>
                )}
                {plan.commitmentMonths === 1 && (
                  <p className="text-xs text-slate-500 font-semibold mt-2">
                    Faturado mensalmente ({formatCurrency(total)})
                  </p>
                )}
                {plan.discountPercent && plan.discountPercent > 0 ? (
                  <div className="mt-3 inline-block bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase px-2 py-1 rounded">
                    {plan.discountPercent}% OFF na base
                  </div>
                ) : null}
              </div>

              <div className="flex-1">
                <ul className="space-y-3 mb-8">
                  <li className="flex gap-3 text-sm text-slate-300">
                    <Check size={18} className="text-teal-500 shrink-0" />
                    <span>Plataforma base</span>
                  </li>
                  <li className="flex gap-3 text-sm text-slate-300">
                    <Check size={18} className="text-teal-500 shrink-0" />
                    <span>{seatQuantity} licença{seatQuantity > 1 ? 's' : ''} de acesso</span>
                  </li>
                  <li className="flex gap-3 text-sm text-slate-300">
                    <Check size={18} className="text-teal-500 shrink-0" />
                    <span>Implantação guiada</span>
                  </li>
                </ul>
              </div>

              {onSelectPlan ? (
                <button
                  type="button"
                  onClick={() => onSelectPlan(plan.id)}
                  className={`w-full h-12 rounded-xl font-bold flex items-center justify-center transition-colors ${isSelected ? 'bg-teal-500 text-slate-950' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  {isSelected ? 'Selecionado' : 'Escolher este plano'}
                </button>
              ) : (
                <Link
                  href={`/cadastro?planId=${plan.id}&seats=${seatQuantity}`}
                  className={`w-full h-12 rounded-xl font-bold flex items-center justify-center transition-all ${plan.isRecommended ? 'bg-teal-500 text-slate-950 hover:bg-teal-400' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  Criar minha empresa
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
