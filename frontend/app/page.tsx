'use client';

import Link from 'next/link';
import { Cpu, Users, DollarSign, BarChart3, HeartHandshake, LifeBuoy, ArrowRight, CheckCircle, Star, Shield, Zap, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';

const MODULES = [
  { icon: Cpu, name: 'Recrutamento IA', desc: 'ATS completo com parsing de CV, ranking preditivo, análise DISC/Big5 e testes técnicos gerados por IA.', color: 'from-green-500 to-emerald-500', tag: 'Módulo 1' },
  { icon: HeartHandshake, name: 'Gestão de RH', desc: 'Avaliação 360°, PDI com barra de progresso, banco de horas, holerites digitais e gamificação.', color: 'from-blue-500 to-cyan-500', tag: 'Módulo 2' },
  { icon: BarChart3, name: 'Projetos & Tempo', desc: 'Kanban multi-visão, time tracking, cálculo de custo por tarefa e automação de workflows.', color: 'from-purple-500 to-violet-500', tag: 'Módulo 3' },
  { icon: DollarSign, name: 'Financeiro', desc: 'Conciliação bancária OFX, custo real da folha (INSS+FGTS), centros de custo e cofre digital.', color: 'from-yellow-500 to-orange-500', tag: 'Módulo 4' },
  { icon: Shield, name: 'Infra & Segurança', desc: 'Criptografia AES-256, RBAC granular, audit trails, webhooks e API pública documentada.', color: 'from-gray-400 to-gray-600', tag: 'Módulo 5' },
  { icon: LifeBuoy, name: 'Central de Serviços', desc: 'Service Desk com filas N1-CONT, SLA visual, KB ativa, CSAT, spike detection e Smart Reply IA.', color: 'from-pink-500 to-rose-500', tag: 'Módulo 6' },
];

const PLANS = [
  {
    name: 'Starter', price: 'R$ 299', period: '/mês', highlight: false,
    features: ['Até 10 funcionários', 'ATS com IA (Gemini Flash)', 'Kanban de projetos', 'Suporte por email', 'Chat IA básico'],
    cta: 'Começar Grátis',
  },
  {
    name: 'Growth', price: 'R$ 799', period: '/mês', highlight: true,
    features: ['Até 50 funcionários', 'Tudo do Starter +', 'RH Completo (360°, PDI)', 'Time Tracking', 'Service Desk', 'Chat IA Pro (Gemini Pro)', 'Relatórios avançados'],
    cta: 'Mais Popular',
  },
  {
    name: 'Enterprise', price: 'R$ 1.999', period: '/mês', highlight: false,
    features: ['Funcionários ilimitados', 'Tudo do Growth +', 'Financeiro Completo', 'CSC com SLA Enterprise', 'API + Webhooks', 'Chat IA Premium (Claude)', 'White-Label', 'Suporte dedicado 24/7'],
    cta: 'Falar com Vendas',
  },
];

const STATS = [
  { value: '6', label: 'Módulos Integrados' },
  { value: '20+', label: 'Endpoints de IA' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '< 2h', label: 'Tempo de Resposta' },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-gray-950/95 backdrop-blur-xl border-b border-purple-500/10 py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            INNOVATION.IA
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition">Módulos</a>
            <a href="#pricing" className="hover:text-white transition">Planos</a>
            <Link href="/status" className="hover:text-white transition">Status</Link>
            <Link href="/jobs" className="hover:text-white transition">Vagas</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition px-4 py-2">
              Entrar
            </Link>
            <Link href="/register" className="text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition shadow-lg shadow-purple-500/20">
              Começar Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-purple-600/15 rounded-full blur-[150px]" />
          <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center px-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 text-sm text-purple-300 mb-8">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            SaaS Enterprise • 6 Módulos • IA Integrada
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-tight tracking-tight">
            Gerencie sua empresa{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              com IA
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Uma plataforma unificada para <strong className="text-white">Recrutamento</strong>,{' '}
            <strong className="text-white">RH</strong>,{' '}
            <strong className="text-white">Projetos</strong>,{' '}
            <strong className="text-white">Financeiro</strong> e{' '}
            <strong className="text-white">Suporte</strong>. Tudo alimentado por inteligência artificial.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition shadow-xl shadow-purple-500/25">
              Experimentar Grátis <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/pricing" className="flex items-center gap-2 bg-gray-900 border border-gray-700 text-gray-300 px-8 py-4 rounded-2xl font-medium hover:bg-gray-800 hover:text-white transition">
              Ver Planos & Preços
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {STATS.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 border-y border-gray-800/50 bg-gray-950/50">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-gray-600 text-sm uppercase tracking-widest mb-6">Projetado para empresas que buscam excelência</p>
          <div className="flex items-center justify-center gap-12 opacity-30">
            {['TechCorp', 'StartupX', 'Inovações SA', 'Digital Labs', 'FinServ'].map(name => (
              <span key={name} className="text-lg font-bold text-gray-500 whitespace-nowrap">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features / Modules Grid */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-purple-400 text-sm font-medium uppercase tracking-widest mb-3">Plataforma Completa</p>
            <h2 className="text-4xl md:text-5xl font-black">6 Módulos. Uma Plataforma.</h2>
            <p className="text-gray-400 mt-4 max-w-xl mx-auto">Do recrutamento ao financeiro, tudo integrado com inteligência artificial.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MODULES.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <div key={i} className="group relative bg-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-purple-500/30 hover:bg-gray-900 transition-all duration-300">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] text-gray-600 uppercase tracking-widest">{mod.tag}</span>
                  <h3 className="text-lg font-bold text-white mt-1 mb-2">{mod.name}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{mod.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-950/50 border-y border-gray-800/30">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black">Comece em 3 minutos</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Crie sua conta', desc: 'Cadastre-se gratuitamente e configure sua empresa.' },
              { step: '02', title: 'Configure seus módulos', desc: 'Ative os módulos que precisa: RH, ATS, Financeiro, Projetos.' },
              { step: '03', title: 'Deixe a IA trabalhar', desc: 'A IA analisa CVs, calcula custos e resolve tickets automaticamente.' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <span className="text-5xl font-black bg-gradient-to-r from-purple-600/30 to-pink-600/30 bg-clip-text text-transparent">{item.step}</span>
                <h3 className="text-lg font-bold text-white mt-3 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-purple-400 text-sm font-medium uppercase tracking-widest mb-3">Planos</p>
            <h2 className="text-4xl md:text-5xl font-black">Simples e Transparente</h2>
            <p className="text-gray-400 mt-4">Sem surpresas. Cancele quando quiser.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan, i) => (
              <div key={i} className={`relative rounded-2xl p-8 border transition-all duration-300
                                ${plan.highlight
                  ? 'bg-gradient-to-b from-purple-900/30 to-gray-900 border-purple-500/50 shadow-xl shadow-purple-500/10 scale-105'
                  : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                    RECOMENDADO
                  </div>
                )}
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/pricing" className={`block text-center py-3 rounded-xl font-medium text-sm transition
                                    ${plan.highlight
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 shadow-lg'
                    : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/20 rounded-3xl p-12 md:p-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4">Pronto para transformar sua empresa?</h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">Junte-se às empresas que já estão usando IA para recrutar melhor, gastar menos e operar com excelência.</p>
            <Link href="/register" className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-100 transition shadow-xl">
              Começar Agora — É Grátis <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 bg-gray-950 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-lg font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">INNOVATION.IA</h4>
              <p className="text-sm text-gray-600">A plataforma SaaS Enterprise que gerencia sua empresa com inteligência artificial.</p>
            </div>
            <div>
              <h5 className="text-sm font-semibold text-white mb-3">Produto</h5>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-white transition">Módulos</a></li>
                <li><Link href="/pricing" className="hover:text-white transition">Preços</Link></li>
                <li><Link href="/status" className="hover:text-white transition">Status</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="text-sm font-semibold text-white mb-3">Recursos</h5>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="/jobs" className="hover:text-white transition">Portal de Vagas</Link></li>
                <li><Link href="/login" className="hover:text-white transition">Área do Cliente</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="text-sm font-semibold text-white mb-3">Contato</h5>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>contato@innovation.ia</li>
                <li>São Paulo, SP</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800/50 pt-6 text-center text-xs text-gray-700">
            © 2026 Innovation.ia Enterprise. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
