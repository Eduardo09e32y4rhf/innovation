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
} from 'lucide-react';
import { Space_Grotesk } from 'next/font/google';

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
});

export const metadata: Metadata = {
  title: 'Innovation RH System | RH, ponto e comunicação em um só lugar',
  description:
    'Uma landing page premium para apresentar a plataforma Innovation RH System com foco em controle de ponto, férias, alertas e comunicação corporativa.',
};

const pillars = [
  {
    icon: Clock3,
    title: 'Ponto sem atrito',
    description:
      'Registros e ajustes organizados em um fluxo claro, com leitura rápida para RH, gestor e colaborador.',
  },
  {
    icon: CalendarDays,
    title: 'Férias e ausências',
    description:
      'Pedidos, aprovações e acompanhamento centralizados para reduzir ruído e acelerar decisões.',
  },
  {
    icon: MessageSquareText,
    title: 'Comunicação direta',
    description:
      'Alertas e mensagens no contexto certo, para a informação certa chegar no momento certo.',
  },
  {
    icon: BellRing,
    title: 'Gestão com alertas',
    description:
      'Pendências, notificações e sinais de risco visíveis antes que virem gargalo operacional.',
  },
];

const modules = [
  'Dashboard executivo',
  'Controle de ponto',
  'Fechamento de período',
  'Férias e afastamentos',
  'Equipe e cadastros',
  'Notificações corporativas',
];

const steps = [
  {
    number: '01',
    title: 'Centralize a operação',
    description:
      'Traga o fluxo de RH para um painel único, sem depender de planilhas espalhadas e mensagens soltas.',
  },
  {
    number: '02',
    title: 'Enxergue o que importa',
    description:
      'Acompanhe marcações, pendências e movimentações com leitura objetiva e priorização visual.',
  },
  {
    number: '03',
    title: 'Tome ação com segurança',
    description:
      'Feche ciclos, responda solicitações e atue com dados organizados, não com suposições.',
  },
];

const highlights = [
  'Experiência premium para RH moderno',
  'Visão executiva para gestão e operação',
  'Baseada nos módulos reais da plataforma',
];

export default function Home() {
  return (
    <main className={`${display.className} relative overflow-hidden bg-[#07111a] text-slate-100`}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35" />
      <div className="absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-teal-400/15 blur-[140px]" />
      <div className="absolute -bottom-40 right-[-6rem] h-[26rem] w-[26rem] rounded-full bg-cyan-500/10 blur-[120px]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 pb-16 pt-5 lg:px-8">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-300 to-cyan-500 text-slate-950 shadow-[0_14px_40px_rgba(45,212,191,0.22)]">
              <ShieldCheck size={22} strokeWidth={2.6} />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-black uppercase tracking-[0.24em] text-teal-200">
                Innovation
              </span>
              <span className="block text-[11px] font-semibold tracking-[0.22em] text-slate-400">
                RH Connect
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-300 md:flex">
            <a href="#solucoes" className="transition-colors hover:text-white">
              Soluções
            </a>
            <a href="#fluxo" className="transition-colors hover:text-white">
              Fluxo
            </a>
            <a href="#modulos" className="transition-colors hover:text-white">
              Módulos
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-black text-slate-200 transition-all hover:border-teal-300/40 hover:bg-teal-400/10 hover:text-white"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-teal-300 to-cyan-400 px-4 text-sm font-black text-slate-950 shadow-[0_16px_36px_rgba(45,212,191,0.24)] transition-transform hover:-translate-y-0.5"
            >
              Abrir painel
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-teal-100">
              <Sparkles size={14} />
              Landing premium para a sua marca
            </div>

            <h1 className="mt-6 text-5xl font-black tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
              O centro operacional do RH moderno.
            </h1>

            <p className="mt-6 max-w-xl text-base font-medium leading-8 text-slate-300 sm:text-lg">
              A Innovation RH System reúne ponto, férias, alertas, equipes e comunicação em uma
              experiência única, clara e premium. Menos ruído. Mais decisão. Mais presença de marca.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black text-slate-950 transition-transform hover:-translate-y-0.5"
              >
                Acessar plataforma
                <ArrowRight size={16} />
              </Link>
              <a
                href="#modulos"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/5 px-6 text-sm font-black text-white backdrop-blur-sm transition-colors hover:bg-white/10"
              >
                Ver módulos
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {highlights.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300"
                >
                  <CheckCircle2 size={14} className="text-teal-300" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-teal-400/10 via-white/5 to-cyan-400/10 blur-3xl" />
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.16),transparent_60%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(15,23,42,0.78))] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-teal-200">
                      Painel executivo
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
                      Visão em tempo real
                    </h2>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <LineChart size={20} className="text-teal-300" />
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <StatCard label="Pontos de hoje" value="128" tone="teal" />
                  <StatCard label="Férias pendentes" value="07" tone="cyan" />
                  <StatCard label="Alertas críticos" value="03" tone="slate" />
                  <StatCard label="Comunicações ativas" value="16" tone="emerald" />
                </div>

                <div className="mt-6 space-y-3">
                  <MiniRow title="Fechamento do período" detail="Fluxo pronto para revisão e exportação." />
                  <MiniRow title="Ocorrências do ponto" detail="Pendências priorizadas por criticidade." />
                  <MiniRow title="Notificações da equipe" detail="Central organizada para comunicação interna." />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="solucoes" className="grid gap-4 border-t border-white/10 py-8 sm:grid-cols-2 xl:grid-cols-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <article
                key={pillar.title}
                className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-transform hover:-translate-y-1"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-400/10 text-teal-200">
                  <Icon size={20} strokeWidth={2.4} />
                </div>
                <h3 className="mt-4 text-lg font-black text-white">{pillar.title}</h3>
                <p className="mt-2 text-sm font-medium leading-7 text-slate-300">{pillar.description}</p>
              </article>
            );
          })}
        </section>

        <section id="fluxo" className="grid gap-4 border-t border-white/10 py-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-teal-200">
              Como a plataforma trabalha
            </p>
            <h2 className="mt-4 max-w-md text-3xl font-black tracking-tight text-white sm:text-4xl">
              Uma jornada simples para a equipe e forte para a liderança.
            </h2>
            <p className="mt-4 max-w-md text-sm font-medium leading-7 text-slate-300">
              A landing pode vender a plataforma como ela realmente é: um centro de operação com
              leitura executiva, ação prática e identidade de marca.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.number}
                className="rounded-[1.5rem] border border-white/10 bg-slate-900/60 p-5 shadow-[0_14px_50px_rgba(0,0,0,0.2)]"
              >
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-teal-200">
                  {step.number}
                </p>
                <h3 className="mt-4 text-xl font-black text-white">{step.title}</h3>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-300">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="modulos" className="border-t border-white/10 py-10">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-teal-200">
                Módulos da marca
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Tudo que o RH precisa, sem parecer uma tela genérica.
              </h2>
              <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-slate-300">
                Os blocos ao lado refletem a organização real da solução e ajudam a apresentar a
                proposta com clareza para decisores, gestores e operação.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {modules.map((module, index) => (
                <article
                  key={module}
                  className="rounded-[1.25rem] border border-white/10 bg-white/5 p-5 transition-all hover:border-teal-300/30 hover:bg-white/8"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-white">{module}</p>
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      0{index + 1}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-7 text-slate-300">
                    Estrutura pensada para comunicar valor com mais sofisticação e menos esforço.
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 py-10">
          <div className="rounded-[2rem] border border-teal-300/15 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_55%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(3,7,18,0.92))] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.35)] sm:p-10">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-teal-200">
                  Próximo passo
                </p>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  A landing que representa a marca precisa abrir com autoridade.
                </h2>
                <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-300">
                  Esta versão já entrega isso: visual premium, mensagem clara, foco em RH e CTA
                  direto para o painel. Se quiser, eu também posso refinar para um tom mais
                  comercial, institucional ou agressivo.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-teal-300 px-6 text-sm font-black text-slate-950 transition-transform hover:-translate-y-0.5"
                >
                  Entrar na conta
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/5 px-6 text-sm font-black text-white transition-colors hover:bg-white/10"
                >
                  Ir ao dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'teal' | 'cyan' | 'slate' | 'emerald';
}) {
  const toneStyles: Record<typeof tone, string> = {
    teal: 'from-teal-300/25 to-teal-300/5 text-teal-100 border-teal-300/15',
    cyan: 'from-cyan-300/20 to-cyan-300/5 text-cyan-100 border-cyan-300/15',
    slate: 'from-slate-200/10 to-slate-200/5 text-slate-100 border-white/10',
    emerald: 'from-emerald-300/20 to-emerald-300/5 text-emerald-100 border-emerald-300/15',
  };

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 ${toneStyles[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-white">{value}</p>
    </div>
  );
}

function MiniRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-400/10 text-teal-200">
          <CheckCircle2 size={16} />
        </span>
        <div>
          <p className="text-sm font-black text-white">{title}</p>
          <p className="text-xs font-medium text-slate-400">{detail}</p>
        </div>
      </div>
    </div>
  );
}

