'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  Users,
  ArrowRight,
  BarChart3,
  Menu,
  X,
  Loader2,
  TrendingUp,
  MessageSquare,
  Clock,
  HeartHandshake,
  Sparkles,
} from 'lucide-react';

// ─── Componente auxiliar ────────────────────────────────────────────────────
const FeatureCard = ({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) => (
  <div className="bg-zinc-50 p-10 rounded-[2.5rem] border border-zinc-200 hover:border-violet-300 transition-all duration-300 hover:-translate-y-2 group">
    <div className="w-20 h-20 bg-white border border-slate-200 border-black/5 shadow-sm shadow-sm text-violet-700 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-2xl font-bold text-zinc-900 mb-4">{title}</h3>
    <p className="text-zinc-600 font-medium leading-relaxed text-lg">{desc}</p>
  </div>
);

// ─── Landing Page Principal ─────────────────────────────────────────────────
export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Simulador de ROI
  const [businessType, setBusinessType] = useState('');
  const [aiPlan, setAiPlan] = useState<string[] | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorPlan, setErrorPlan] = useState('');

  const loadingMessages = [
    'A analisar o seu perfil de negócio...',
    'A cruzar dados de eficiência...',
    'A calcular horas poupadas...',
    'A desenhar o seu plano de ROI...',
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoadingPlan) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 1500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoadingPlan]);

  const generateInnovationPlan = async () => {
    if (!businessType) return;
    setIsLoadingPlan(true);
    setErrorPlan('');
    setAiPlan(null);

    const makeRequest = async (retries = 0): Promise<void> => {
      try {
        const response = await fetch('/api/ai/landing-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ business_type: businessType }),
        });

        if (!response.ok) {
          throw new Error('Erro no servidor');
        }

        const data = await response.json();
        const text: string = data.answer || '';

        const points = text
          .split('\n')
          .map((line: string) => line.replace(/^[-*•\d.\s]+/, '').trim())
          .filter((line: string) => line.length > 5)
          .slice(0, 3);

        setAiPlan(points.length > 0 ? points : [text]);
      } catch {
        setErrorPlan('O simulador está em manutenção ou atingiu o limite. Tente em instantes.');
      } finally {
        setIsLoadingPlan(false);
      }
    };

    await makeRequest();
  };

  const goToRegister = () => {
    window.location.href = '/register';
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-violet-300 selection:text-violet-900">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white border border-slate-200 border-black/5 shadow-sm shadow-lg py-4' : 'bg-transparent py-6'
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${scrolled ? 'bg-violet-700' : 'bg-white'
                }`}
            >
              <Zap size={22} className={scrolled ? 'text-white' : 'text-violet-700'} />
            </div>
            <span
              className={`text-2xl font-bold tracking-tight ${scrolled ? 'text-zinc-900' : 'text-white'
                }`}
            >
              Innovation
              <span className={scrolled ? 'text-violet-700' : 'text-violet-300'}>IA</span>
            </span>
          </div>

          {/* Links desktop */}
          <div
            className={`hidden md:flex items-center gap-8 text-sm font-semibold ${scrolled ? 'text-zinc-600' : 'text-white/80'
              }`}
          >
            <a href="#historia" className={`transition-colors ${scrolled ? 'hover:text-violet-700' : 'hover:text-white'}`}>Evolução</a>
            <a href="#simulador" className={`transition-colors ${scrolled ? 'hover:text-violet-700' : 'hover:text-white'}`}>Simulador</a>
            <a href="#solucao" className={`transition-colors ${scrolled ? 'hover:text-violet-700' : 'hover:text-white'}`}>Solução</a>
            <a href="#precos" className={`transition-colors ${scrolled ? 'hover:text-violet-700' : 'hover:text-white'}`}>Preços</a>
          </div>

          {/* Acções desktop */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => (window.location.href = '/login')}
              className={`text-sm font-bold transition-colors ${scrolled ? 'text-zinc-600 hover:text-violet-700' : 'text-white hover:text-violet-200'
                }`}
            >
              Login
            </button>
            <button
              onClick={goToRegister}
              className={`px-6 py-2.5 rounded-full font-bold text-sm shadow-xl transition-all hover:-translate-y-1 ${scrolled
                ? 'bg-violet-700 text-white hover:bg-violet-800'
                : 'bg-white border border-slate-200 border-black/5 shadow-sm text-violet-800 hover:bg-zinc-100'
                }`}
            >
              Abra a sua conta
            </button>
          </div>

          {/* Hamburger mobile */}
          <button
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
            className={`md:hidden ${scrolled ? 'text-zinc-900' : 'text-white'}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white border border-slate-200 border-black/5 shadow-sm border-b border-zinc-200 p-6 flex flex-col gap-4 shadow-2xl">
            <a href="#historia" className="text-lg font-semibold text-zinc-800" onClick={() => setIsMenuOpen(false)}>Evolução</a>
            <a href="#simulador" className="text-lg font-semibold text-zinc-800" onClick={() => setIsMenuOpen(false)}>Simulador</a>
            <a href="#precos" className="text-lg font-semibold text-zinc-800" onClick={() => setIsMenuOpen(false)}>Preços</a>
            <hr className="my-2 border-zinc-100" />
            <button onClick={() => (window.location.href = '/login')} className="text-left text-lg font-bold text-zinc-600">Login</button>
            <button onClick={goToRegister} className="bg-violet-700 text-white p-4 rounded-xl font-bold text-center mt-2">Abra a sua conta</button>
          </div>
        )}
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="pt-40 pb-28 md:pt-52 md:pb-40 px-6 bg-gradient-to-br from-violet-900 via-violet-800 to-fuchsia-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-white border border-slate-200 border-black/5 shadow-sm rounded-full blur-[150px] opacity-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white px-5 py-2 rounded-full text-sm font-bold mb-8 backdrop-blur-md">
              <Sparkles size={16} className="text-fuchsia-300" /> O futuro do trabalho chegou
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
              A inteligência que{' '}
              <br className="hidden md:block" />
              <span className="text-fuchsia-300">trabalha por si.</span>
            </h1>

            <p className="text-xl text-violet-100 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium">
              Esqueça planilhas complexas e dezenas de ferramentas caras. Tenha as melhores
              Inteligências Artificiais do mundo (Gemini, Claude e GPT) num único sistema focado em
              facilitar a sua rotina.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                onClick={goToRegister}
                className="w-full sm:w-auto px-8 py-5 bg-white border border-slate-200 border-black/5 shadow-sm text-violet-900 rounded-full font-black text-xl hover:bg-zinc-100 transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] flex items-center justify-center gap-3"
              >
                Começar por R$ 9,99 <ArrowRight size={22} />
              </button>
              <span className="text-violet-200 font-semibold flex items-center gap-2 mt-4 sm:mt-0">
                <ShieldCheck size={20} className="text-emerald-400" /> Cancele quando quiser
              </span>
            </div>
          </div>

          {/* Imagem Hero */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 bg-fuchsia-500 rounded-[3rem] rotate-6 opacity-30" />
            <img
              src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=80"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://placehold.co/1000x550/e2e8f0/475569?text=Innovation+IA';
              }}
              alt="Profissional a usar Innovation IA"
              className="relative rounded-[3rem] shadow-2xl object-cover h-[550px] w-full border-4 border-white/10"
            />
            {/* Floating Card — Social Proof */}
            <div className="absolute bottom-10 -left-12 bg-white border border-slate-200 border-black/5 shadow-sm p-6 rounded-3xl shadow-2xl border border-zinc-100 flex items-center gap-5">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                <Clock className="text-emerald-600" size={28} />
              </div>
              <div>
                <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider">Tempo Economizado</p>
                <p className="text-3xl font-black text-zinc-900">15h / sem.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROVA SOCIAL ───────────────────────────────────────────────────── */}
      <section className="py-12 bg-white border border-slate-200 border-black/5 shadow-sm border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-8">
            Tecnologia que impulsiona as maiores equipas
          </p>
          <div className="flex flex-wrap justify-center gap-12 md:gap-24 opacity-30 grayscale">
            <span className="text-2xl font-black tracking-tighter">GEMINI</span>
            <span className="text-2xl font-black tracking-tighter">CLAUDE</span>
            <span className="text-2xl font-black tracking-tighter">OPENAI</span>
            <span className="text-2xl font-black tracking-tighter">HOSTINGER</span>
          </div>
        </div>
      </section>

      {/* ── HISTÓRIA E EVOLUÇÃO ────────────────────────────────────────────── */}
      <section id="historia" className="py-24 bg-zinc-50 px-6">
        <div className="max-w-4xl mx-auto text-center mb-24">
          <h2 className="text-4xl md:text-6xl font-extrabold text-zinc-900 mb-6 tracking-tight">
            O mundo mudou.
            <br /> A sua rotina também deve.
          </h2>
          <p className="text-xl text-zinc-600 font-medium">
            Entendemos a frustração de usar sistemas lentos e caros. Por isso, criámos a central
            definitiva de produtividade.
          </p>
        </div>

        <div className="max-w-6xl mx-auto space-y-32">
          {/* O Problema */}
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 order-2 md:order-1">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-8 shadow-sm">
                <Users className="text-red-600" size={32} />
              </div>
              <h3 className="text-4xl font-extrabold text-zinc-900 mb-6">
                A forma antiga e cansativa.
              </h3>
              <p className="text-xl text-zinc-600 leading-relaxed mb-8">
                Pagar assinaturas em dólares, gerir dezenas de abas abertas e lidar com interfaces
                confusas em inglês. Um verdadeiro caos que rouba a sua energia.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-4 text-zinc-600 font-semibold text-lg">
                  <X className="text-red-500 bg-red-100 p-1 rounded-full" size={28} /> Custos altos
                  (Dólar + IOF)
                </li>
                <li className="flex items-center gap-4 text-zinc-600 font-semibold text-lg">
                  <X className="text-red-500 bg-red-100 p-1 rounded-full" size={28} /> Perda de
                  foco constante
                </li>
              </ul>
            </div>
            <div className="flex-1 order-1 md:order-2">
              <img
                src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://placehold.co/800x600/e2e8f0/475569?text=Rotina+Cansativa';
                }}
                alt="Profissional frustrado"
                className="rounded-[2.5rem] shadow-2xl grayscale opacity-90 border-8 border-white"
              />
            </div>
          </div>

          {/* A Solução */}
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://placehold.co/800x600/e2e8f0/475569?text=Equipa+Inovadora';
                }}
                alt="Equipa colaborando"
                className="rounded-[2.5rem] shadow-2xl border-8 border-white"
              />
            </div>
            <div className="flex-1">
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mb-8 shadow-sm">
                <Zap className="text-violet-700" size={32} />
              </div>
              <h3 className="text-4xl font-extrabold text-zinc-900 mb-6">
                A revolução Innovation IA.
              </h3>
              <p className="text-xl text-zinc-600 leading-relaxed mb-8">
                Centralizámos as mentes mais brilhantes do planeta num único ambiente seguro, em
                português e faturado em reais. Simples e rápido.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-4 text-zinc-800 font-bold text-lg">
                  <CheckCircle2 className="text-emerald-500 bg-emerald-100 p-1 rounded-full" size={28} />
                  Preço único em Real (R$)
                </li>
                <li className="flex items-center gap-4 text-zinc-800 font-bold text-lg">
                  <CheckCircle2 className="text-emerald-500 bg-emerald-100 p-1 rounded-full" size={28} />
                  Inteligência Multi-Modelo
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── SIMULADOR DE ROI ───────────────────────────────────────────────── */}
      <section id="simulador" className="py-24 bg-violet-800 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-violet-900 to-transparent opacity-80" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
              Descubra o impacto na sua rotina.
            </h2>
            <p className="text-xl text-violet-200 font-medium max-w-2xl mx-auto">
              Diga-nos a sua profissão ou negócio. O nosso simulador de IA mostrará como R$ 9,99
              se transformam em dezenas de horas livres.
            </p>
          </div>

          <div className="bg-white border border-slate-200 border-black/5 shadow-sm rounded-[3rem] p-8 md:p-14 shadow-2xl max-w-4xl mx-auto border-4 border-violet-400/20">
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <input
                type="text"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generateInnovationPlan()}
                placeholder="Ex: Analista de RH, Engenheiro, Vendedor..."
                className="flex-1 bg-zinc-50 border-2 border-zinc-200 rounded-2xl px-8 py-5 focus:border-violet-600 focus:ring-4 focus:ring-violet-600/10 focus:outline-none text-xl font-medium transition-all"
              />
              <button
                onClick={generateInnovationPlan}
                disabled={isLoadingPlan || !businessType}
                className="bg-violet-700 text-white px-10 py-5 rounded-2xl font-bold text-xl hover:bg-violet-800 transition-all disabled:bg-zinc-200 disabled:text-zinc-500 shadow-xl shadow-violet-700/20 flex items-center justify-center gap-3 active:scale-95"
              >
                {isLoadingPlan ? (
                  <Loader2 className="animate-spin" size={28} />
                ) : (
                  'Ver Vantagens'
                )}
              </button>
            </div>

            {isLoadingPlan && (
              <div className="text-center text-zinc-500 font-semibold animate-pulse text-lg">
                {loadingMessages[loadingStep]}
              </div>
            )}

            {(aiPlan || errorPlan) && (
              <div className="border-t border-zinc-100 pt-10 mt-8">
                {errorPlan ? (
                  <div className="p-6 bg-red-50 text-red-600 rounded-2xl font-bold text-center text-lg">
                    {errorPlan}
                  </div>
                ) : (
                  <div>
                    <h4 className="text-2xl font-extrabold text-zinc-900 mb-8 flex items-center gap-3">
                      <HeartHandshake className="text-violet-600" size={32} /> A sua nova realidade:
                    </h4>
                    <div className="grid sm:grid-cols-3 gap-6">
                      {aiPlan!.map((p, i) => (
                        <div
                          key={i}
                          className="bg-zinc-50 p-8 rounded-[2rem] border border-zinc-200 hover:border-violet-300 transition-colors hover:shadow-lg"
                        >
                          <div className="w-12 h-12 bg-violet-100 text-violet-700 font-black text-xl rounded-full flex items-center justify-center mb-6">
                            {i + 1}
                          </div>
                          <p className="text-zinc-800 font-semibold text-lg leading-relaxed">{p}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-12 text-center">
                      <button
                        onClick={goToRegister}
                        className="bg-zinc-900 text-white px-10 py-4 rounded-full font-bold text-xl hover:scale-105 transition-transform flex items-center justify-center gap-3 mx-auto shadow-xl"
                      >
                        Ativar estas vantagens agora <ArrowRight size={24} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── RECURSOS ───────────────────────────────────────────────────────── */}
      <section id="solucao" className="py-24 bg-white border border-slate-200 border-black/5 shadow-sm px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold text-zinc-900 mb-6 tracking-tight">
              Criado para pessoas.
              <br className="hidden md:block" /> Movido a Inteligência.
            </h2>
            <p className="text-xl text-zinc-600 font-medium max-w-2xl mx-auto">
              Não precisa de ser um programador. A nossa plataforma é tão intuitiva como enviar uma
              mensagem no WhatsApp.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            <FeatureCard
              icon={<MessageSquare size={36} />}
              title="Interface Fluida"
              desc="Um chat limpo e direto ao ponto. Faça perguntas, peça análises ou redija e-mails como se falasse com o melhor assistente do mundo."
            />
            <FeatureCard
              icon={<ShieldCheck size={36} />}
              title="Cofre Digital"
              desc="Privacidade não é negociável. Os dados da sua empresa nunca são usados para treinar os modelos abertos ao público."
            />
            <FeatureCard
              icon={<BarChart3 size={36} />}
              title="Modelos Premium"
              desc="Democratizamos o acesso ao Claude 3.5 e GPT-4o. Escolha a mente artificial mais adequada para o desafio do dia."
            />
          </div>
        </div>
      </section>

      {/* ── PREÇOS ─────────────────────────────────────────────────────────── */}
      <section id="precos" className="py-24 bg-zinc-50 px-6 border-t border-zinc-200">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-extrabold text-zinc-900 mb-6 tracking-tight">
            Transparência total.
            <br /> Um plano, tudo incluído.
          </h2>
          <p className="text-xl text-zinc-600 font-medium mb-16">
            Sem contratos bloqueados. Cancele com um clique se não amar a experiência.
          </p>

          <div className="bg-white border border-slate-200 border-black/5 shadow-sm border border-zinc-200 rounded-[3rem] p-12 md:p-20 shadow-2xl max-w-2xl mx-auto relative hover:shadow-violet-900/10 transition-shadow duration-500">
            {/* Badge */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-violet-700 text-white px-8 py-3 rounded-full font-bold text-sm shadow-xl uppercase tracking-widest">
              Acesso Pro
            </div>

            <div className="mb-12">
              <span className="text-7xl md:text-8xl font-black text-zinc-900 tracking-tighter">
                R$ 9,99
              </span>
              <span className="text-zinc-500 font-bold text-2xl">/mês</span>
            </div>

            <ul className="space-y-6 text-left max-w-sm mx-auto mb-14">
              <li className="flex items-center gap-4 text-xl font-semibold text-zinc-700">
                <CheckCircle2 className="text-violet-600" size={28} /> Inteligência Multi-Modelo
              </li>
              <li className="flex items-center gap-4 text-xl font-semibold text-zinc-700">
                <CheckCircle2 className="text-violet-600" size={28} /> Histórico Seguro na Cloud
              </li>
              <li className="flex items-center gap-4 text-xl font-semibold text-zinc-700">
                <CheckCircle2 className="text-violet-600" size={28} /> Zero Taxas de Setup
              </li>
              <li className="flex items-center gap-4 text-xl font-semibold text-zinc-700">
                <CheckCircle2 className="text-violet-600" size={28} /> Suporte Dedicado
              </li>
            </ul>

            <button
              onClick={goToRegister}
              className="w-full py-6 bg-violet-700 text-white rounded-2xl font-black text-2xl hover:bg-violet-800 transition-all shadow-xl shadow-violet-700/20 active:scale-95"
            >
              CRIAR CONTA AGORA
            </button>
            <p className="mt-8 text-zinc-500 font-semibold">Garantia de satisfação imediata.</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="py-16 bg-white border border-slate-200 border-black/5 shadow-sm border-t border-zinc-200 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <Zap size={24} className="text-violet-700 fill-violet-700" />
            <span className="text-2xl font-bold text-zinc-900">
              Innovation<span className="text-violet-700">IA</span>
            </span>
          </div>
          <div className="flex gap-8 text-zinc-500 font-semibold">
            <a href="/termos" className="hover:text-violet-700 transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-violet-700 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-violet-700 transition-colors">Suporte</a>
          </div>
          <p className="text-zinc-400 font-medium">© 2026 Innovation IA. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
