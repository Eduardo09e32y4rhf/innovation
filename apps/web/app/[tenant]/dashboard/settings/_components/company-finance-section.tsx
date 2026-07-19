'use client';

import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { CreditCard, ExternalLink, FileText, Download, CheckCircle2, AlertTriangle, ArrowRight, Activity, Users, Shield, Zap } from 'lucide-react';
import { useState } from 'react';

export function CompanyFinanceSection({ tenant }: { tenant: string }) {
  const [isChangingPlan, setIsChangingPlan] = useState(false);

  const { data: plans } = useQuery(
    () => api.request<any[]>('/auth/public-plans'),
    [],
  );

  const { data: billing, refetch: refetchBilling } = useQuery(
    () => api.request<any>('/finance/company/status'),
    [],
  );

  const { data: invoices, refetch: refetchInvoices } = useQuery(
    () => api.request<any[]>('/finance/company/invoices'),
    [],
  );

  const changePlan = useMutation(
    async (planId: string) => {
      if (!confirm('Deseja realmente alterar o plano da sua empresa? Isso pode gerar novas cobranças proporcionais.')) return;
      return api.request('/finance/company/change-plan', {
        method: 'POST',
        body: { planId },
      });
    },
    {
      onSuccess: () => {
        alert('Plano alterado com sucesso!');
        setIsChangingPlan(false);
        refetchBilling();
        refetchInvoices();
      },
      onError: (err: any) => alert(err?.message || String(err) || 'Erro ao alterar plano'),
    }
  );

  async function payInvoice() {
    try {
      const checkout = await api.request<{
        active: boolean;
        paymentUrl: string | null;
      }>('/finance/company/checkout', {
        method: 'POST',
      });

      if (!checkout.paymentUrl) {
        throw new Error('Nenhuma cobrança em aberto foi encontrada.');
      }

      window.open(checkout.paymentUrl, '_blank', 'noopener,noreferrer');
      refetchBilling();
      refetchInvoices();
    } catch (err: any) {
      alert(err?.message || String(err) || 'Erro ao processar pagamento');
    }
  }

  const formatCurrency = (val: number | string) => {
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (!billing) return (
    <div className="flex h-40 items-center justify-center rounded-[18px] border border-slate-200 bg-white">
      <p className="text-sm font-bold text-slate-400">Carregando financeiro...</p>
    </div>
  );

  return (
    <section className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-500/20">
            <CreditCard size={19} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-950">
              Gestão Financeira
            </h3>
            <p className="text-xs font-medium text-slate-500">
              Gerencie sua assinatura, pagamentos e notas fiscais
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        
        {/* Current Plan Overview */}
        <div className="grid gap-6 sm:grid-cols-[1fr_300px]">
          {/* Status Panel */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Plano Atual
                </p>
                <div className="flex items-center gap-2">
                  <h4 className="text-xl font-black text-slate-900">{billing.plan?.name || 'Carregando...'}</h4>
                  {billing.company?.status === 'ACTIVE' ? (
                    <span className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      <CheckCircle2 size={12} /> Ativo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-800">
                      <AlertTriangle size={12} /> {billing.company?.status}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Valor
                </p>
                <p className="text-lg font-black text-emerald-600">
                  {billing.plan?.price ? formatCurrency(billing.plan.price) : 'R$ 0,00'}
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                    /{billing.plan?.cycle === 'YEARLY' ? 'ano' : 'mês'}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1"><Users size={12}/> Usuários</p>
                <p className="text-sm font-semibold text-slate-900">
                  {billing.usage?.users || 0} de {billing.usage?.maxUsers >= 9999 ? 'Ilimitado' : billing.usage?.maxUsers}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1"><Shield size={12}/> Vencimento</p>
                <p className="text-sm font-semibold text-slate-900">
                  {billing.subscription?.nextDueDate ? formatDate(billing.subscription.nextDueDate) : '-'}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/60 flex gap-3">
              {billing.currentInvoice && (billing.currentInvoice.status === 'OPEN' || billing.currentInvoice.status === 'OVERDUE') && (
                <button
                  type="button"
                  onClick={payInvoice}
                  className="flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-700 shadow-sm"
                >
                  <Zap size={14} /> Pagar Fatura Aberta
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsChangingPlan(!isChangingPlan)}
                className={`flex h-9 items-center gap-2 rounded-lg border px-4 text-xs font-bold transition ${isChangingPlan ? 'border-violet-600 text-violet-700 bg-violet-50' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                {isChangingPlan ? 'Cancelar Troca' : 'Alterar Plano'}
              </button>
            </div>
          </div>

          {/* Quick stats / Usage */}
          <div className="rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1">
                <Activity size={12} /> Limites do Sistema
              </p>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                    <span>Colaboradores Cadastrados</span>
                    <span>{billing.usage?.employees || 0} / {billing.usage?.maxEmployees >= 9999 ? 'Ilimitado' : billing.usage?.maxEmployees}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div 
                      className="h-full bg-violet-500 rounded-full" 
                      style={{ width: `${Math.min(100, ((billing.usage?.employees || 0) / (billing.usage?.maxEmployees || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                    <span>Acessos de Sistema</span>
                    <span>{billing.usage?.users || 0} / {billing.usage?.maxUsers >= 9999 ? 'Ilimitado' : billing.usage?.maxUsers}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${Math.min(100, ((billing.usage?.users || 0) / (billing.usage?.maxUsers || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Selector */}
        {isChangingPlan && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <h4 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-800">
              Escolha seu novo plano
            </h4>
            <div className="grid gap-4 sm:grid-cols-3">
              {plans?.filter(p => !p.isHidden).map((plan) => (
                <div 
                  key={plan.id}
                  className={`relative flex flex-col justify-between overflow-hidden rounded-[14px] border-2 p-5 transition-all ${
                    billing.plan?.id === plan.id 
                      ? 'border-emerald-500 bg-emerald-50/30' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {billing.plan?.id === plan.id && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-bl-lg">
                      Plano Atual
                    </div>
                  )}
                  
                  <div>
                    <h5 className="text-base font-black text-slate-900">{plan.name}</h5>
                    <p className="mt-1 text-[11px] font-medium text-slate-500 min-h-[32px]">
                      {plan.description || 'Plano completo para sua empresa.'}
                    </p>
                    
                    <div className="my-4 border-t border-slate-100 pt-4">
                      <p className="text-2xl font-black text-slate-900">
                        {formatCurrency(plan.price)}
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                          /{plan.cycle === 'YEARLY' ? 'ano' : 'mês'}
                        </span>
                      </p>
                    </div>

                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        Até {plan.maxEmployees >= 9999 ? 'Ilimitados' : plan.maxEmployees} Colaboradores
                      </li>
                      <li className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        Até {plan.maxUsers >= 9999 ? 'Ilimitados' : plan.maxUsers} Acessos RH/Admin
                      </li>
                      <li className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        {plan.activeModules?.length || 0} Módulos ativos
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    disabled={billing.plan?.id === plan.id || changePlan.loading}
                    onClick={() => changePlan.mutate(plan.id)}
                    className={`flex h-10 w-full items-center justify-center gap-2 rounded-[10px] text-xs font-black transition-all ${
                      billing.plan?.id === plan.id
                        ? 'bg-emerald-100 text-emerald-700 cursor-default'
                        : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg'
                    }`}
                  >
                    {billing.plan?.id === plan.id ? 'Seu Plano' : (changePlan.loading ? 'Processando...' : 'Mudar para este')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoice History */}
        {invoices && invoices.length > 0 && (
          <div>
            <h4 className="mb-4 text-xs font-black uppercase tracking-wider text-slate-800">
              Histórico de Pagamentos e Notas Fiscais
            </h4>
            <div className="overflow-x-auto rounded-[14px] border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Vencimento</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Valor</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Ações / Documentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((invoice) => {
                    // Check if it's paid but we have an amount formatted differently in prisma vs JS. Assuming amount is a number or string representation of float.
                    const amountNum = typeof invoice.amount === 'string' ? parseFloat(invoice.amount) : invoice.amount;
                    return (
                      <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 text-xs font-bold text-slate-700">
                          {formatDate(invoice.dueDate)}
                        </td>
                        <td className="px-5 py-4 text-xs font-black text-slate-900">
                          {formatCurrency(amountNum)}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-black uppercase tracking-wider ${
                            invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                            invoice.status === 'OVERDUE' ? 'bg-rose-100 text-rose-700' :
                            invoice.status === 'CANCELED' ? 'bg-slate-100 text-slate-600' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-3 text-[11px] font-bold">
                            {invoice.invoiceUrl && (
                              <a
                                href={invoice.invoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                <ExternalLink size={13} /> Ver Fatura
                              </a>
                            )}
                            {invoice.fiscalPdfUrl && (
                              <a
                                href={invoice.fiscalPdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-slate-600 hover:text-slate-800 transition-colors"
                              >
                                <FileText size={13} /> NF (PDF)
                              </a>
                            )}
                            {invoice.fiscalXmlUrl && (
                              <a
                                href={invoice.fiscalXmlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-slate-600 hover:text-slate-800 transition-colors"
                              >
                                <Download size={13} /> NF (XML)
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
