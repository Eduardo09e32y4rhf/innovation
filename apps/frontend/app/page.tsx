'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu, Menu, PlayCircle, TrendingUp, Check, Users, Terminal, Bot, Smartphone, GitMerge, UserCheck, FileSignature, DollarSign, Linkedin, Sparkles, Megaphone, Code2, Shield, Zap, Lock, Receipt, ScanFace, Key, CheckCircle2, X as XIcon, ArrowRight, AlertTriangle
} from 'lucide-react';

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const goToRegister = () => {
    window.location.href = '/register';
  };

  const goToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <div className="bg-[#020617] text-slate-50 font-sans selection:bg-purple-500 selection:text-white relative overflow-x-hidden min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: `
        .glass-card {
            background: rgba(30, 41, 59, 0.4);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(148, 163, 184, 0.1);
            border-radius: 1rem;
        }
        .gradient-text {
            background: linear-gradient(135deg, #c084fc 0%, #2dd4bf 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .blob-purple {
            position: absolute;
            background: radial-gradient(circle, rgba(147,51,234,0.2) 0%, rgba(0,0,0,0) 70%);
            width: 60vw; height: 60vw; max-width: 800px; max-height: 800px;
            border-radius: 50%; z-index: 0; filter: blur(60px);
            animation: float 20s infinite ease-in-out alternate;
        }
        .blob-teal {
            position: absolute;
            background: radial-gradient(circle, rgba(20,184,166,0.15) 0%, rgba(0,0,0,0) 70%);
            width: 50vw; height: 50vw; max-width: 600px; max-height: 600px;
            border-radius: 50%; z-index: 0; filter: blur(60px);
            animation: float 25s infinite ease-in-out alternate-reverse;
        }
        @keyframes float {
            0% { transform: translate(0, 0); }
            100% { transform: translate(30px, 50px); }
        }
        @keyframes chatPop {
            0% { opacity: 0; transform: translateY(20px) scale(0.95); }
            10% { opacity: 1; transform: translateY(0) scale(1); }
            90% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-20px) scale(0.95); }
        }
        @keyframes typingDot {
            0%, 100% { transform: translateY(0); opacity: 0.5; }
            50% { transform: translateY(-3px); opacity: 1; }
        }
        .anim-chat-1 { animation: chatPop 8s infinite; }
        .anim-chat-2 { animation: chatPop 8s infinite 2s; opacity: 0; animation-fill-mode: backwards; }
        .anim-chat-3 { animation: chatPop 8s infinite 4s; opacity: 0; animation-fill-mode: backwards; }
        .typing-dot { animation: typingDot 1.4s infinite ease-in-out; }
        .typing-dot:nth-child(1) { animation-delay: 0s; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes flowPulse {
            0% { box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.4); border-color: #9333ea; }
            50% { box-shadow: 0 0 20px 5px rgba(20, 184, 166, 0.6); border-color: #2dd4bf; }
            100% { box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.4); border-color: #9333ea; }
        }
        @keyframes lineGlow {
            0% { background-position: 200% center; }
            100% { background-position: -200% center; }
        }
        .anim-flow-node { animation: flowPulse 3s infinite; }
        .anim-flow-line {
            background: linear-gradient(90deg, #334155 0%, #9333ea 50%, #334155 100%);
            background-size: 200% auto;
            animation: lineGlow 3s linear infinite;
        }
        @keyframes typeText {
            0% { width: 0; }
            50%, 100% { width: 100%; }
        }
        @keyframes blinkCursor {
            0%, 100% { border-color: transparent; }
            50% { border-color: #2dd4bf; }
        }
        .anim-typewriter {
            display: inline-block;
            overflow: hidden;
            white-space: nowrap;
            border-right: 2px solid #2dd4bf;
            animation: typeText 4s steps(40, end) infinite, blinkCursor 0.75s step-end infinite;
        }
      `}} />

      {/* Navbar Fixa */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-slate-950/95 backdrop-blur-md border-b border-slate-600/60 shadow-xl' : 'bg-slate-950/85 backdrop-blur-md border-b border-slate-800/60'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16 md:h-20">
                  <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
                      <div className="p-1.5 md:p-2 bg-gradient-to-br from-purple-600 to-teal-500 rounded-lg">
                          <Cpu className="text-white w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <span className="font-bold text-lg md:text-2xl tracking-tight">INNOVATION<span className="text-purple-500">.IA</span></span>
                  </div>
                  
                  {/* Menu Desktop */}
                  <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
                      <a href="#solucoes" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Visão</a>
                      <a href="#recursos" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Demos</a>
                      <a href="#arquitetura" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Infra</a>
                      <a href="#precos" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Planos</a>
                      <button onClick={goToLogin} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Login</button>
                      <button onClick={goToRegister} className="px-5 py-2.5 rounded-lg bg-white text-slate-900 font-bold text-sm hover:bg-slate-200 transition-all shadow-lg hover:shadow-white/20">Acessar Plataforma</button>
                  </div>

                  {/* Menu Mobile */}
                  <div className="md:hidden">
                      <button className="text-slate-300 hover:text-white p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                          {isMenuOpen ? <XIcon className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                      </button>
                  </div>
              </div>
          </div>
          {/* Mobile dropdown */}
          {isMenuOpen && (
              <div className="md:hidden absolute top-full left-0 w-full bg-slate-900 border-b border-slate-800 p-4 flex flex-col gap-4 shadow-2xl">
                  <a href="#solucoes" className="text-slate-300 font-medium" onClick={() => setIsMenuOpen(false)}>Visão</a>
                  <a href="#recursos" className="text-slate-300 font-medium" onClick={() => setIsMenuOpen(false)}>Demos</a>
                  <button onClick={goToLogin} className="text-left text-slate-300 font-medium">Login</button>
                  <button onClick={goToRegister} className="bg-purple-600 text-white p-3 rounded-lg font-bold text-center mt-2">Acessar Plataforma</button>
              </div>
          )}
      </nav>

      {/* Slide 1: Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-24 pb-12 overflow-hidden">
          <div className="blob-purple top-[-5%] left-[-5%]"></div>
          <div className="blob-teal bottom-[5%] right-[-5%]"></div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="text-center max-w-4xl mx-auto">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 md:px-5 md:py-2 rounded-full glass-card border-slate-700 mb-6 md:mb-8 border border-purple-500/50 shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                      <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                      <span className="text-xs md:text-sm text-slate-100 font-semibold tracking-wide">V2.0 Lançada • 100% Zero-Touch</span>
                  </div>
                  
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-[1.15]">
                      O Único Super ERP que o seu <br className="hidden sm:block" />
                      <span className="gradient-text">CEO, RH e CTO</span> vão amar.
                  </h1>
                  
                  <p className="text-base sm:text-lg lg:text-xl text-slate-300 font-light mb-8 md:mb-10 max-w-3xl mx-auto leading-relaxed px-2">
                      Chega de assinar 5 sistemas legados que não se comunicam. A <strong>Innovation.ia</strong> unifica Finanças, Recrutamento e Marketing em um <em>cérebro de Inteligência Artificial</em> que trabalha sozinho.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row justify-center gap-4 px-4 sm:px-0">
                      <button onClick={goToRegister} className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm md:text-base rounded-xl transition-all shadow-[0_0_20px_rgba(147,51,234,0.4)] flex items-center justify-center gap-2">
                          Experimentar Agora <PlayCircle className="w-5 h-5" />
                      </button>
                      <button onClick={goToLogin} className="w-full sm:w-auto px-6 py-3.5 bg-slate-800/80 hover:bg-slate-700 text-white font-semibold text-sm md:text-base rounded-xl transition-all border border-slate-600 backdrop-blur-md flex items-center justify-center">
                          Já tenho conta
                      </button>
                  </div>
              </div>

              {/* Faixa de Métricas */}
              <div className="mt-16 md:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
                  <div className="glass-card p-5 md:p-6 border-l-4 border-l-purple-500 text-center transform hover:-translate-y-1 transition-transform">
                      <div className="text-3xl md:text-4xl font-extrabold text-white mb-1 md:mb-2">-80%</div>
                      <div className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-wider">Tempo no RH</div>
                      <p className="text-[10px] md:text-xs text-slate-500 mt-1.5 md:mt-2">IA entrevista via WhatsApp.</p>
                  </div>
                  <div className="glass-card p-5 md:p-6 border-l-4 border-l-teal-500 text-center transform hover:-translate-y-1 transition-transform">
                      <div class="text-3xl md:text-4xl font-extrabold text-white mb-1 md:mb-2">100%</div>
                      <div className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-wider">API-First</div>
                      <p className="text-[10px] md:text-xs text-slate-500 mt-1.5 md:mt-2">Webhooks e Microserviços.</p>
                  </div>
                  <div className="glass-card p-5 md:p-6 border-l-4 border-l-blue-500 text-center transform hover:-translate-y-1 transition-transform">
                      <div className="text-3xl md:text-4xl font-extrabold text-white mb-1 md:mb-2">1/3</div>
                      <div className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-wider">Do Custo</div>
                      <p className="text-[10px] md:text-xs text-slate-500 mt-1.5 md:mt-2">Adeus assinaturas inúteis.</p>
                  </div>
              </div>
          </div>
      </section>

      {/* Personas */}
      <section id="solucoes" className="py-16 md:py-24 bg-slate-900 border-y border-slate-800 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12 md:mb-16">
                  <span className="text-purple-400 font-bold tracking-wider uppercase text-xs md:text-sm mb-2 block">Feito para todo o time</span>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6">Uma plataforma. <span className="text-teal-400">Três visões de poder.</span></h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                  {/* Donos/Gestores */}
                  <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-6 md:p-8 rounded-2xl border border-slate-700 hover:border-purple-500 transition-colors group">
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-purple-900/50 rounded-xl flex items-center justify-center mb-5 md:mb-6 group-hover:scale-110 transition-transform">
                          <TrendingUp className="text-purple-400 w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">Para Donos & CEOs</h3>
                      <p className="text-slate-400 mb-5 md:mb-6 text-sm leading-relaxed">Assuma o controle. Pare de queimar caixa com processos lentos. Tenha sua empresa na palma da mão com previsões guiadas por IA.</p>
                      <ul className="space-y-2 md:space-y-3 text-xs md:text-sm text-slate-300">
                          <li className="flex items-start gap-2"><Check className="text-purple-400 w-4 h-4 mt-0.5" /> Previsão Preditiva de Caixa</li>
                          <li className="flex items-start gap-2"><Check className="text-purple-400 w-4 h-4 mt-0.5" /> Corte brutal de custos SaaS</li>
                          <li className="flex items-start gap-2"><Check className="text-purple-400 w-4 h-4 mt-0.5" /> Relatórios em Tempo Real</li>
                      </ul>
                  </div>

                  {/* RH */}
                  <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-6 md:p-8 rounded-2xl border border-slate-700 hover:border-teal-500 transition-colors group">
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-teal-900/50 rounded-xl flex items-center justify-center mb-5 md:mb-6 group-hover:scale-110 transition-transform">
                          <Users className="text-teal-400 w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">Para Gestores de RH</h3>
                      <p className="text-slate-400 mb-5 md:mb-6 text-sm leading-relaxed">Chega de ler PDFs. A IA conversa com candidatos no WhatsApp, avalia o fit técnico e te entrega os 3 melhores. Foque em pessoas.</p>
                      <ul className="space-y-2 md:space-y-3 text-xs md:text-sm text-slate-300">
                          <li className="flex items-start gap-2"><Check className="text-teal-400 w-4 h-4 mt-0.5" /> Triagem 100% Autônoma</li>
                          <li className="flex items-start gap-2"><Check className="text-teal-400 w-4 h-4 mt-0.5" /> Postagem Auto no LinkedIn</li>
                          <li className="flex items-start gap-2"><Check className="text-teal-400 w-4 h-4 mt-0.5" /> Contratos gerados sem cliques</li>
                      </ul>
                  </div>

                  {/* Devs/CTOs */}
                  <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-6 md:p-8 rounded-2xl border border-slate-700 hover:border-blue-500 transition-colors group">
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-900/50 rounded-xl flex items-center justify-center mb-5 md:mb-6 group-hover:scale-110 transition-transform">
                          <Terminal className="text-blue-400 w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">Para CTOs & Devs</h3>
                      <p className="text-slate-400 mb-5 md:mb-6 text-sm leading-relaxed">Esqueça monolitos. Entregamos uma infraestrutura robusta e escalável. Integração fácil, doc limpa e segurança de banco.</p>
                      <ul className="space-y-2 md:space-y-3 text-xs md:text-sm text-slate-300">
                          <li className="flex items-start gap-2"><Check className="text-blue-400 w-4 h-4 mt-0.5" /> Microserviços (FastAPI/Node)</li>
                          <li className="flex items-start gap-2"><Check className="text-blue-400 w-4 h-4 mt-0.5" /> Kong Gateway + JWT</li>
                          <li className="flex items-start gap-2"><Check className="text-blue-400 w-4 h-4 mt-0.5" /> Rotação Dinâmica de API Keys</li>
                      </ul>
                  </div>
              </div>
          </div>
      </section>

      {/* Killer Features */}
      <section id="recursos" className="py-16 md:py-24 relative bg-[#060b19] z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16 md:mb-20">
                  <span className="text-teal-400 font-bold tracking-wider uppercase text-xs md:text-sm mb-2 block">Sistema em Ação</span>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6">As 3 <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">"Killer Features"</span></h2>
                  <p className="text-sm md:text-lg text-slate-400 max-w-2xl mx-auto">Diferenciais práticos que aniquilam os processos manuais da sua equipe.</p>
              </div>

              <div className="space-y-20 md:space-y-32">
                  
                  {/* DEMO 1: WhatsApp HR */}
                  <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
                      <div className="lg:w-1/2 w-full order-2 lg:order-1">
                          <div className="glass-card p-4 md:p-6 border-green-500/30 bg-slate-900/50 shadow-[0_0_40px_rgba(34,197,94,0.1)] h-[350px] flex flex-col justify-end overflow-hidden relative">
                              <div className="absolute top-0 left-0 w-full bg-slate-800 p-3 flex items-center gap-3 border-b border-slate-700 z-10">
                                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"><Bot className="w-5 h-5 text-white" /></div>
                                  <div>
                                      <h4 className="text-sm font-bold text-white leading-tight">Innovation.ia Bot</h4>
                                      <p className="text-[10px] text-green-400">Online</p>
                                  </div>
                              </div>
                              <div className="space-y-4 pt-16 font-sans">
                                  <div className="flex items-end gap-2 anim-chat-1">
                                      <div className="bg-slate-800 text-xs md:text-sm p-3 rounded-2xl rounded-bl-none text-slate-200 max-w-[85%] border border-slate-700 shadow-sm">
                                          Fiz minha inscrição no portal para a vaga de Desenvolvedor.
                                      </div>
                                  </div>
                                  <div className="flex items-end gap-2 flex-row-reverse anim-chat-2">
                                      <div className="bg-green-700 text-xs md:text-sm p-3 rounded-2xl rounded-br-none text-white max-w-[85%] shadow-md">
                                          Olá! Sou a IA de recrutamento. Vi seu currículo! Vamos testar seus conhecimentos agora? Como você escalaria um banco PostgreSQL em produção? 🚀
                                      </div>
                                  </div>
                                  <div className="flex items-end gap-2 flex-row-reverse anim-chat-3">
                                      <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl rounded-br-none text-slate-300 shadow-md flex gap-1">
                                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot"></span>
                                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot"></span>
                                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot"></span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="lg:w-1/2 w-full order-1 lg:order-2">
                          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-green-500/20 border border-green-500/50 flex items-center justify-center mb-4 md:mb-6">
                              <Smartphone className="text-green-400 w-6 h-6 md:w-7 md:h-7" />
                          </div>
                          <h3 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Recrutador IA no WhatsApp</h3>
                          <p className="text-sm md:text-base text-slate-400 mb-6 leading-relaxed">
                              O candidato aplica na vaga e a mágica acontece. A IA inicia a entrevista imediatamente via WhatsApp. Sem e-mails ignorados, sem atrasos. Apenas os aprovados chegam à mesa do RH.
                          </p>
                          <div className="flex flex-wrap gap-3">
                              <span className="bg-green-900/40 text-green-400 border border-green-500/30 px-3 py-1 rounded-md text-xs font-bold">100% Autônomo</span>
                              <span className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-md text-xs text-slate-300">Integração Baileys/Node</span>
                          </div>
                      </div>
                  </div>

                  {/* DEMO 2: FlowBuilder */}
                  <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
                      <div className="lg:w-1/2 w-full">
                          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center mb-4 md:mb-6">
                              <GitMerge className="text-purple-400 w-6 h-6 md:w-7 md:h-7" />
                          </div>
                          <h3 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Automação Visual (FlowBuilder)</h3>
                          <p className="text-sm md:text-base text-slate-400 mb-6 leading-relaxed">
                              O seu "Zapier" interno. Conecte o RH ao Financeiro arrastando blocos. O funcionário é aprovado? A plataforma gera o contrato, envia para assinatura e lança o salário no contas a pagar automaticamente.
                          </p>
                      </div>
                      <div className="lg:w-1/2 w-full">
                          <div className="glass-card p-6 border-purple-500/30 bg-slate-900/50 shadow-[0_0_40px_rgba(147,51,234,0.1)] h-[250px] md:h-[300px] flex items-center justify-center">
                              <div className="flex flex-col md:flex-row items-center w-full justify-between gap-4 px-2 md:px-4">
                                  <div className="bg-slate-800 p-3 md:p-4 rounded-xl border border-slate-600 z-10 anim-flow-node flex flex-col items-center gap-2">
                                      <UserCheck className="text-white w-5 h-5 md:w-6 md:h-6" />
                                      <span className="text-[10px] text-slate-300 font-mono">Gatilho RH</span>
                                  </div>
                                  <div className="hidden md:block flex-1 h-1 anim-flow-line rounded-full"></div>
                                  <div className="md:hidden w-1 h-8 anim-flow-line rounded-full"></div>
                                  <div className="bg-purple-900 p-3 md:p-4 rounded-xl border border-purple-500 z-10 anim-flow-node flex flex-col items-center gap-2" style={{animationDelay: "1s"}}>
                                      <FileSignature className="text-white w-5 h-5 md:w-6 md:h-6" />
                                      <span className="text-[10px] text-slate-300 font-mono">Gerar Docs</span>
                                  </div>
                                  <div className="hidden md:block flex-1 h-1 anim-flow-line rounded-full" style={{animationDelay: "1s"}}></div>
                                  <div className="md:hidden w-1 h-8 anim-flow-line rounded-full" style={{animationDelay: "1s"}}></div>
                                  <div className="bg-teal-900 p-3 md:p-4 rounded-xl border border-teal-500 z-10 anim-flow-node flex flex-col items-center gap-2" style={{animationDelay: "2s"}}>
                                      <DollarSign className="text-white w-5 h-5 md:w-6 md:h-6" />
                                      <span className="text-[10px] text-slate-300 font-mono">Pagar ERP</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* DEMO 3: Marketing Headless */}
                  <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
                      <div className="lg:w-1/2 w-full order-2 lg:order-1">
                          <div className="glass-card p-4 md:p-6 border-teal-500/30 bg-slate-900/50 shadow-[0_0_40px_rgba(20,184,166,0.1)] flex items-center justify-center relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-purple-500/5"></div>
                              <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-sm shadow-2xl z-10 transform transition-transform hover:scale-105">
                                  <div className="p-3 border-b border-slate-800 flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 bg-[#0a66c2] rounded text-white flex items-center justify-center"><Linkedin className="w-3 h-3" /></div>
                                          <span className="text-xs font-bold text-slate-200">Auto-Post</span>
                                      </div>
                                      <span className="text-[9px] bg-teal-900/50 text-teal-400 px-2 py-0.5 rounded border border-teal-500/30 flex items-center gap-1 animate-pulse"><Sparkles className="w-2 h-2" /> IA Ativa</span>
                                  </div>
                                  <div className="p-4">
                                      <div className="h-2 bg-slate-800 rounded w-full mb-2"></div>
                                      <div className="h-2 bg-slate-800 rounded w-5/6 mb-4"></div>
                                      <div className="w-full h-28 bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg flex items-center justify-center border border-slate-600">
                                          <span className="text-slate-400 font-bold text-sm tracking-widest uppercase">Imagem Gerada</span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="lg:w-1/2 w-full order-1 lg:order-2">
                          <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-teal-500/20 border border-teal-500/50 flex items-center justify-center mb-4 md:mb-6">
                              <Megaphone className="text-teal-400 w-6 h-6 md:w-7 md:h-7" />
                          </div>
                          <h3 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Marketing Zero-Touch</h3>
                          <p className="text-sm md:text-base text-slate-400 mb-6 leading-relaxed">
                              Esqueça o Canva e designers lentos. A IA lê a descrição da vaga e desenha artes exclusivas, cria copy persuasiva com hashtags otimizadas (SEO) e posta direto no LinkedIn e Instagram corporativos.
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* Tech Specs */}
      <section id="arquitetura" className="py-16 md:py-24 bg-slate-950 relative border-y border-slate-800 overflow-hidden z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="text-center mb-12 md:mb-16">
                  <span className="bg-slate-900 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2 mb-4"><Code2 className="w-3 h-3 md:w-4 md:h-4" /> Tech Specs (Para CTOs)</span>
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">Engenharia <span className="text-blue-400">Enterprise</span></h2>
                  <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">Arquitetura de microsserviços pronta para escalar. Sem gargalos. Sem desculpas.</p>
              </div>

              <div className="max-w-3xl mx-auto bg-[#0d1117] rounded-xl border border-slate-800 shadow-2xl mb-12 overflow-hidden font-mono text-xs md:text-sm">
                  <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                      <span className="ml-4 text-slate-500 text-[10px] md:text-xs">deploy.sh</span>
                  </div>
                  <div className="p-4 md:p-6 text-slate-300">
                      <p className="text-blue-400 mb-2">$ docker-compose up -d --build</p>
                      <p className="mb-1 text-slate-400">[+] Building architecture...</p>
                      <p className="mb-1"><span className="text-green-400">✔</span> Container kong-gateway <span className="text-slate-500">Started (Port 8000)</span></p>
                      <p className="mb-1"><span className="text-green-400">✔</span> Container fastapi-core <span className="text-slate-500">Started (ATS/ERP)</span></p>
                      <p className="mb-3"><span className="text-green-400">✔</span> Container ai-engine <span className="text-slate-500">Started (LLM Router)</span></p>
                      <p className="text-purple-400 anim-typewriter w-max">System is ready and secure. Waiting for requests...</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 hover:border-slate-600 transition-colors">
                      <Shield className="text-blue-400 w-8 h-8 mb-4" />
                      <h4 className="font-bold text-white text-lg mb-2">Kong API Gateway</h4>
                      <p className="text-xs md:text-sm text-slate-400">Gerenciamento de tráfego, Rate Limiting e interceptação na linha de frente. Segurança de banco de dados nativa.</p>
                  </div>
                  <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 hover:border-slate-600 transition-colors">
                      <Zap className="text-purple-400 w-8 h-8 mb-4" />
                      <h4 className="font-bold text-white text-lg mb-2">FastAPI Desacoplado</h4>
                      <p className="text-xs md:text-sm text-slate-400">Entrypoints isolados. Se a IA estiver processando dados pesados, o ERP Financeiro não perde 1ms de performance.</p>
                  </div>
                  <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 hover:border-slate-600 transition-colors">
                      <Lock className="text-teal-400 w-8 h-8 mb-4" />
                      <h4 className="font-bold text-white text-lg mb-2">JWT & CSP Rigoroso</h4>
                      <p className="text-xs md:text-sm text-slate-400">Políticas contra injeção e XSS. Middleware de Correlation-ID para rastrear qualquer anomalia de ponta a ponta.</p>
                  </div>
              </div>
          </div>
      </section>

      {/* Modules */}
      <section id="modulos" className="py-16 md:py-24 relative bg-slate-900 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-10 md:mb-12 text-center">Módulos Extras (Add-ons)</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                  <div className="bg-slate-800/80 p-6 md:p-8 rounded-2xl border-t-4 border-yellow-500 shadow-lg hover:-translate-y-2 transition-transform">
                      <Receipt className="w-8 h-8 md:w-10 md:h-10 text-yellow-500 mb-4" />
                      <h4 className="font-bold text-lg md:text-xl text-white mb-2 md:mb-3">Scanner Financeiro</h4>
                      <p className="text-slate-400 text-xs md:text-sm leading-relaxed">Faça upload de Notas Fiscais em PDF. A IA extrai fornecedor, valor e cadastra direto no contas a pagar.</p>
                  </div>
                  
                  <div className="bg-slate-800/80 p-6 md:p-8 rounded-2xl border-t-4 border-red-500 shadow-lg hover:-translate-y-2 transition-transform">
                      <ScanFace className="w-8 h-8 md:w-10 md:h-10 text-red-500 mb-4" />
                      <h4 className="font-bold text-lg md:text-xl text-white mb-2 md:mb-3">Ponto Biométrico</h4>
                      <p className="text-slate-400 text-xs md:text-sm leading-relaxed">Segurança antifraude. Bater ponto exige Reconhecimento Facial e GPS avançado (bloqueia Mock Location).</p>
                  </div>
                  
                  <div className="bg-slate-800/80 p-6 md:p-8 rounded-2xl border-t-4 border-blue-500 shadow-lg hover:-translate-y-2 transition-transform">
                      <Key className="w-8 h-8 md:w-10 md:h-10 text-blue-500 mb-4" />
                      <h4 className="font-bold text-lg md:text-xl text-white mb-2 md:mb-3">AI Key Manager</h4>
                      <p className="text-slate-400 text-xs md:text-sm leading-relaxed">Rotação automática de chaves (Gemini, Claude, GPT). Se um provedor global cair, a sua empresa continua online.</p>
                  </div>
              </div>
          </div>
      </section>

      {/* Pricing */}
      <section id="precos" className="py-16 md:py-24 bg-[#020617] border-t border-slate-800 z-10 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12 md:mb-16">
                  <h2 className="text-3xl md:text-4xl font-bold mb-3 md:mb-4">Planos Escaláveis</h2>
                  <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto">Mais barato do que assinar 5 ferramentas separadas. O ROI é pago logo na primeira semana de automação.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-center">
                  <div className="bg-slate-900/50 p-6 md:p-8 rounded-2xl border border-slate-800 relative">
                      <h3 className="text-lg md:text-xl font-bold text-white mb-1 md:mb-2">Growth</h3>
                      <p className="text-slate-400 text-xs md:text-sm mb-6">Para times menores.</p>
                      <div className="mb-6">
                          <span className="text-3xl md:text-4xl font-extrabold text-white">R$ 1.490</span><span className="text-xs md:text-sm text-slate-500">/mês</span>
                      </div>
                      <ul className="space-y-3 mb-8 text-xs md:text-sm text-slate-300">
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> ERP Core & Finanças</li>
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> ATS Básico (Email)</li>
                          <li className="flex items-center gap-2 opacity-30"><XIcon className="w-4 h-4" /> RH WhatsApp AI</li>
                          <li className="flex items-center gap-2 opacity-30"><XIcon className="w-4 h-4" /> Marketing Autônomo</li>
                      </ul>
                      <button onClick={goToRegister} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-sm border border-slate-700 transition-colors">Selecionar</button>
                  </div>

                  <div className="bg-slate-800 p-6 md:p-8 rounded-2xl border-2 border-purple-500 relative transform md:-translate-y-4 shadow-[0_0_30px_rgba(147,51,234,0.15)] z-10">
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-500 to-teal-400 text-white text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">Mais Popular</div>
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">Pro V2.0</h3>
                      <p className="text-slate-300 text-xs md:text-sm mb-6">A operação Zero-Touch total.</p>
                      <div className="mb-6">
                          <span className="text-3xl md:text-4xl font-extrabold text-white">R$ 3.890</span><span className="text-xs md:text-sm text-slate-400">/mês</span>
                      </div>
                      <ul className="space-y-3 mb-8 text-xs md:text-sm text-white font-medium">
                          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-400" /> 100% Plano Growth</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-400" /> RH Omnichannel WhatsApp</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-400" /> Automação FlowBuilder Livre</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-400" /> Marketing Headless (LinkedIn/IG)</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-400" /> Ponto Biométrico Inteligente</li>
                      </ul>
                      <button onClick={goToRegister} className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-500 hover:to-teal-400 text-white font-bold rounded-lg shadow-lg text-sm transition-all hover:scale-[1.02]">Acelerar Operação</button>
                  </div>

                  <div className="bg-slate-900/50 p-6 md:p-8 rounded-2xl border border-slate-800 relative">
                      <h3 className="text-lg md:text-xl font-bold text-white mb-1 md:mb-2">Enterprise</h3>
                      <p className="text-slate-400 text-xs md:text-sm mb-6">Infraestrutura dedicada.</p>
                      <div className="mb-6 flex items-end h-10">
                          <span className="text-2xl md:text-3xl font-extrabold text-white leading-none">Consultoria</span>
                      </div>
                      <ul className="space-y-3 mb-8 text-xs md:text-sm text-slate-300">
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-400" /> Instalação On-Premise</li>
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-400" /> Acesso Full API/Webhooks</li>
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-400" /> Suporte SLA Dedicado</li>
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-400" /> Integração com Legados (SAP/Totvs)</li>
                      </ul>
                      <button onClick={goToRegister} className="w-full py-3 bg-transparent border border-slate-600 hover:border-slate-400 text-white font-semibold rounded-lg text-sm transition-colors">Falar com Vendas</button>
                  </div>
              </div>
          </div>
      </section>

      {/* CTA Final */}
      <section id="contato" className="py-16 md:py-24 relative overflow-hidden bg-slate-950 z-10">
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/10 to-transparent z-0"></div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 text-center glass-card p-8 md:p-12 border-purple-500/20 shadow-2xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6">Pronto para a Hiperautomação?</h2>
              <p className="text-sm md:text-lg text-slate-400 mb-8 md:mb-10 max-w-2xl mx-auto">Agende uma demonstração ao vivo e veja a Innovation.ia reduzindo 80% do trabalho braçal da sua equipe na prática.</p>
              
              <form className="max-w-md mx-auto space-y-4">
                  <input type="email" placeholder="Seu e-mail corporativo" className="w-full px-4 py-3.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors" />
                  <button type="button" onClick={goToRegister} className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-transform text-sm md:text-base shadow-lg flex items-center justify-center gap-2">
                      Agendar Demo VIP <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-[10px] md:text-xs text-slate-500 mt-4"><Lock className="w-3 h-3 inline mr-1" /> Dados 100% seguros. Não enviamos spam.</p>
              </form>
          </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#020617] py-12 md:py-16 border-t border-slate-800 z-10 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                  <div className="md:col-span-2 text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                          <Cpu className="text-purple-400 w-5 h-5" />
                          <span className="font-bold text-lg tracking-wider">INNOVATION<span className="text-purple-500">.IA</span></span>
                      </div>
                      <p className="text-slate-500 text-xs md:text-sm max-w-sm mx-auto md:mx-0">O primeiro Super ERP Cognitivo. Automatizando o presente para você construir o futuro.</p>
                  </div>
                  
                  <div className="text-center md:text-left hidden md:block">
                      <h4 className="font-bold text-white mb-4 text-sm">Produto</h4>
                      <ul className="space-y-2 text-xs md:text-sm text-slate-400">
                          <li><a href="#" className="hover:text-purple-400 transition-colors">FlowBuilder</a></li>
                          <li><a href="#" className="hover:text-purple-400 transition-colors">RH Omnichannel</a></li>
                          <li><a href="#precos" className="hover:text-purple-400 transition-colors">Preços</a></li>
                      </ul>
                  </div>
                  
                  <div className="text-center md:text-left hidden md:block">
                      <h4 className="font-bold text-white mb-4 text-sm">Empresa</h4>
                      <ul className="space-y-2 text-xs md:text-sm text-slate-400">
                          <li><a href="#" className="hover:text-purple-400 transition-colors">Sobre</a></li>
                          <li><a href="#" className="hover:text-purple-400 transition-colors">API Docs</a></li>
                          <li><a href="#" className="hover:text-purple-400 transition-colors">Segurança</a></li>
                      </ul>
                  </div>
              </div>

              <div className="p-3 bg-red-900/10 border border-red-900/30 rounded-lg text-center max-w-2xl mx-auto mb-6">
                  <p className="text-[9px] md:text-[10px] text-red-300/50 uppercase tracking-wider">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      Sistema Privado e Confidencial — Propriedade exclusiva de Eduardo Silva / Innovation.ia.
                  </p>
              </div>

              <div className="text-center text-slate-600 text-xs flex flex-col items-center justify-center mt-6 border-t border-slate-800 pt-6">
                  <p className="font-semibold text-slate-500 tracking-widest uppercase text-[10px] mb-2">Designed for Dominance</p>
                  <p>Innovation.ia &copy; 2026.</p>
              </div>
          </div>
      </footer>
    </div>
  );
}
