'use client';

import {
  ArrowRight, Briefcase, CalendarRange, CheckCircle2, ChevronDown, ClipboardList, FileSpreadsheet, FileUp, Filter, Globe2, HeartHandshake,
  Menu, Sparkles, Sun, UserRoundCog, Users, X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PricingSection } from './_components/pricing-section';
import { PontoDemo, RotatingWord, VagasBoard } from './_components/landing/interactive';
import { Reveal } from './_components/landing/motion';
import './landing.css';

const NAV = [['Vagas', '#vagas'], ['Gestão', '#gestao'], ['Ponto', '#ponto'], ['Planos', '#planos'], ['Dúvidas', '#faq']] as const;

const WORDS = ['contratar', 'escalar', 'organizar', 'crescer', 'cuidar de gente'] as const;

const MARQUEE = ['Vagas e portal de carreiras', 'Funil de candidatos', 'Perguntas e filtros do RH', 'Escalas 5x2 · 6x1 · 12x36', 'Ponto por localização', 'Banco de horas', 'Férias', 'Folha e fechamento', 'Documentos por link', 'Auditoria'];

const JOB_FEATURES = [
  { icon: Globe2, title: 'Portal de carreiras', text: 'Suas vagas publicadas numa página pública, prontas para receber candidatura e currículo.', tone: 'from-fuchsia-500 to-purple-600' },
  { icon: Filter, title: 'Perguntas e filtros seus', text: 'Você decide o que perguntar e o que eliminar. A triagem segue a regra do seu RH, não a de um robô.', tone: 'from-amber-400 to-orange-500' },
  { icon: ClipboardList, title: 'Funil por etapas', text: 'Triagem, entrevista, proposta e contratação — cada candidato no lugar certo, todo mundo vendo o mesmo.', tone: 'from-sky-400 to-indigo-500' },
  { icon: FileUp, title: 'Documentos por link', text: 'Na hora de admitir, a pessoa envia os documentos por um link seguro. Sem WhatsApp, sem e-mail perdido.', tone: 'from-emerald-400 to-teal-500' },
];

const MODULES = [
  { icon: Users, title: 'Funcionários', text: 'Cadastro, documentos, vínculos e importação por planilha com validação linha a linha.' },
  { icon: CalendarRange, title: 'Escalas', text: 'Modelos prontos, trocas pedidas pelo funcionário e aprovadas pelo gestor, com alerta de conflito.' },
  { icon: Sun, title: 'Férias', text: 'Período aquisitivo, saldo e programação sempre à vista.' },
  { icon: Briefcase, title: 'Recrutamento', text: 'Da vaga aberta ao novo colega, no mesmo sistema onde ele vai trabalhar.' },
  { icon: FileSpreadsheet, title: 'Folha e fechamento', text: 'Cálculo pelas regras cadastradas, conferência por pessoa e PDF no fim.' },
  { icon: UserRoundCog, title: 'Acessos e auditoria', text: 'Cada pessoa vê o que precisa e tudo fica registrado: quem fez o quê e quando.' },
];

const JOURNEY = [
  { emoji: '📣', title: 'Abre a vaga', text: 'Publica no portal de carreiras com as suas perguntas.' },
  { emoji: '🔎', title: 'Escolhe', text: 'Triagem, entrevista e proposta no funil.' },
  { emoji: '🎉', title: 'Contrata', text: 'Recebe os documentos por link e cadastra.' },
  { emoji: '🗓️', title: 'Escala', text: 'Põe a pessoa na escala e acompanha o ponto.' },
  { emoji: '✅', title: 'Fecha o mês', text: 'Confere, fecha e baixa o PDF.' },
];

const FAQ = [
  { q: 'Dá para usar só o recrutamento?', a: 'O recrutamento faz parte da mesma plataforma de gestão. Você abre vagas, recebe candidaturas e conduz o funil, e quando contrata a pessoa já está no sistema onde vai trabalhar.' },
  { q: 'Quem decide quem passa na triagem?', a: 'Você. As perguntas e os filtros são configurados pelo seu RH e a triagem não depende de inteligência artificial. A decisão é sempre de uma pessoa.' },
  { q: 'O sistema tem validade jurídica?', a: 'A plataforma oferece controles técnicos como rastreabilidade, auditoria e registro com horário do servidor e localização. A conformidade final depende da configuração e dos processos da sua empresa, com revisão jurídica aplicável ao seu caso.' },
  { q: 'Como funciona o ponto?', a: 'O funcionário registra a batida na tela de Escalas. O servidor grava o horário e a localização do momento, sem reconhecimento facial. A empresa define as regras, como cerca virtual e tolerâncias.' },
  { q: 'E se alguém esquecer de bater o ponto?', a: 'O funcionário pede o ajuste na mesma tela, com justificativa. O gestor aprova ou reprova e tudo fica registrado.' },
  { q: 'Consigo trazer os dados que já tenho?', a: 'Sim. O cadastro aceita importação por planilha e mostra os erros linha a linha antes de você confirmar.' },
  { q: 'Meus dados ficam protegidos?', a: 'O acesso é separado por empresa e por perfil, com senhas fortes e registro de auditoria. Há consentimento e termos de uso na plataforma, em linha com a LGPD.' },
];

function Logo({ size = 40 }: { size?: number }) {
  return <Image src="/logo-innovation-clean.png" alt="" width={size * 2} height={size * 2} priority className="rounded-full object-cover" style={{ width: size, height: size }} />;
}

export default function Home() {
  const [open, setOpen] = useState<number | null>(0);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen scroll-smooth text-white" style={{ background: 'linear-gradient(170deg, var(--auth-bg-start) 0%, var(--auth-bg-mid) 45%, var(--auth-bg-end) 100%)' }}>
      {/* ───────── Cabeçalho ───────── */}
      <header className={`sticky top-0 z-40 transition ${scrolled ? 'border-b border-white/10 bg-[var(--auth-bg-end)]/85 backdrop-blur-xl' : 'bg-transparent'}`}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Innovation RH Connect — início">
            <Logo size={38} />
            <span className="text-base font-bold tracking-tight">Innovation <span className="font-medium text-purple-300">RH Connect</span></span>
          </Link>
          <nav aria-label="Seções" className="hidden items-center gap-7 text-sm text-white/75 lg:flex">
            {NAV.map(([label, href]) => <a key={href} href={href} className="transition hover:text-white">{label}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden min-h-10 items-center rounded-lg px-3 text-sm font-medium text-white/90 hover:bg-white/10 sm:inline-flex">Entrar</Link>
            <Link href="/cadastro" className="inline-flex min-h-10 items-center rounded-lg bg-white px-4 text-sm font-semibold text-[var(--color-brand-800)] transition hover:bg-purple-50">Criar empresa</Link>
            <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10 lg:hidden" aria-expanded={menu} aria-controls="mobile-nav" aria-label={menu ? 'Fechar menu' : 'Abrir menu'} onClick={() => setMenu((v) => !v)}>
              {menu ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>
        {menu && (
          <nav id="mobile-nav" aria-label="Menu" className="border-t border-white/10 bg-[var(--auth-bg-end)]/95 px-4 pb-4 backdrop-blur-xl lg:hidden">
            {NAV.map(([label, href]) => <a key={href} href={href} onClick={() => setMenu(false)} className="block border-b border-white/5 py-3 text-white/85">{label}</a>)}
            <Link href="/login" className="block py-3 font-semibold">Entrar</Link>
          </nav>
        )}
      </header>

      <main>
        {/* ───────── Hero ───────── */}
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="lp-grid-bg absolute inset-0" />
          <div aria-hidden="true" className="lp-glow absolute -left-32 top-10 h-96 w-96 rounded-full bg-fuchsia-600/30 blur-[110px]" />
          <div aria-hidden="true" className="lp-glow absolute -right-24 top-40 h-96 w-96 rounded-full bg-amber-400/20 blur-[110px]" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_.95fr] lg:pb-28">
            <div>
              <Reveal><p className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-200/10 px-3.5 py-1.5 text-xs font-semibold text-amber-100"><Sparkles size={14} aria-hidden="true" /> Vagas e gestão da empresa, juntas</p></Reveal>
              <Reveal delay={80}><h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">A hora de <RotatingWord words={WORDS} /> <span className="block">chegou.</span></h1></Reveal>
              <Reveal delay={160}><p className="mt-5 max-w-xl text-lg text-white/80">Abra vagas, encontre gente boa e conduza a contratação. Depois cuide da equipe: escalas, ponto, férias e fechamento. Uma plataforma só, do primeiro currículo ao último dia do mês.</p></Reveal>
              <Reveal delay={240}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/cadastro" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-pink-300 px-7 text-sm font-bold text-[#2e1065] shadow-[0_12px_40px_-8px_rgba(251,191,36,.5)] transition hover:-translate-y-0.5">Criar minha empresa <ArrowRight size={16} className="transition group-hover:translate-x-1" aria-hidden="true" /></Link>
                  <a href="#vagas" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 px-7 text-sm font-semibold hover:bg-white/10">Experimentar o funil de vagas</a>
                </div>
              </Reveal>
            </div>

            <Reveal delay={200} className="relative mx-auto flex h-[340px] w-full max-w-[420px] items-center justify-center sm:h-[420px]">
              <div aria-hidden="true" className="lp-orbit absolute inset-2 rounded-full border border-dashed border-pink-300/30"><i className="absolute -top-1.5 left-1/2 h-3 w-3 rounded-full bg-pink-300 shadow-[0_0_16px_#f9a8d4]" /></div>
              <div aria-hidden="true" className="lp-orbit-rev absolute inset-10 rounded-full border border-amber-300/25"><i className="absolute -bottom-1.5 left-1/3 h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_14px_#fcd34d]" /></div>
              <div className="lp-float relative"><div aria-hidden="true" className="absolute inset-0 rounded-full bg-fuchsia-500/40 blur-3xl" />
                <Image src="/logo-innovation-clean.png" alt="Innovation RH Connect" width={420} height={420} priority className="relative h-44 w-44 rounded-full shadow-[0_0_80px_-10px_rgba(217,70,239,.8)] sm:h-56 sm:w-56" /></div>

              <div className="lp-float-slow absolute left-0 top-4 rounded-xl border border-white/15 bg-[#120a2e]/90 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur sm:-left-4">
                <p className="flex items-center gap-2 font-semibold"><span className="lp-wiggle inline-block">📩</span> Nova candidatura</p><p className="mt-0.5 text-white/60">chegou pelo portal de carreiras</p></div>
              <div className="lp-float absolute right-0 top-1/2 rounded-xl border border-white/15 bg-[#120a2e]/90 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur sm:-right-6" style={{ animationDelay: '1.2s' }}>
                <p className="flex items-center gap-2 font-semibold"><span className="lp-wiggle inline-block">🎉</span> Contratação fechada</p><p className="mt-0.5 text-white/60">documentos recebidos por link</p></div>
              <div className="lp-float-slow absolute -bottom-2 left-6 rounded-xl border border-white/15 bg-[#120a2e]/90 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur" style={{ animationDelay: '2s' }}>
                <p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={14} className="text-emerald-300" aria-hidden="true" /> Troca de folga aprovada</p></div>
            </Reveal>
          </div>
        </section>

        {/* ───────── Faixa em movimento ───────── */}
        <div className="overflow-hidden border-y border-white/10 bg-white/[0.03] py-4" aria-hidden="true">
          <div className="lp-marquee flex gap-10 whitespace-nowrap text-sm font-medium text-white/60">
            {[...MARQUEE, ...MARQUEE].map((item, i) => <span key={i} className="flex items-center gap-10">{item}<i className="h-1.5 w-1.5 rounded-full bg-amber-300" /></span>)}
          </div>
        </div>

        {/* ───────── Vagas ───────── */}
        <section id="vagas" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-200">Vagas</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">Contrate gente boa <span className="lp-text-warm">sem perder ninguém no caminho</span></h2>
            <p className="mt-4 text-lg text-white/75">Cada candidatura tem um lugar, um responsável e um próximo passo. Chega de currículo perdido em e-mail e de candidato esperando resposta.</p>
          </Reveal>

          <Reveal delay={100} className="mt-12"><VagasBoard /></Reveal>

          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {JOB_FEATURES.map(({ icon: Icon, title, text, tone }, i) => (
              <Reveal as="li" key={title} delay={i * 80} className="lp-card rounded-2xl border border-white/15 bg-white/5 p-6">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tone} shadow-lg`}><Icon size={22} aria-hidden="true" /></span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-1.5 text-sm leading-relaxed text-white/70">{text}</p>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* ───────── Jornada ───────── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Reveal className="relative isolate overflow-hidden rounded-3xl px-6 py-12 sm:px-12">
            <div aria-hidden="true" className="lp-gradient-bg absolute inset-0 -z-10" style={{ background: 'linear-gradient(120deg, #86198f, #6d28d9, #be185d, #6d28d9)' }} />
            <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">Da vaga aberta ao mês fechado</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-white/85">Quem você contrata já entra no sistema onde vai trabalhar. Nada de redigitar, nada de planilha no meio.</p>
            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {JOURNEY.map((step, i) => (
                <Reveal as="li" key={step.title} delay={i * 110} className="text-center">
                  <span className="lp-float mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl shadow-lg backdrop-blur" style={{ animationDelay: `${i * 0.4}s` }} aria-hidden="true">{step.emoji}</span>
                  <h3 className="mt-3 font-bold">{i + 1}. {step.title}</h3><p className="mt-1 text-sm text-white/80">{step.text}</p>
                </Reveal>
              ))}
            </ol>
          </Reveal>
        </section>

        {/* ───────── Gestão ───────── */}
        <section id="gestao" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-pink-200">Gestão da empresa</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">Depois de contratar, <span className="lp-text-warm">cuidar bem</span></h2>
            <p className="mt-4 text-lg text-white/75">Tudo o que o RH e o gestor fazem no dia a dia, conectado ao mesmo cadastro.</p>
          </Reveal>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map(({ icon: Icon, title, text }, i) => (
              <Reveal as="li" key={title} delay={i * 70} className="lp-card group rounded-2xl border border-white/15 bg-white/5 p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-amber-400 shadow-lg shadow-fuchsia-900/40 transition group-hover:rotate-6 group-hover:scale-110"><Icon size={22} aria-hidden="true" /></span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-1.5 text-sm leading-relaxed text-white/70">{text}</p>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* ───────── Ponto (demo) ───────── */}
        <section id="ponto" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-amber-200"><HeartHandshake size={16} aria-hidden="true" /> Ponto</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Um toque e está registrado. Teste aí do lado.</h2>
              <p className="mt-4 text-white/75">Cada batida guarda o horário do servidor e a localização do momento. A empresa escolhe a regra: bloquear fora da cerca, aceitar com justificativa ou liberar o trabalho externo. Esqueceu de bater? O pedido de ajuste vai para o gestor aprovar.</p>
              <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {['Cerca virtual por unidade', 'Sem reconhecimento facial', 'Pedido de ajuste com justificativa', 'Comprovante de cada batida'].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-white/85"><CheckCircle2 size={16} className="shrink-0 text-emerald-300" aria-hidden="true" />{item}</li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={120}><PontoDemo /></Reveal>
          </div>
        </section>

        {/* ───────── Planos ───────── */}
        <section id="planos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6"><PricingSection /></section>

        {/* ───────── FAQ ───────── */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16 sm:px-6">
          <Reveal className="text-center"><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Dúvidas frequentes</h2></Reveal>
          <div className="mt-10 space-y-3">
            {FAQ.map((item, index) => (
              <Reveal key={item.q} delay={index * 50} className="overflow-hidden rounded-xl border border-white/15 bg-white/5">
                <h3><button type="button" aria-expanded={open === index} aria-controls={`faq-${index}`} onClick={() => setOpen(open === index ? null : index)} className="flex min-h-12 w-full items-center justify-between gap-3 px-5 py-3.5 text-left font-semibold transition hover:bg-white/5">
                  {item.q}<ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-amber-200 transition-transform duration-300 ${open === index ? 'rotate-180' : ''}`} /></button></h3>
                <div id={`faq-${index}`} className={`grid transition-all duration-300 ${open === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}><p className="overflow-hidden px-5 text-sm leading-relaxed text-white/75"><span className="block pb-4">{item.a}</span></p></div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ───────── CTA final ───────── */}
        <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
          <Reveal className="relative isolate overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12">
            <div aria-hidden="true" className="lp-gradient-bg absolute inset-0 -z-10" style={{ background: 'linear-gradient(120deg, #c026d3, #7c3aed, #db2777, #c026d3)' }} />
            <div aria-hidden="true" className="lp-glow absolute -top-20 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-amber-200/40 blur-[90px]" />
            <h2 className="relative mx-auto max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">Sua próxima contratação começa numa vaga aberta 🚀</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-white/90">Crie a empresa, publique a primeira vaga e conduza todo o caminho num lugar só.</p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/cadastro" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-8 text-sm font-bold text-[var(--color-brand-800)] transition hover:-translate-y-0.5">Criar minha empresa <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/40 px-8 text-sm font-semibold hover:bg-white/10">Já tenho conta</Link>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ───────── Rodapé ───────── */}
      <footer className="border-t border-white/10 bg-black/20">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div><Link href="/" className="flex items-center gap-2.5"><Logo size={40} /><span className="font-bold">Innovation RH Connect</span></Link><p className="mt-3 max-w-xs text-sm text-white/60">Vagas, escalas, ponto, férias e fechamento em uma plataforma só.</p></div>
          <nav aria-label="Produto"><p className="text-sm font-semibold">Produto</p><ul className="mt-3 space-y-2 text-sm text-white/65"><li><a href="#vagas" className="hover:text-white">Vagas</a></li><li><a href="#gestao" className="hover:text-white">Gestão</a></li><li><a href="#planos" className="hover:text-white">Planos</a></li></ul></nav>
          <nav aria-label="Conta"><p className="text-sm font-semibold">Conta</p><ul className="mt-3 space-y-2 text-sm text-white/65"><li><Link href="/login" className="hover:text-white">Entrar</Link></li><li><Link href="/cadastro" className="hover:text-white">Criar empresa</Link></li><li><Link href="/esqueci-senha" className="hover:text-white">Recuperar senha</Link></li></ul></nav>
          <nav aria-label="Legal"><p className="text-sm font-semibold">Ajuda e legal</p><ul className="mt-3 space-y-2 text-sm text-white/65"><li><Link href="/suporte" className="hover:text-white">Suporte</Link></li><li><Link href="/privacidade" className="hover:text-white">Privacidade</Link></li><li><Link href="/termos" className="hover:text-white">Termos de uso</Link></li></ul></nav>
        </div>
        <p className="border-t border-white/10 py-5 text-center text-xs text-white/45">&copy; {new Date().getFullYear()} Innovation RH. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
