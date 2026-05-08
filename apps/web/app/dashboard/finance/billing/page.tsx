'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle,
  CreditCard,
  DollarSign,
  Download,
  ExternalLink,
  History,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

const INVOICES = [
  { id: 'inv_01', date: '01/05/2026', amount: 'R$ 149,00', status: 'PAID', plan: 'Professional' },
  { id: 'inv_02', date: '01/04/2026', amount: 'R$ 149,00', status: 'PAID', plan: 'Professional' },
  { id: 'inv_03', date: '01/03/2026', amount: 'R$ 149,00', status: 'PAID', plan: 'Professional' },
  { id: 'inv_04', date: '01/02/2026', amount: 'R$ 99,00', status: 'PAID', plan: 'Starter' },
];

const METRICS = [
  { label: 'Receita Mensal', value: 'R$ 149', change: '+12%', icon: <DollarSign className="text-green-400" size={20} />, color: 'text-green-400' },
  { label: 'Chamadas IA', value: '785/1000', change: '+24%', icon: <Zap className="text-purple-400" size={20} />, color: 'text-purple-400' },
  { label: 'Usuarios Ativos', value: '3', change: '0%', icon: <Users className="text-blue-400" size={20} />, color: 'text-blue-400' },
  { label: 'Economia Estimada', value: 'R$ 4.800', change: 'vs. manual', icon: <TrendingUp className="text-yellow-400" size={20} />, color: 'text-yellow-400' },
];

const PLANS = [
  { name: 'Starter', price: 'R$ 99', features: ['500 chamadas IA/mes', '1 usuario', 'Suporte por email'], current: false },
  { name: 'Professional', price: 'R$ 149', features: ['1000 chamadas IA/mes', '5 usuarios', 'WhatsApp Bot', 'Suporte prioritario'], current: true },
  { name: 'Enterprise', price: 'R$ 499', features: ['Ilimitado', 'Usuarios ilimitados', 'IA customizada', 'SLA garantido'], current: false },
];

export default function BillingPage() {
  const [tab, setTab] = useState<'overview' | 'invoices' | 'plans'>('overview');

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-right-4 duration-700">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Faturamento & Assinatura</h1>
        <p className="text-gray-400">Gerencie seu plano, metricas de uso e historico de pagamentos.</p>
      </header>

      <div className="flex gap-2 mb-8 bg-white/[0.02] p-1.5 rounded-2xl border border-white/5 w-fit">
        {(['overview', 'invoices', 'plans'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all capitalize ${tab === item ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {item === 'overview' ? 'Visao Geral' : item === 'invoices' ? 'Faturas' : 'Planos'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {METRICS.map((metric) => (
              <div key={metric.label} className="glass p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-white/5 rounded-xl">{metric.icon}</div>
                  <span className={`text-xs font-bold ${metric.color}`}>{metric.change}</span>
                </div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{metric.label}</p>
                <h4 className="text-xl font-black">{metric.value}</h4>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="glass p-8 rounded-3xl border-purple-500/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5"><CreditCard size={100} /></div>
              <div className="flex items-center gap-2 mb-6">
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-bold rounded-lg uppercase">Plano Atual</span>
              </div>
              <h2 className="text-2xl font-black mb-1">Professional</h2>
              <p className="text-gray-400 text-sm mb-6">R$ 149,00 / mes - Renova em 01/06</p>
              <div className="space-y-3 mb-8">
                {['1000 chamadas IA/mes', '5 usuarios ativos', 'WhatsApp Bot + Automacoes'].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-xs text-gray-300">
                    <CheckCircle size={14} className="text-purple-400" /> {feature}
                  </div>
                ))}
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-[10px] font-bold mb-2">
                  <span className="text-gray-500">Uso de IA (Mensal)</span>
                  <span>785 / 1000</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 w-[78%]" />
                </div>
              </div>
              <button className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                Gerenciar no Stripe <ExternalLink size={12} />
              </button>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="glass p-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/[0.03]">
                <div className="flex gap-3">
                  <AlertCircle className="text-yellow-500 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-bold text-yellow-400 mb-1">Proxima Cobranca</p>
                    <p className="text-xs text-yellow-500/70 leading-relaxed">
                      Sua assinatura Professional sera renovada automaticamente em <strong>01 de Junho de 2026</strong> por <strong>R$ 149,00</strong>. Mantenha seu cartao atualizado.
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass p-8 rounded-3xl">
                <h3 className="font-bold mb-6 text-sm flex items-center gap-2">
                  <TrendingUp size={16} className="text-purple-400" /> Ultimas Transacoes
                </h3>
                {INVOICES.slice(0, 3).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{invoice.plan}</p>
                      <p className="text-[10px] text-gray-500">{invoice.date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm">{invoice.amount}</span>
                      <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold">PAGO</span>
                    </div>
                  </div>
                ))}
                <button onClick={() => setTab('invoices')} className="mt-4 text-xs text-purple-400 flex items-center gap-1 hover:text-purple-300 transition-colors">
                  Ver todas as faturas <ArrowUpRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="glass p-8 rounded-3xl">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-2"><History size={20} /> Historico de Faturas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                  <th className="pb-4">ID</th>
                  <th className="pb-4">Plano</th>
                  <th className="pb-4">Data</th>
                  <th className="pb-4">Valor</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {INVOICES.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 font-mono text-[10px] text-gray-500">{invoice.id}</td>
                    <td className="py-4 font-medium">{invoice.plan}</td>
                    <td className="py-4">{invoice.date}</td>
                    <td className="py-4 font-mono font-bold">{invoice.amount}</td>
                    <td className="py-4">
                      <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 text-[10px] font-bold uppercase">Pago</span>
                    </td>
                    <td className="py-4 text-right">
                      <button className="p-2 bg-white/5 rounded-lg hover:text-purple-400 transition-colors"><Download size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`glass p-8 rounded-3xl border transition-all ${plan.current ? 'border-purple-500 shadow-lg shadow-purple-500/10' : 'border-white/5 hover:border-white/20'}`}>
              {plan.current ? (
                <span className="inline-block px-3 py-0.5 bg-purple-500 text-[10px] font-bold rounded-full uppercase mb-4">Plano Atual</span>
              ) : null}
              <h3 className="text-xl font-black mb-1">{plan.name}</h3>
              <p className="text-3xl font-black mb-1">{plan.price}<span className="text-sm text-gray-500 font-normal">/mes</span></p>
              <div className="space-y-3 my-8">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-xs text-gray-300">
                    <CheckCircle size={14} className={plan.current ? 'text-purple-400' : 'text-gray-500'} /> {feature}
                  </div>
                ))}
              </div>
              <button className={`w-full py-3 rounded-2xl text-xs font-bold transition-all ${plan.current ? 'bg-white/5 text-gray-400 cursor-default' : 'grad-bg hover:scale-105 shadow-lg shadow-purple-500/20'}`}>
                {plan.current ? 'Plano Ativo' : 'Fazer Upgrade'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
