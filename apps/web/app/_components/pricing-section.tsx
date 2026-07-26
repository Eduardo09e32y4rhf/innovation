'use client';

import React, { useState, useEffect } from 'react';
import { api, type PublicPlatformPlan } from '@/app/lib/api';
import { Check, Users, ArrowRight, ShieldCheck, Sparkles, MessageSquare, HeadphonesIcon, HelpCircle, Zap, Star } from 'lucide-react';
import Link from 'next/link';

export function PricingSection({
  onSelectPlan,
  onSeatQuantityChange,
  selectedPlanId,
  initialSeats = 10,
}: {
  onSelectPlan?: (id: string) => void;
  onSeatQuantityChange?: (seats: number) => void;
  selectedPlanId?: string;
  initialSeats?: number;
}) {
  const [plans, setPlans] = useState<PublicPlatformPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [seatQuantity, setSeatQuantity] = useState(initialSeats || 10);
  const [selectedCycle, setSelectedCycle] = useState<'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'>('YEARLY');
  const [quotes, setQuotes] = useState<Record<string, { total: number; commitmentMonths: number; monthlyEquivalent?: number }>>({});

  useEffect(() => {
    api.auth
      .publicPlans()
      .then((data) => {
        if (data && data.length > 0) {
          setPlans(data);
        } else {
          // Fallback visual de planos caso o banco retorne vazio
          setPlans([
            {
              id: 'plan-sr',
              name: 'Innovation Soluções Sr',
              description: 'O ecossistema completo e definitivo para gestão inteligente, RH digital, ASO automático e ponto gamificado.',
              price: 249.9,
              baseMonthlyPrice: 249.9,
              userMonthlyPrice: 3.0,
              cycle: 'MONTHLY',
              maxUsers: 9999,
              maxEmployees: 9999,
              activeModules: ['employees', 'time-track', 'vacations', 'management', 'aso', 'recruitment'],
              isFree: false,
              isRecommended: true,
            },
            {
              id: 'plan-base',
              name: 'Innovation Soluções',
              description: 'Estrutura essencial para empresas em expansão estruturarem processos humanizados com agilidade.',
              price: 199.9,
              baseMonthlyPrice: 199.9,
              userMonthlyPrice: 3.0,
              cycle: 'MONTHLY',
              maxUsers: 9999,
              maxEmployees: 9999,
              activeModules: ['employees', 'time-track', 'vacations'],
              isFree: false,
              isRecommended: false,
            },
          ]);
        }
      })
      .catch(() => {
        // Fallback robusto offline/erro
        setPlans([
          {
            id: 'plan-sr',
            name: 'Innovation Soluções Sr',
            description: 'O ecossistema completo e definitivo para gestão inteligente, RH digital, ASO automático e ponto gamificado.',
            price: 249.9,
            baseMonthlyPrice: 249.9,
            userMonthlyPrice: 3.0,
            cycle: 'MONTHLY',
            maxUsers: 9999,
            maxEmployees: 9999,
            activeModules: ['employees', 'time-track', 'vacations', 'management', 'aso', 'recruitment'],
            isFree: false,
            isRecommended: true,
          },
          {
            id: 'plan-base',
            name: 'Innovation Soluções',
            description: 'Estrutura essencial para empresas em expansão estruturarem processos humanizados com agilidade.',
            price: 199.9,
            baseMonthlyPrice: 199.9,
            userMonthlyPrice: 3.0,
            cycle: 'MONTHLY',
            maxUsers: 9999,
            maxEmployees: 9999,
            activeModules: ['employees', 'time-track', 'vacations'],
            isFree: false,
            isRecommended: false,
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!plans.length) return;
    let active = true;
    const timer = window.setTimeout(() => {
      Promise.allSettled(
        plans.map(async (plan) => {
          try {
            const quote = await api.auth.quotePublicPlan({ planId: plan.id, seatQuantity });
            return [plan.id, quote] as const;
          } catch {
            return null;
          }
        })
      ).then((results) => {
        if (!active) return;
        const validQuotes: Record<string, any> = {};
        results.forEach((res) => {
          if (res.status === 'fulfilled' && res.value) {
            validQuotes[res.value[0]] = res.value[1];
          }
        });
        setQuotes(validQuotes);
      });
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [plans, seatQuantity]);

  function parseMoney(val: any): number {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
    const raw = String(val).trim();
    if (raw === 'NaN' || raw === 'null' || raw === 'undefined') return 0;
    const normalized = raw.includes(',')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,/g, '');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Funções para cálculo dinâmico garantido (sem risco de mostrar R$ 0,00)
  function getPlanCalculation(plan: PublicPlatformPlan) {
    const basePrice = parseMoney(plan.baseMonthlyPrice) || parseMoney(plan.price) || (plan.isRecommended ? 249.9 : 199.9);
    const userPrice = parseMoney(plan.userMonthlyPrice) || 3.0;

    let months = 1;
    let discountPercent = 0;

    if (selectedCycle === 'YEARLY') {
      months = 12;
      discountPercent = 10;
    } else if (selectedCycle === 'SEMIANNUALLY') {
      months = 6;
      discountPercent = 8;
    } else if (selectedCycle === 'QUARTERLY') {
      months = 3;
      discountPercent = 5;
    } else {
      months = 1;
      discountPercent = 0;
    }

    // Se o plano já vier do banco com um ciclo específico (ex: planos separados por ciclo no banco)
    if (plan.commitmentMonths && plan.commitmentMonths > 1) {
      months = plan.commitmentMonths;
      discountPercent = plan.discountPercent || (months === 12 ? 10 : months === 6 ? 8 : months === 3 ? 5 : 0);
    }

    const quote = quotes[plan.id];
    if (quote && quote.total > 0) {
      const qMonths = quote.commitmentMonths || months;
      const qMonthly = quote.monthlyEquivalent || quote.total / qMonths;
      return {
        monthlyEquivalent: qMonthly,
        totalCycle: quote.total,
        months: qMonths,
        discountPercent: plan.discountPercent || discountPercent,
      };
    }

    // Cálculo matemático preciso na hora
    const grossMonthly = basePrice + seatQuantity * userPrice;
    const netMonthly = grossMonthly * (1 - discountPercent / 100);
    const totalCycle = netMonthly * months;

    return {
      monthlyEquivalent: netMonthly,
      totalCycle,
      months,
      discountPercent,
    };
  }

  const isEnterprise = seatQuantity >= 1000;

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-slate-400 font-medium">Carregando planos inteligentes e calculadoras...</p>
      </div>
    );
  }

  if (plans.length === 0) return null;

  return (
    <div className="w-full py-12">
      {/* Cabeçalho da Seção */}
      <div className="mb-16 text-center max-w-3xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm">
          <Sparkles size={14} className="animate-pulse" />
          <span>Investimento Inteligente</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-6 leading-tight">
          Planos Flexíveis e <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400">Transparentes</span>
        </h2>
        <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Selecione o tamanho ideal para a sua equipe e veja as contas em tempo real. Quanto maior o ciclo de assinatura, <span className="text-teal-400 font-bold">maior o seu desconto</span>.
        </p>

        {/* Seletor de Ciclo de Faturamento (Tabs) */}
        <div className="inline-flex p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md mb-10 flex-wrap justify-center gap-1">
          <button
            type="button"
            onClick={() => setSelectedCycle('MONTHLY')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all ${
              selectedCycle === 'MONTHLY'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-lg shadow-teal-500/25 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setSelectedCycle('QUARTERLY')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 ${
              selectedCycle === 'QUARTERLY'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-lg shadow-teal-500/25 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Trimestral <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded font-black">5% OFF</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCycle('SEMIANNUALLY')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 ${
              selectedCycle === 'SEMIANNUALLY'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-lg shadow-teal-500/25 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Semestral <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded font-black">8% OFF</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCycle('YEARLY')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 relative ${
              selectedCycle === 'YEARLY'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-lg shadow-teal-500/25 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Star size={14} className="fill-current text-amber-300" />
            Anual <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.5 rounded font-black animate-pulse">10% OFF</span>
          </button>
        </div>

        {/* Caixa Interativa de Seleção de Licenças (Slider) */}
        <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-teal-500/20 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl max-w-2xl mx-auto relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-teal-500 to-transparent"></div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <Users size={20} />
              </div>
              <div className="text-left">
                <span className="text-base font-bold text-white block">Tamanho da sua Equipe</span>
                <span className="text-xs text-slate-400">Arraste para ajustar o número de colaboradores</span>
              </div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 px-5 py-2 rounded-2xl flex items-center gap-2 shadow-inner">
              <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-300">
                {isEnterprise ? '1.000+' : seatQuantity}
              </span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                {isEnterprise ? 'Licenças (Enterprise)' : `Licença${seatQuantity > 1 ? 's' : ''}`}
              </span>
            </div>
          </div>

          <div className="relative mb-6">
            <input
              type="range"
              min="1"
              max="1000"
              step={seatQuantity > 100 ? 25 : seatQuantity > 20 ? 5 : 1}
              value={seatQuantity}
              onChange={(e) => {
                const seats = Number(e.target.value);
                setSeatQuantity(seats);
                onSeatQuantityChange?.(seats);
              }}
              className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            />
          </div>

          {/* Atalhos rápidos (Pílulas) */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
            {[
              { label: '5 colab.', val: 5 },
              { label: '25 colab.', val: 25 },
              { label: '50 colab.', val: 50 },
              { label: '100 colab.', val: 100 },
              { label: '500 colab.', val: 500 },
              { label: '1000+ (Enterprise)', val: 1000 },
            ].map((shortcut) => (
              <button
                key={shortcut.val}
                type="button"
                onClick={() => {
                  setSeatQuantity(shortcut.val);
                  onSeatQuantityChange?.(shortcut.val);
                }}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  seatQuantity === shortcut.val
                    ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold scale-105 shadow-sm shadow-teal-500/20'
                    : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {shortcut.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid de Planos */}
      <div className={`grid grid-cols-1 ${plans.length === 2 ? 'md:grid-cols-2 max-w-4xl' : plans.length === 3 ? 'md:grid-cols-3 max-w-6xl' : 'md:grid-cols-2 lg:grid-cols-4 max-w-7xl'} gap-8 mx-auto px-4`}>
        {plans.map((plan) => {
          const calc = getPlanCalculation(plan);
          const isSelected = selectedPlanId === plan.id;
          const isRec = plan.isRecommended;

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl border p-8 flex flex-col transition-all duration-300 ${
                isRec
                  ? 'border-teal-500/60 bg-gradient-to-b from-teal-950/40 via-slate-900/90 to-slate-950/90 shadow-[0_0_50px_rgba(45,212,191,0.15)] md:-translate-y-2'
                  : 'border-white/10 bg-gradient-to-b from-slate-900/60 to-slate-950/80 hover:border-white/20 hover:bg-slate-900/80 shadow-xl'
              } ${isSelected ? 'ring-2 ring-teal-400 shadow-[0_0_30px_rgba(45,212,191,0.3)]' : ''}`}
            >
              {isRec && (
                <div className="absolute -top-3.5 inset-x-0 flex justify-center">
                  <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 text-slate-950 text-xs font-black uppercase tracking-widest py-1 px-4 rounded-full shadow-lg shadow-teal-500/30 flex items-center gap-1.5 animate-bounce-short">
                    <Sparkles size={12} className="fill-current" />
                    Recomendado & Completo
                  </span>
                </div>
              )}

              {/* Título e Descrição */}
              <div className="mb-6">
                <h3 className="text-2xl font-black text-white flex items-center justify-between">
                  {plan.name}
                  {isRec && <ShieldCheck className="text-teal-400 shrink-0" size={24} />}
                </h3>
                <p className="text-sm text-slate-400 mt-3 min-h-[44px] leading-relaxed">
                  {plan.description || 'Solução inteligente em nuvem para automação completa de RH e Gestão de Pessoas.'}
                </p>
              </div>

              {/* Preço ou Estado Enterprise */}
              <div className="mb-8 p-5 rounded-2xl bg-slate-950/60 border border-white/5 backdrop-blur-sm">
                {isEnterprise ? (
                  /* ESTADO ENTERPRISE (Depois de 1000 licenças) */
                  <div className="text-center py-2 animate-fadeIn">
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 text-[11px] font-black uppercase tracking-wider mb-2">
                      <Zap size={12} />
                      Volume Intensivo
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-white tracking-tight">
                      Sob Consulta
                    </div>
                    <p className="text-xs text-teal-400 font-bold mt-1">
                      Negociação Especial & SLA 24/7
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2 leading-tight">
                      Para equipes a partir de 1.000 colaboradores com implantação assistida pela engenharia.
                    </p>
                  </div>
                ) : (
                  /* ESTADO PADRÃO DE PREÇO CALCULADO */
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white tracking-tight">
                        {formatCurrency(calc.monthlyEquivalent)}
                      </span>
                      <span className="text-sm font-bold text-slate-400">/mês</span>
                    </div>

                    {calc.months > 1 ? (
                      <div className="mt-2 text-xs text-teal-400 font-semibold flex items-center justify-between">
                        <span>
                          Faturado {calc.months === 12 ? 'anualmente' : calc.months === 6 ? 'semestralmente' : 'trimestralmente'}
                        </span>
                        <span className="font-bold text-white bg-slate-800/80 px-2 py-0.5 rounded">
                          {formatCurrency(calc.totalCycle)}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-slate-400 font-semibold flex items-center justify-between">
                        <span>Faturado mensalmente</span>
                        <span className="font-bold text-white bg-slate-800/80 px-2 py-0.5 rounded">
                          {formatCurrency(calc.totalCycle)}
                        </span>
                      </div>
                    )}

                    {calc.discountPercent > 0 && (
                      <div className="mt-3 inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-black uppercase px-2.5 py-1 rounded-full">
                        <Check size={12} strokeWidth={3} />
                        Economia de {calc.discountPercent}% aplicada
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Lista de Funcionalidades */}
              <div className="flex-1 mb-8">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span>O que está incluso:</span>
                  <div className="h-px flex-1 bg-white/10"></div>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span>
                      <strong className="text-white">
                        {isEnterprise ? '1.000+ licenças' : `${seatQuantity} licença${seatQuantity > 1 ? 's' : ''}`}
                      </strong>{' '}
                      de acesso à plataforma
                    </span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span>Implantação guiada por especialistas</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span>Gestão Eletrônica de Ponto & Férias</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-300">
                    <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span>Portal de Oportunidades & Triagem com IA</span>
                  </li>
                  {isRec && (
                    <>
                      <li className="flex items-start gap-3 text-sm text-teal-300 font-semibold">
                        <div className="w-5 h-5 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                          <Check size={12} strokeWidth={3} />
                        </div>
                        <span>ASO Automático & Clinicas Integradas</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-teal-300 font-semibold">
                        <div className="w-5 h-5 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                          <Check size={12} strokeWidth={3} />
                        </div>
                        <span>Auditoria Avançada & Segurança Governamental</span>
                      </li>
                    </>
                  )}
                  {isEnterprise && (
                    <li className="flex items-start gap-3 text-sm text-amber-300 font-bold bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                      <HeadphonesIcon size={16} className="shrink-0 mt-0.5 text-amber-400" />
                      <span>Gerente de Conta Dedicado & SLA 99.9%</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Botões de Ação */}
              {isEnterprise ? (
                /* BOTÃO DE SUPORTE / COMERCIAL QUANDO > 1000 LICENÇAS */
                <div className="space-y-2">
                  <Link
                    href={`/suporte?subject=Negociacao+Enterprise+${seatQuantity}+licencas+Plano+${plan.name}`}
                    className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 hover:opacity-95 shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5"
                  >
                    <MessageSquare size={18} />
                    Negociar com Suporte
                  </Link>
                  <a
                    href={`https://wa.me/5511999999999?text=${encodeURIComponent(`Olá! Gostaria de negociar o plano Enterprise (${plan.name}) para uma equipe de ${seatQuantity} colaboradores na Innovation RH.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 transition-colors"
                  >
                    <span>💬 Falar no WhatsApp VIP</span>
                  </a>
                </div>
              ) : onSelectPlan ? (
                <button
                  type="button"
                  onClick={() => onSelectPlan(plan.id)}
                  className={`w-full h-14 rounded-2xl font-black text-sm uppercase tracking-wide flex items-center justify-center transition-all transform hover:-translate-y-0.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-950 shadow-lg shadow-teal-500/30'
                      : isRec
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 hover:opacity-95 shadow-lg shadow-teal-500/25'
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                  }`}
                >
                  {isSelected ? '✓ Plano Selecionado' : 'Escolher Este Plano'}
                </button>
              ) : (
                <Link
                  href={`/cadastro?planId=${plan.id}&seats=${seatQuantity}&cycle=${selectedCycle}`}
                  className={`w-full h-14 rounded-2xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 ${
                    isRec
                      ? 'bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 text-slate-950 hover:opacity-95 shadow-lg shadow-teal-500/30'
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                  }`}
                >
                  <span>Criar Minha Empresa</span>
                  <ArrowRight size={18} />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Rodapé de Segurança e Garantia */}
      <div className="mt-16 text-center max-w-2xl mx-auto px-4">
        <div className="inline-flex items-center gap-6 text-xs text-slate-400 font-medium justify-center flex-wrap">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-teal-400" />
            Sem taxa de adesão oculta
          </span>
          <span className="flex items-center gap-1.5">
            <Check size={16} className="text-teal-400" />
            Teste prático sem compromisso
          </span>
          <span className="flex items-center gap-1.5">
            <HelpCircle size={16} className="text-teal-400" />
            Suporte humanizado no Brasil
          </span>
        </div>
      </div>
    </div>
  );
}
