'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, Loader2, Sparkles, Zap, Building2, ShieldCheck, ArrowRight } from 'lucide-react';
import api from '@/app/lib/api';

interface PlatformPlan {
  id: string;
  name: string;
  description: string;
  price: number | string;
  baseMonthlyPrice: number | string;
  userMonthlyPrice: number | string;
  cycle: string;
  isRecommended: boolean;
  maxUsers: number;
  features: string[];
}

export default function PlanosPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [seatQuantity, setSeatQuantity] = useState(10);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  useEffect(() => {
    async function fetchPlans() {
      try {
        const response = await api.request<PlatformPlan[]>('/auth/public-plans');
        setPlans(response || []);
      } catch (err) {
        console.error('Falha ao buscar planos', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const calculatePrice = (plan: PlatformPlan) => {
    const base = Number(plan.baseMonthlyPrice) || 0;
    const userPrice = Number(plan.userMonthlyPrice) || 0;
    let total = base + userPrice * seatQuantity;
    if (billingCycle === 'YEARLY') {
      total = total * 0.9; // 10% discount on yearly
    }
    return total;
  };

  const handleSelectPlan = (planId: string) => {
    router.push(`/cadastro?planId=${planId}&seats=${seatQuantity}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 z-10">
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-medium mb-6 border border-indigo-500/20">
            <Sparkles className="w-4 h-4" />
            <span>O Futuro do RH Chegou</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Planos perfeitos para o tamanho da sua ambição.
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-10">
            Escale sua equipe com uma plataforma all-in-one que cresce junto com a sua empresa. Transparência total, sem taxas escondidas.
          </p>

          {/* Controls: Cycle & Seats */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
            
            {/* Billing Toggle */}
            <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800">
              <button
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all ${billingCycle === 'MONTHLY' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingCycle('YEARLY')}
                className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all ${billingCycle === 'YEARLY' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                Anual <span className="text-emerald-400 ml-1">-10%</span>
              </button>
            </div>

            <div className="w-px h-12 bg-slate-800 hidden md:block"></div>

            {/* Seat Slider */}
            <div className="flex flex-col items-start w-full md:w-64">
              <div className="flex justify-between w-full mb-2">
                <label className="text-sm font-medium text-slate-300">Tamanho da Equipe</label>
                <span className="text-sm font-bold text-indigo-400">{seatQuantity} vidas</span>
              </div>
              <input
                type="range"
                min="1"
                max="500"
                value={seatQuantity}
                onChange={(e) => setSeatQuantity(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`relative flex flex-col p-8 rounded-3xl transition-all duration-300 hover:-translate-y-2 group
                  ${plan.isRecommended 
                    ? 'bg-gradient-to-b from-indigo-900/40 to-slate-900/80 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/20' 
                    : 'bg-slate-900/50 border border-slate-800 hover:border-slate-700'
                  }`}
              >
                {plan.isRecommended && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="bg-indigo-500 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1 shadow-lg shadow-indigo-500/30">
                      <Zap className="w-3 h-3" /> Mais Escolhido
                    </div>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                    {plan.name === 'VIP' ? <Building2 className="text-emerald-400" /> : plan.name === 'Pro' ? <ShieldCheck className="text-indigo-400" /> : null}
                    {plan.name}
                  </h3>
                  <p className="text-slate-400 text-sm min-h-[40px]">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-slate-400">R$</span>
                    <span className="text-5xl font-extrabold text-white tracking-tight">
                      {calculatePrice(plan).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-sm font-medium text-slate-400">/mês</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500 font-medium">
                    Base R$ {Number(plan.baseMonthlyPrice || 0)} + R$ {Number(plan.userMonthlyPrice || 0)} por vida
                  </div>
                </div>

                <div className="flex-grow">
                  <ul className="space-y-4 mb-8">
                    {plan.features?.length > 0 ? (
                      plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                          <span className="text-slate-300 text-sm leading-relaxed">{feature}</span>
                        </li>
                      ))
                    ) : (
                      <>
                        <li className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                          <span className="text-slate-300 text-sm leading-relaxed">Gestão de Colaboradores</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                          <span className="text-slate-300 text-sm leading-relaxed">Controle de Ponto Básico</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                          <span className="text-slate-300 text-sm leading-relaxed">Suporte via Email</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300
                    ${plan.isRecommended
                      ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                >
                  Começar Agora <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
