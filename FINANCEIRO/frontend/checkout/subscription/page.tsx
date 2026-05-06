"use client";

import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, AlertCircle, Calendar, Loader2 } from 'lucide-react';
import { SubscriptionsService, type Plan, type SubscriptionStatus } from '@/services/subscriptions';
import AppLayout from '@/components/AppLayout';

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, statusData] = await Promise.all([
        SubscriptionsService.getPlans(),
        SubscriptionsService.getStatus()
      ]);
      setPlans(plansData);
      setStatus(statusData);
      if (statusData.plan) {
        const defaultPlan = plansData.find(p => p.id === statusData.plan?.id);
        if (defaultPlan) setSelectedPlan(defaultPlan);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPlan) return;
    setLoadingCheckout(true);
    try {
      const checkoutUrl = await SubscriptionsService.createCheckout(selectedPlan.id, cycle);
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Erro no checkout:', error);
    } finally {
      setLoadingCheckout(false);
    }
  };

  const filteredPlans = plans.filter(p => !status?.plan || p.id !== status.plan.id);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mr-3" />
          <span>Carregando planos...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Assinaturas">
      <div className="max-w-6xl mx-auto p-6 md:p-12">
        {/* Status Card */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-3xl p-8 mb-12 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              {status?.active ? (
                <CheckCircle className="w-12 h-12 text-emerald-500 bg-emerald-100 p-3 rounded-2xl" />
              ) : status?.overdue ? (
                <AlertCircle className="w-12 h-12 text-amber-500 bg-amber-100 p-3 rounded-2xl" />
              ) : (
                <CreditCard className="w-12 h-12 text-indigo-500 bg-indigo-100 p-3 rounded-2xl" />
              )}
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {status?.active ? 'Assinatura Ativa' : status?.overdue ? 'Pagamento em Atraso' : 'Selecione um Plano'}
                </h2>
                {status && (
                  <p className="text-sm text-slate-600 mt-1">
                    Plano: {status.plan?.name || 'Nenhum'} | 
                    Finaliza: {status.endsAt ? new Date(status.endsAt).toLocaleDateString('pt-BR') : 'N/A'}
                    {status.daysLeft !== undefined && ` (${status.daysLeft} dias restantes)`}
                  </p>
                )}
              </div>
            </div>
            {status?.active && (
              <button 
                onClick={() => handleCheckout()}
                className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg"
              >
                Gerenciar Assinatura
              </button>
            )}
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPlans.map((plan) => (
            <div 
              key={plan.id} 
              className={`group bg-white border-2 rounded-3xl p-8 shadow-lg hover:shadow-2xl hover:shadow-indigo-200 transition-all cursor-pointer ${
                selectedPlan?.id === plan.id ? 'border-indigo-500 ring-4 ring-indigo-500/20 shadow-indigo-200/50' : 'border-slate-200 hover:border-indigo-300'
              }`}
              onClick={() => setSelectedPlan(plan)}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-slate-900">{plan.name}</h3>
                {selectedPlan?.id === plan.id && (
                  <CheckCircle className="w-8 h-8 text-indigo-600" />
                )}
              </div>
              <div className="mb-8">
                <div className="text-4xl font-black text-indigo-600 mb-2">
                  R$ {plan.price}
                  <span className="text-2xl text-slate-500 font-normal">/{cycle === 'monthly' ? 'mês' : 'ano'}</span>
                </div>
                <div className="flex gap-2 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCycle('monthly');
                    }}
                    className={`px-4 py-1 rounded-xl font-bold transition-all ${
                      cycle === 'monthly' 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    Mensal
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCycle('yearly');
                    }}
                    className={`px-3 py-1 rounded-xl font-bold transition-all ${
                      cycle === 'yearly' 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    Anual
                    <span className="ml-1 text-xs bg-indigo-200 px-2 py-0.5 rounded-full">-20%</span>
                  </button>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="text-center pt-6 border-t border-slate-200">
                <button 
                  onClick={() => handleCheckout()}
                  disabled={!selectedPlan || selectedPlan.id !== plan.id || loadingCheckout}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {loadingCheckout ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Redirecionando...
                    </>
                  ) : (
                    'Escolher Plano'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {status?.overdue && (
          <div className="mt-16 p-8 bg-amber-50 border border-amber-200 rounded-3xl text-center">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-slate-900 mb-4">Assinatura em Atraso</h3>
            <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
              Sua assinatura está vencida. Renove agora para continuar acessando todas as funcionalidades da Innovation.ia.
            </p>
            <button 
              onClick={() => handleCheckout()}
              className="bg-amber-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-amber-700 transition-all shadow-lg"
            >
              Renovar Agora
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

