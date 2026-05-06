import React from 'react';
import { Check, Zap, Shield, Rocket } from 'lucide-react';

const PricingPage = () => {
  return (
<div className="max-w-6xl mx-auto py-10 animate-in fade-in zoom-in duration-700">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-black mb-4 tracking-tight">Escolha o seu plano</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">Scale seu recrutamento com inteligência artificial. Sem taxas ocultas, cancele quando quiser.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Plano Starter */}
          <PricingCard 
            title="Starter" 
            price="49" 
            desc="Ideal para pequenas empresas."
            features={['5 Vagas Ativas', 'Análise IA Básica', '1 Usuário', 'Suporte via Chat']}
            icon={<Zap size={24} className="text-blue-400" />}
          />

          {/* Plano Professional (DESTAQUE) */}
          <div className="relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 grad-bg rounded-full text-[10px] font-bold uppercase tracking-widest z-10">Mais Popular</div>
            <PricingCard 
              title="Professional" 
              price="149" 
              desc="Para times em crescimento."
              features={['Vagas Ilimitadas', 'Análise IA Avançada', '5 Usuários', 'Integração WhatsApp', 'Dashboard Analytics']}
              highlight={true}
              icon={<Rocket size={24} className="text-purple-400" />}
            />
          </div>

          {/* Plano Enterprise */}
          <PricingCard 
            title="Enterprise" 
            price="499" 
            desc="Solução completa customizada."
            features={['Tudo do Pro', 'Acesso via API', 'Gerente de Conta', 'SLA de 99.9%', 'Custom Onboarding']}
            icon={<Shield size={24} className="text-indigo-400" />}
          />
        </div>
      </div>
);
};

const PricingCard = ({ title, price, desc, features, highlight, icon }) => (
  <div className={`glass p-8 rounded-[40px] flex flex-col h-full transition-all hover:scale-105 ${highlight ? 'border-purple-500/50 shadow-2xl shadow-purple-500/10' : 'border-white/5'}`}>
    <div className="mb-8">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-xs text-gray-500 mb-6">{desc}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-black">R$ {price}</span>
        <span className="text-gray-500 text-sm">/mês</span>
      </div>
    </div>

    <ul className="space-y-4 mb-10 flex-1">
      {features.map((f, i) => (
        <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
          <Check size={16} className="text-green-500" /> {f}
        </li>
      ))}
    </ul>

    <button className={`w-full py-4 rounded-2xl font-bold transition-all ${highlight ? 'grad-bg shadow-lg shadow-purple-500/30' : 'bg-white/5 hover:bg-white/10'}`}>
      Começar Agora
    </button>
  </div>
);

export default PricingPage;

