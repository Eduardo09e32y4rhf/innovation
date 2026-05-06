import React from 'react';
import { Bot, Users, CreditCard, ArrowRight, CheckCircle, Globe, Shield } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen selection:bg-purple-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/20 backdrop-blur-xl px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 grad-bg rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">I</div>
          <span className="text-xl font-bold tracking-tighter">INNOVATION<span className="text-purple-500">.IA</span></span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
          <a href="#ia" className="hover:text-white transition-colors">IA Engine</a>
          <a href="#rh" className="hover:text-white transition-colors">Enterprise RH</a>
          <a href="#financeiro" className="hover:text-white transition-colors">Financeiro</a>
          <a href="/vagas" className="text-purple-400 hover:text-purple-300 transition-colors font-bold">Vagas Abertas</a>
        </div>
        <div className="flex gap-4">
          <a href="/login" className="px-5 py-2 rounded-full border border-white/10 text-gray-300 text-sm font-bold hover:bg-white/5 transition-all">
            Login
          </a>
          <a href="/vagas" className="px-5 py-2 rounded-full grad-bg text-white text-sm font-bold hover:scale-105 transition-all shadow-lg shadow-purple-500/20">
            Candidatar-se
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40">
          <img src="/innovation_hero_bg_1777651786652.png" alt="Background" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#05050a]/80 to-[#05050a]"></div>
        </div>

        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-purple-400 mb-6">
            <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
            O FUTURO DO TRABALHO CHEGOU
          </div>
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight leading-[0.9] mb-8">
            Gerencie sua <span className="grad-text">Empresa</span> <br /> com Inteligência.
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            A plataforma Next-Gen que unifica IA, Recrutamento, Financeiro e Atendimento em um único Sistema Operacional corporativo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 rounded-2xl grad-bg font-bold text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-xl shadow-purple-500/20">
              Começar Agora <ArrowRight size={20} />
            </button>
            <button className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 font-bold text-lg hover:bg-white/10 transition-colors">
              Ver Demonstração
            </button>
          </div>
        </div>

        {/* Floating Feature Cards */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-6xl w-full">
          <div className="glass p-8 rounded-3xl hover-scale text-left">
            <Bot className="text-purple-400 mb-6" size={40} />
            <h3 className="text-2xl font-bold mb-3">AI Engine</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Análise de currículos, DISC e gerador de mídia integrados com Gemini e GPT-4.</p>
          </div>
          <div className="glass p-8 rounded-3xl hover-scale text-left border-purple-500/30">
            <Users className="text-blue-400 mb-6" size={40} />
            <h3 className="text-2xl font-bold mb-3">RH Estratégico</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Sistema ATS completo com Onboarding automatizado e Gestão de Talentos.</p>
          </div>
          <div className="glass p-8 rounded-3xl hover-scale text-left">
            <CreditCard className="text-neon-400 mb-6" size={40} />
            <h3 className="text-2xl font-bold mb-3">Financeiro Smart</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Checkout, assinaturas e webhooks integrados com Asaas e Stripe nativamente.</p>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 border-t border-white/5 bg-[#080812]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-12">TECNOLOGIAS INTEGRADAS</p>
          <div className="flex flex-wrap justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all">
             {/* Simulação de logos */}
             <div className="font-bold text-2xl">GEMINI</div>
             <div className="font-bold text-2xl">NVIDIA</div>
             <div className="font-bold text-2xl">ASAAS</div>
             <div className="font-bold text-2xl">REACT</div>
             <div className="font-bold text-2xl">FASTAPI</div>
          </div>
        </div>
      </section>
    </div>
  );
}
