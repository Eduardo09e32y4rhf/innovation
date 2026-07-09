import type { Metadata } from 'next';
import Image from 'next/image';
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
} from 'lucide-react';
import { Space_Grotesk } from 'next/font/google';

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
});

export const metadata: Metadata = {
  title: 'Innovation RH System | Gestão de RH e Ponto Eletrônico',
  description:
    'A plataforma definitiva para controle de ponto digital, gestão de férias, departamento pessoal e comunicação corporativa inteligente.',
};

const pillars = [
  {
    icon: Clock3,
    title: 'Ponto com Geolocalização',
    description:
      'Registro de jornada com precisão GPS e biometria facial, garantindo segurança jurídica e compliance absoluto.',
  },
  {
    icon: CalendarDays,
    title: 'Gestão de Férias e Ausências',
    description:
      'Solicitações, aprovações e controle automático de períodos aquisitivos e saldos, totalmente digital.',
  },
  {
    icon: Users,
    title: 'Organograma e Equipes',
    description:
      'Estruture departamentos, líderes e regras de acesso de forma clara e visual, simplificando a governança.',
  },
  {
    icon: BellRing,
    title: 'Notificações e Alertas',
    description:
      'Sistema proativo que avisa sobre vencimentos, atrasos e divergências de ponto antes que virem passivos.',
  },
];

const features = [
  {
    title: 'Dashboards Executivos',
    desc: 'Indicadores chave em tempo real para embasar decisões estratégicas da liderança.',
    icon: LineChart,
  },
  {
    title: 'Fechamento de Folha Rápido',
    desc: 'Auditoria de ponto inteligente e cálculos automáticos de horas extras (50% e 100%) e banco de horas.',
    icon: Zap,
  },
  {
    title: 'Saúde Ocupacional (ASO)',
    desc: 'Controle de exames médicos ocupacionais e atestados integrados à folha.',
    icon: ShieldCheck,
  },
  {
    title: 'Ambiente Multi-Tenant',
    desc: 'Gerencie múltiplas empresas, filiais e CNPJs de forma centralizada e segregada.',
    icon: Building2,
  },
  {
    title: 'Segurança de Classe Empresarial',
    desc: 'Controle granular de perfis, auditoria de ações e criptografia de ponta a ponta.',
    icon: Lock,
  },
  {
    title: 'Comunicação Direta',
    desc: 'Mural de recados, chats e avisos para engajar e manter todos alinhados.',
    icon: MessageSquareText,
  },
];

const highlights = [
  'Zero papelada no DP',
  'Totalmente adequado à LGPD',
  'Reconhecimento Facial',
  'Alta performance',
];

export default function Home() {
  return (
    <main className={`${display.className} relative overflow-hidden bg-[#050b14] text-slate-100 selection:bg-teal-500/30 selection:text-teal-200`}>
      {/* Background Grids and Blurs */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] opacity-40" />
      <div className="absolute top-[-10%] left-[-10%] h-[40rem] w-[40rem] rounded-full bg-teal-500/10 blur-[150px]" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[35rem] w-[35rem] rounded-full bg-cyan-600/10 blur-[150px]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 pb-20 pt-6 lg:px-8">
        {/* Navigation */}
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 backdrop-blur-2xl">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-teal-400 to-cyan-500 text-slate-950 shadow-[0_8px_30px_rgba(45,212,191,0.3)]">
              <ShieldCheck size={20} strokeWidth={2.5} />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-black uppercase tracking-[0.2em] text-white">
                Innovation
              </span>
              <span className="block text-[10px] font-bold tracking-[0.25em] text-teal-400">
                RH Connect
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-400 md:flex">
            <a href="#solucoes" className="transition-colors hover:text-white">
              Soluções
            </a>
            <a href="#recursos" className="transition-colors hover:text-white">
              Recursos
            </a>
            <a href="#" className="transition-colors hover:text-white">
              Preços
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden h-10 items-center justify-center rounded-full border border-white/10 px-5 text-xs font-bold text-slate-300 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white sm:flex"
            >
              Área do Cliente
            </Link>
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-full bg-white px-5 text-xs font-black text-slate-950 transition-transform hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(255,255,255,0.15)]"
            >
              Acessar Painel
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="mt-16 grid flex-1 items-center gap-16 lg:mt-24 lg:grid-cols-[1fr_1fr]">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-teal-300">
              <Sparkles size={14} className="text-teal-400" />
              O futuro do Departamento Pessoal
            </div>

            <h1 className="mt-6 text-5xl font-black tracking-[-0.04em] text-white sm:text-6xl lg:text-[5.5rem] lg:leading-[0.95]">
              Gestão de RH <br className="hidden lg:block" />
              <span className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">sem atrito.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base font-medium leading-relaxed text-slate-400 sm:text-lg">
              Automatize rotinas exaustivas, feche a folha em minutos e dê aos seus colaboradores uma experiência transparente. O <strong>Innovation RH Connect</strong> centraliza ponto digital, férias e dados em uma única plataforma incrivelmente rápida.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 px-8 text-sm font-black text-slate-950 shadow-[0_20px_50px_rgba(45,212,191,0.25)] transition-all hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(45,212,191,0.35)]"
              >
                Explorar Plataforma
                <ArrowRight size={18} />
              </Link>
              <a
                href="#solucoes"
                className="inline-flex h-14 items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 text-sm font-black text-white backdrop-blur-md transition-colors hover:bg-white/10"
              >
                Ver como funciona
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              {highlights.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 text-xs font-bold text-slate-400"
                >
                  <CheckCircle2 size={16} className="text-teal-400" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block perspective-1000">
            <div className="absolute inset-0 -z-10 rounded-[2.5rem] bg-gradient-to-br from-teal-500/10 to-cyan-500/10 blur-3xl" />
            
            {/* Real Dashboard Image Representation */}
            <div className="relative rounded-[2rem] border border-white/10 bg-slate-900/60 p-2 shadow-2xl backdrop-blur-2xl transform rotate-y-[-5deg] rotate-x-[2deg] transition-transform duration-700 hover:rotate-0">
              <div className="overflow-hidden rounded-[1.5rem] border border-white/5 bg-[#0b131e]">
                <Image
                  src="/hero-mockup.jpg"
                  alt="Dashboard Innovation RH Connect"
                  width={800}
                  height={450}
                  className="w-full h-auto object-cover opacity-90 transition-opacity duration-500 hover:opacity-100"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Pillars Section */}
        <section id="solucoes" className="mt-32 pt-10">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Tudo o que o DP precisa.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-400">
              Desenhado meticulosamente para resolver os gargalos reais da gestão de pessoas, eliminando o retrabalho e protegendo a empresa contra passivos trabalhistas.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article
                  key={pillar.title}
                  className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 transition-all hover:bg-white/[0.04]"
                >
                  <div className="absolute inset-0 -z-10 bg-gradient-to-b from-teal-400/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-400/10 text-teal-400">
                    <Icon size={24} strokeWidth={2} />
                  </div>
                  <h3 className="mt-6 text-xl font-black text-white">{pillar.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{pillar.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Features Grid */}
        <section id="recursos" className="mt-32 rounded-[3rem] border border-white/5 bg-[#081018] p-8 lg:p-16">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                Vantagens Competitivas
              </div>
              <h2 className="mt-6 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl lg:leading-[1.1]">
                Um ecossistema feito para escalar.
              </h2>
              <p className="mt-6 text-base leading-relaxed text-slate-400">
                A tecnologia da Innovation RH Connect foi construída para atender desde startups enxutas até corporações complexas com matriz e filiais, sem perder a agilidade e a simplicidade de uso.
              </p>
              
              <div className="mt-8">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 font-bold text-teal-400 transition-colors hover:text-teal-300"
                >
                  Conheça o painel executivo
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-teal-400">
                        <Icon size={20} strokeWidth={2} />
                      </div>
                      <h3 className="font-bold text-white">{feature.title}</h3>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-400">
                      {feature.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-32 text-center">
          <h2 className="mx-auto max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Pronto para transformar o seu RH?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-400">
            Acesse o sistema e descubra na prática como a Innovation pode revolucionar a gestão de pessoas da sua empresa.
          </p>
          <div className="mt-10 flex justify-center">
            <Link
              href="/login"
              className="inline-flex h-14 items-center justify-center rounded-full bg-white px-8 text-sm font-black text-slate-950 transition-transform hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(255,255,255,0.15)]"
            >
              Acessar Painel Agora
            </Link>
          </div>
        </section>
        
        {/* Footer */}
        <footer className="mt-32 flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-xs font-bold text-slate-500">
            &copy; {new Date().getFullYear()} Innovation RH System. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-xs font-bold text-slate-500">
            <Link href="#" className="hover:text-white">Privacidade</Link>
            <Link href="#" className="hover:text-white">Termos</Link>
            <Link href="#" className="hover:text-white">Suporte</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
