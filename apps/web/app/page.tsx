'use client';

import React, { useState } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LineChart,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Users,
  Building2,
  Lock,
  Zap,
  MapPin,
  Fingerprint,
  PieChart,
  ChevronDown,
  Star,
} from 'lucide-react';
import { Space_Grotesk } from 'next/font/google';
import { PricingSection } from './_components/pricing-section';

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
});

const pillars = [
  {
    icon: Clock3,
    title: 'Ponto Eletrônico Seguro',
    description: 'Geolocalização (GPS) e Biometria Facial integradas. Fim das fraudes e do ponto britânico.',
  },
  {
    icon: Zap,
    title: 'Fechamento em Minutos',
    description: 'O sistema audita faltas, calcula horas extras (50%, 100%) e banco de horas automaticamente.',
  },
  {
    icon: CalendarDays,
    title: 'Férias sem Planilhas',
    description: 'Acompanhe períodos aquisitivos, saldos e programe férias da equipe sem erros de cálculo.',
  },
  {
    icon: BellRing,
    title: 'Alertas Proativos',
    description: 'O RH é notificado antes que problemas aconteçam (exames a vencer, funcionários sem gestor).',
  },
];

const faqs = [
  {
    q: 'O sistema tem validade jurídica?',
    a: 'A plataforma oferece controles técnicos alinhados à Portaria 671 e à LGPD, como rastreabilidade e auditoria. A conformidade final depende da configuração, dos processos da empresa e de revisão jurídica aplicável ao seu caso.',
  },
  {
    q: 'Os funcionários precisam baixar algum aplicativo?',
    a: 'Não. A Innovation RH Connect é um Web App acessível de qualquer navegador no celular ou computador, sem ocupar memória do aparelho.',
  },
  {
    q: 'E se o funcionário estiver sem internet?',
    a: 'Temos opções de lançamento manual com justificativa obrigatória, que entra no sistema aguardando a aprovação do gestor.',
  },
  {
    q: 'A migração dos dados atuais demora muito?',
    a: 'Não. Nosso processo de integração e cadastro em lote (via planilha ou API) permite que a sua empresa comece a rodar o sistema no mesmo dia.',
  },
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <main className={`${display.className} relative overflow-hidden bg-[#040810] text-slate-100 selection:bg-teal-500/30 selection:text-teal-200`}>
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute top-[-20%] left-[-10%] h-[50rem] w-[50rem] rounded-full bg-teal-500/10 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[40rem] w-[40rem] rounded-full bg-cyan-600/10 blur-[150px] pointer-events-none" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 pb-20 pt-6 lg:px-8">
        
        {/* ================= NAVBAR ================= */}
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.02] px-6 py-4 backdrop-blur-2xl">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-teal-400 to-cyan-500 text-slate-950 shadow-[0_8px_30px_rgba(45,212,191,0.3)]">
              <ShieldCheck size={20} strokeWidth={2.5} />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-black uppercase tracking-[0.2em] text-white">Innovation</span>
              <span className="block text-[10px] font-bold tracking-[0.25em] text-teal-400">RH Connect</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-10 text-xs font-bold uppercase tracking-wider text-slate-400 lg:flex">
            <a href="#beneficios" className="transition-colors hover:text-white">Benefícios</a>
            <a href="#solucao" className="transition-colors hover:text-white">A Solução</a>
            <a href="#planos" className="transition-colors hover:text-white">Ver planos</a>
            <a href="#faq" className="transition-colors hover:text-white">Perguntas</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden text-xs font-bold text-slate-300 hover:text-white sm:block transition-colors">
              Acessar
            </Link>
            <Link href="/cadastro" className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-slate-950 transition-all hover:scale-105 hover:shadow-[0_10px_40px_rgba(255,255,255,0.15)]">
              Criar minha empresa
            </Link>
          </div>
        </header>

        {/* ================= HERO SECTION ================= */}
        <section className="mt-16 grid flex-1 items-center gap-16 lg:mt-24 lg:grid-cols-[1fr_1fr]">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-teal-300">
              <Sparkles size={14} className="text-teal-400" />
              O Fim das Planilhas de RH
            </div>

            <h1 className="mt-8 text-5xl font-black tracking-[-0.04em] text-white sm:text-6xl lg:text-[5rem] lg:leading-[1.05]">
              Feche a folha em minutos, <span className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">não em dias.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-slate-400">
              A <strong>Innovation RH Connect</strong> centraliza ponto com reconhecimento facial, gestão de férias e comunicados em uma plataforma absurdamente rápida, segura e fácil de usar. Liberte seu DP da burocracia.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link href="/cadastro" className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 px-8 text-sm font-black text-slate-950 shadow-[0_20px_50px_rgba(45,212,191,0.25)] transition-all hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(45,212,191,0.35)]">
                Criar minha empresa
                <ArrowRight size={18} />
              </Link>
              <a href="#solucao" className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 text-sm font-black text-white backdrop-blur-md transition-colors hover:bg-white/10">
                Como Funciona
              </a>
            </div>
            
            <div className="mt-12 flex items-center gap-6 border-t border-white/10 pt-6">
              <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-10 w-10 rounded-full border-2 border-[#040810] bg-slate-800" style={{ backgroundImage: `url(https://i.pravatar.cc/100?img=${i+10})`, backgroundSize: 'cover' }} />
                ))}
              </div>
              <p className="text-sm font-medium text-slate-400">
                Junte-se a <strong className="text-white">dezenas de empresas</strong> que<br/> já modernizaram seu RH conosco.
              </p>
            </div>
          </div>

          {/* Pure CSS Hero Mockup */}
          <div className="relative hidden lg:block perspective-[2000px]">
            <div className="absolute inset-0 -z-10 rounded-[2.5rem] bg-gradient-to-br from-teal-500/20 to-cyan-500/20 blur-3xl opacity-50" />
            <div className="relative transform rotate-y-[-10deg] rotate-x-[5deg] transition-transform duration-700 hover:rotate-0 rounded-[2rem] border border-white/10 bg-[#09111c] p-4 shadow-2xl backdrop-blur-3xl">
              
              {/* Fake Browser Window */}
              <div className="flex items-center gap-2 pb-4 border-b border-white/5">
                <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <div className="ml-4 h-6 w-48 rounded-md bg-white/5" />
              </div>

              {/* Fake Dashboard Content */}
              <div className="mt-4 grid grid-cols-[220px_1fr] gap-6">
                
                {/* Sidebar */}
                <div className="space-y-3">
                  <div className="h-10 w-full rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center px-4 gap-3">
                    <LineChart size={16} className="text-teal-400" />
                    <div className="h-2 w-20 rounded bg-teal-400/50" />
                  </div>
                  {[Users, CalendarDays, Clock3, MessageSquareText].map((Icon, idx) => (
                    <div key={idx} className="h-10 w-full rounded-xl bg-transparent flex items-center px-4 gap-3 opacity-60">
                      <Icon size={16} className="text-slate-400" />
                      <div className="h-2 w-16 rounded bg-slate-500" />
                    </div>
                  ))}
                </div>

                {/* Main Content */}
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                      <p className="text-[10px] uppercase font-bold text-slate-500">Horas Extras Mês</p>
                      <p className="text-2xl font-black text-white mt-1">42h 15m</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-400">-12%</span>
                        <span className="text-xs text-slate-500">vs mês anterior</span>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><PieChart size={64}/></div>
                      <p className="text-[10px] uppercase font-bold text-slate-500">Férias Pendentes</p>
                      <p className="text-2xl font-black text-white mt-1">12</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs font-bold text-rose-400">3 críticas</span>
                      </div>
                    </div>
                  </div>

                  {/* Employee Table Mock */}
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                    <p className="text-xs font-bold text-white mb-4">Equipe Online</p>
                    <div className="space-y-3">
                      {[1,2,3].map((i) => (
                        <div key={i} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-700" style={{ backgroundImage: `url(https://i.pravatar.cc/100?img=${i+20})`, backgroundSize: 'cover' }} />
                            <div>
                              <div className="h-2 w-24 rounded bg-white/80 mb-1.5" />
                              <div className="h-1.5 w-16 rounded bg-slate-500" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-400" />
                            <span className="text-[10px] font-bold text-emerald-400">Trabalhando</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* ================= LOGOS SECTION ================= */}
        <section className="mt-32 border-y border-white/10 py-10 text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-8">Empresas que já simplificaram seu RH</p>
          <div className="flex flex-wrap justify-center items-center gap-12 sm:gap-20 opacity-50 grayscale">
            {/* Fake logos using fonts */}
            <h3 className="text-xl font-black">ACME Corp</h3>
            <h3 className="text-xl font-bold italic tracking-tighter">Stark Ind.</h3>
            <h3 className="text-xl font-black tracking-widest">GLOBEX</h3>
            <h3 className="text-xl font-semibold">Soylent</h3>
            <h3 className="text-xl font-bold uppercase">Initech</h3>
          </div>
        </section>

        {/* ================= PROBLEM & AGITATION ================= */}
        <section id="beneficios" className="mt-32">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              O RH tradicional custa <span className="text-rose-400">muito caro</span>.
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Fechamentos de folha que varam a noite, cálculos de horas extras refeitos dezenas de vezes, passivos trabalhistas por falha de registro... Chega de amadorismo.
            </p>
          </div>
          
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article key={pillar.title} className="group relative rounded-[2rem] border border-white/5 bg-white/[0.015] p-8 transition-all hover:bg-white/[0.03] hover:border-teal-500/30">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400/20 to-cyan-500/10 text-teal-400">
                    <Icon size={28} strokeWidth={2} />
                  </div>
                  <h3 className="mt-6 text-lg font-black text-white">{pillar.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{pillar.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ================= DEEP DIVE: CLOCK IN ================= */}
        <section id="solucao" className="mt-40 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-teal-300">
              Controle de Ponto 2.0
            </div>
            <h2 className="mt-6 text-4xl font-black tracking-tight text-white">
              Segurança jurídica em cada batida.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-400">
              Diga adeus ao ponto britânico e fraudes de localização. Nosso sistema captura a localização via GPS no momento do ponto e valida o funcionário através de Biometria Facial usando Inteligência Artificial.
            </p>
            <ul className="mt-8 space-y-4">
              <li className="flex items-center gap-3 text-slate-300 font-medium">
                <CheckCircle2 size={20} className="text-teal-400" /> Previne processos trabalhistas.
              </li>
              <li className="flex items-center gap-3 text-slate-300 font-medium">
                <CheckCircle2 size={20} className="text-teal-400" /> Mapa visual do local de batida (Geofencing).
              </li>
              <li className="flex items-center gap-3 text-slate-300 font-medium">
                <CheckCircle2 size={20} className="text-teal-400" /> Funciona em qualquer celular ou PC.
              </li>
            </ul>
          </div>

          {/* Mobile Clock In App Mockup */}
          <div className="relative flex justify-center">
            <div className="absolute inset-0 bg-teal-500/20 blur-[100px] rounded-full w-3/4 mx-auto" />
            <div className="relative w-[300px] h-[600px] bg-[#0b131e] rounded-[3rem] border-8 border-slate-800 shadow-2xl p-6 overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl" />
              
              <div className="mt-8 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-teal-400">Bater Ponto</p>
                <p className="mt-4 text-4xl font-black tabular-nums text-white">08:00<span className="text-teal-400">:00</span></p>
                <p className="text-xs text-slate-500 mt-1">Segunda, 14 de Agosto</p>
              </div>

              {/* Map Mock */}
              <div className="mt-8 h-48 w-full bg-slate-800 rounded-2xl relative overflow-hidden flex items-center justify-center border border-white/10">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                <div className="h-10 w-10 rounded-full bg-teal-500/20 flex items-center justify-center">
                  <MapPin size={24} className="text-teal-400 drop-shadow-[0_0_10px_rgba(45,212,191,0.8)]" />
                </div>
                <div className="absolute bottom-2 left-2 right-2 bg-[#0b131e]/90 backdrop-blur text-[9px] p-2 rounded-lg text-slate-300 flex justify-between">
                  <span>Av. Paulista, 1500</span>
                  <span className="text-emerald-400 font-bold">GPS OK</span>
                </div>
              </div>

              {/* Action Button */}
              <button className="mt-8 w-full h-14 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-2xl text-slate-950 font-black flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(45,212,191,0.3)]">
                <Fingerprint size={20} /> Autenticar e Bater Ponto
              </button>
            </div>
          </div>
        </section>

        {/* ================= STATS / ROI ================= */}
        <section className="mt-40 rounded-[3rem] border border-white/5 bg-[#060c16] p-10 lg:p-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px]" />
          <div className="relative text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
              Resultados que impactam o caixa da empresa.
            </h2>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
            <div className="text-center sm:px-8 py-4">
              <p className="text-5xl font-black text-teal-400">-80%</p>
              <p className="mt-4 text-sm font-bold text-slate-300">Tempo de fechamento</p>
              <p className="mt-2 text-xs text-slate-500">Do fechamento manual para conferência automatizada em minutos.</p>
            </div>
            <div className="text-center sm:px-8 py-4">
              <p className="text-5xl font-black text-cyan-400">Zero</p>
              <p className="mt-4 text-sm font-bold text-slate-300">Fraudes de Localização</p>
              <p className="mt-2 text-xs text-slate-500">Validação GPS rigorosa impede bater ponto longe do trabalho.</p>
            </div>
            <div className="text-center sm:px-8 py-4">
              <p className="text-5xl font-black text-emerald-400">100%</p>
              <p className="mt-4 text-sm font-bold text-slate-300">Aderência à LGPD</p>
              <p className="mt-2 text-xs text-slate-500">Segurança total e privacidade no manuseio de dados biométricos.</p>
            </div>
          </div>
        </section>

        {/* ================= TESTIMONIALS ================= */}
        <section className="mt-40">
           <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              O que dizem os gestores.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              { name: 'Carolina Mendes', role: 'Gerente de RH', quote: 'A gente perdia 4 dias fechando folha. Hoje fazemos em 2 horas. A conferência do banco de horas é impecável e automática.' },
              { name: 'Roberto Almeida', role: 'CEO / Diretor', quote: 'A visão do painel executivo me deu o controle que eu precisava. Sei exatamente quem está na empresa, quem está de férias e o risco trabalhista.' },
              { name: 'Fernanda Lima', role: 'Coordenadora de DP', quote: 'O suporte via WhatsApp e a facilidade dos funcionários enviarem atestados pelo celular eliminou o papel do nosso departamento.' },
            ].map((t, idx) => (
              <article key={idx} className="rounded-3xl border border-white/5 bg-white/[0.015] p-8 flex flex-col justify-between">
                <div>
                  <div className="flex gap-1 text-amber-400 mb-6">
                    <Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" />
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-slate-300 italic">"{t.quote}"</p>
                </div>
                <div className="mt-8 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-800" style={{ backgroundImage: `url(https://i.pravatar.cc/100?img=${idx+40})`, backgroundSize: 'cover' }} />
                  <div>
                    <p className="text-sm font-black text-white">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ================= PRICING ================= */}
        <section id="planos" className="mt-40 pt-10 border-t border-white/10">
          <PricingSection />
        </section>

        {/* ================= FAQ ================= */}
        <section id="faq" className="mt-40 max-w-3xl mx-auto">
          <h2 className="text-3xl font-black tracking-tight text-white text-center mb-10">Dúvidas Frequentes</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden transition-colors hover:bg-white/[0.04]">
                <button 
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="flex w-full items-center justify-between p-6 text-left"
                >
                  <span className="font-bold text-white">{faq.q}</span>
                  <ChevronDown size={20} className={`text-teal-400 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-6 text-sm leading-relaxed text-slate-400 border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ================= BOTTOM CTA ================= */}
        <section className="mt-40 relative rounded-[3rem] bg-gradient-to-br from-teal-500 to-cyan-600 p-12 lg:p-20 text-center overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
          <div className="relative z-10">
            <h2 className="mx-auto max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Pare de apagar incêndios. Comece a gerir pessoas.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg font-medium text-slate-900/80">
              Entre para a nova era da Gestão de Recursos Humanos e transforme o seu DP em um departamento estratégico e sem falhas.
            </p>
            <div className="mt-10 flex justify-center">
              <Link href="/login" className="inline-flex h-14 items-center justify-center rounded-full bg-slate-950 px-10 text-sm font-black text-white shadow-xl transition-transform hover:-translate-y-1 hover:shadow-2xl">
                Acessar Plataforma Agora
              </Link>
            </div>
          </div>
        </section>
        
        {/* ================= FOOTER ================= */}
        <footer className="mt-20 flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-xs font-bold text-slate-500">
            &copy; {new Date().getFullYear()} Innovation RH System. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-xs font-bold text-slate-500">
            <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
            <Link href="/termos" className="hover:text-white transition-colors">Termos de Uso</Link>
            <Link href="/suporte" className="hover:text-white transition-colors">Suporte</Link>
          </div>
        </footer>

      </div>
    </main>
  );
}
