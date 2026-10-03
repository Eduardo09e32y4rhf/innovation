'use client';

import {
  ArrowRight, BadgeCheck, Briefcase, CalendarRange, CheckCircle2, ChevronDown, ClipboardCheck, Clock3, FileSpreadsheet, Fingerprint, KeyRound,
  LockKeyhole, MapPin, Menu, ScrollText, ShieldCheck, Smartphone, Sun, UserRoundCog, Users, X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PricingSection } from './_components/pricing-section';
import { CountUp, Reveal } from './_components/landing/motion';
import { Showcase } from './_components/landing/showcase';
import './landing.css';

const NAV = [['Módulos', '#modulos'], ['Como funciona', '#produto'], ['Perfis', '#perfis'], ['Planos', '#planos'], ['Dúvidas', '#faq']] as const;

const MODULES = [
  { icon: Users, title: 'Funcionários', text: 'Cadastro completo, documentos, vínculos e importação por planilha validada.' },
  { icon: CalendarRange, title: 'Escalas e ponto', text: 'Escala, batida por localização, trocas e aprovações em uma única tela.' },
  { icon: Sun, title: 'Férias', text: 'Períodos aquisitivos, saldo e programação sem planilha.' },
  { icon: Briefcase, title: 'Vagas', text: 'Funil, perguntas e filtros definidos pelo próprio RH, com portal de carreiras.' },
  { icon: FileSpreadsheet, title: 'Folha e contabilidade', text: 'Cálculos pelas regras cadastradas e fechamento com PDF.' },
  { icon: UserRoundCog, title: 'Acessos e auditoria', text: 'Perfis, permissões e trilha de quem fez o quê.' },
];

const MARQUEE = ['Ponto por localização', 'Escalas 5x2 · 6x1 · 12x36', 'Banco de horas', 'Férias', 'Vagas e carreiras', 'Folha e fechamento', 'Relatórios em PDF', 'Perfis e permissões', 'Auditoria', 'Importação por planilha'];

const ROLES = [
  { icon: Fingerprint, who: 'Funcionário', text: 'Bate o ponto, vê a escala e pede troca ou ajuste pelo celular.' },
  { icon: ClipboardCheck, who: 'Gestor', text: 'Aprova pedidos da equipe e ajusta a escala respeitando a cobertura.' },
  { icon: Users, who: 'RH e Administrador', text: 'Cadastra, define regras, fecha o período e emite os relatórios.' },
  { icon: ScrollText, who: 'Contabilidade', text: 'Consulta fechamentos aprovados e as regras de cálculo.' },
  { icon: BadgeCheck, who: 'CEO', text: 'Acompanha indicadores da empresa em modo consulta.' },
];

const STEPS = [
  { n: '1', title: 'Crie a empresa', text: 'Cadastro em dois passos, com plano e quantidade de usuários.' },
  { n: '2', title: 'Traga a equipe', text: 'Importe uma planilha ou adicione pessoas e escolha os perfis.' },
  { n: '3', title: 'Defina as regras', text: 'Escalas, tolerâncias, feriados e cercas do jeito da sua empresa.' },
  { n: '4', title: 'Opere e feche', text: 'Ponto, pedidos, aprovações e fechamento — tudo no mesmo lugar.' },
];

const FAQ = [
  { q: 'O sistema tem validade jurídica?', a: 'A plataforma oferece controles técnicos como rastreabilidade, auditoria e registro com horário do servidor e localização. A conformidade final depende da configuração e dos processos da sua empresa, com revisão jurídica aplicável ao seu caso.' },
  { q: 'Os funcionários precisam instalar aplicativo?', a: 'Não. É um aplicativo web: funciona no navegador do celular ou do computador.' },
  { q: 'Como funciona o ponto?', a: 'O funcionário registra a batida na tela de Escalas. O servidor grava o horário e a localização do momento — sem reconhecimento facial. A empresa define as regras, como cerca virtual e tolerâncias.' },
  { q: 'E se alguém esquecer de bater o ponto?', a: 'O funcionário solicita o ajuste na mesma tela, com justificativa. O gestor aprova ou reprova e tudo fica registrado.' },
  { q: 'Consigo migrar meus dados atuais?', a: 'Sim. O cadastro aceita importação por planilha com validação prévia, mostrando os erros linha a linha antes de confirmar.' },
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
          <div aria-hidden="true" className="lp-glow absolute -left-32 top-10 h-96 w-96 rounded-full bg-purple-600/30 blur-[110px]" />
          <div aria-hidden="true" className="lp-glow absolute -right-24 top-40 h-96 w-96 rounded-full bg-sky-500/20 blur-[110px]" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_.9fr] lg:pb-28">
            <div>
              <Reveal><p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/90"><span className="relative flex h-2 w-2"><span className="lp-ring absolute inset-0 rounded-full bg-emerald-400" /><span className="relative h-2 w-2 rounded-full bg-emerald-400" /></span>RH e departamento pessoal em uma plataforma</p></Reveal>
              <Reveal delay={80}><h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Ponto, escalas e folha <span className="lp-text-gradient">sem planilhas</span>.</h1></Reveal>
              <Reveal delay={160}><p className="mt-5 max-w-xl text-lg text-white/75">Funcionários, escalas, ponto por localização, férias, vagas e fechamento em telas simples — cada perfil vê só o que precisa. Menos retrabalho para o RH, mais clareza para o gestor.</p></Reveal>
              <Reveal delay={240}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/cadastro" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-7 text-sm font-semibold text-[var(--color-brand-800)] shadow-[0_12px_40px_-8px_rgba(255,255,255,.35)] transition hover:-translate-y-0.5">Criar minha empresa <ArrowRight size={16} className="transition group-hover:translate-x-1" aria-hidden="true" /></Link>
                  <a href="#produto" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 px-7 text-sm font-semibold hover:bg-white/10">Ver como funciona</a>
                </div>
              </Reveal>
              <Reveal delay={320}>
                <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
                  {[[MapPin, 'Ponto por localização'], [Smartphone, 'Funciona no celular, sem app'], [LockKeyhole, 'Acesso por perfil']].map(([Icon, label]) => {
                    const I = Icon as typeof MapPin;
                    return <li key={label as string} className="flex items-center gap-2"><I size={16} className="text-purple-300" aria-hidden="true" />{label as string}</li>;
                  })}
                </ul>
              </Reveal>
            </div>

            {/* Orbe animado com a marca */}
            <Reveal delay={200} className="relative mx-auto flex h-[340px] w-full max-w-[420px] items-center justify-center sm:h-[420px]">
              <div aria-hidden="true" className="lp-orbit absolute inset-2 rounded-full border border-dashed border-purple-300/30"><i className="absolute -top-1.5 left-1/2 h-3 w-3 rounded-full bg-purple-300 shadow-[0_0_16px_#c084fc]" /></div>
              <div aria-hidden="true" className="lp-orbit-rev absolute inset-10 rounded-full border border-sky-300/25"><i className="absolute -bottom-1.5 left-1/3 h-2.5 w-2.5 rounded-full bg-sky-300 shadow-[0_0_14px_#7dd3fc]" /></div>
              <div className="lp-float relative"><div aria-hidden="true" className="absolute inset-0 rounded-full bg-purple-500/40 blur-3xl" />
                <Image src="/logo-innovation-clean.png" alt="Innovation RH Connect" width={420} height={420} priority className="relative h-44 w-44 rounded-full shadow-[0_0_80px_-10px_rgba(168,85,247,.8)] sm:h-56 sm:w-56" /></div>

              <div className="lp-float-slow absolute left-0 top-6 rounded-xl border border-white/15 bg-[#120a2e]/90 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur sm:-left-4">
                <p className="flex items-center gap-2 font-semibold"><Clock3 size={14} className="text-emerald-300" aria-hidden="true" /> Entrada registrada</p><p className="mt-0.5 text-white/60">08:00 · dentro da cerca</p></div>
              <div className="lp-float absolute bottom-10 right-0 rounded-xl border border-white/15 bg-[#120a2e]/90 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur sm:-right-4" style={{ animationDelay: '1.2s' }}>
                <p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={14} className="text-purple-300" aria-hidden="true" /> Troca de folga aprovada</p><p className="mt-0.5 text-white/60">pelo gestor</p></div>
              <div className="lp-float-slow absolute -bottom-2 left-8 rounded-xl border border-white/15 bg-[#120a2e]/90 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur" style={{ animationDelay: '2s' }}>
                <p className="flex items-center gap-2 font-semibold"><FileSpreadsheet size={14} className="text-sky-300" aria-hidden="true" /> Fechamento em PDF</p></div>
            </Reveal>
          </div>
        </section>

        {/* ───────── Faixa em movimento ───────── */}
        <div className="overflow-hidden border-y border-white/10 bg-white/[0.03] py-4" aria-hidden="true">
          <div className="lp-marquee flex gap-10 whitespace-nowrap text-sm font-medium text-white/60">
            {[...MARQUEE, ...MARQUEE].map((item, i) => <span key={i} className="flex items-center gap-10">{item}<i className="h-1.5 w-1.5 rounded-full bg-purple-400" /></span>)}
          </div>
        </div>

        {/* ───────── Números ───────── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { v: 9, s: '', l: 'perfis de acesso', d: 'cada um com sua visão' },
              { v: 1, s: ' tela', l: 'para escala e ponto', d: 'pedidos e aprovações juntos' },
              { v: 0, s: ' apps', l: 'para instalar', d: 'roda no navegador' },
              { v: 100, s: '%', l: 'por empresa', d: 'dados isolados por cliente' },
            ].map((item, i) => (
              <Reveal key={item.l} delay={i * 90} className="lp-card rounded-2xl border border-white/15 bg-white/5 p-5 text-center">
                <dt className="text-4xl font-extrabold text-white sm:text-5xl"><span className="lp-text-gradient"><CountUp to={item.v} suffix={item.s} /></span></dt>
                <dd className="mt-2 text-sm font-semibold">{item.l}</dd><dd className="text-xs text-white/55">{item.d}</dd>
              </Reveal>
            ))}
          </dl>
        </section>

        {/* ───────── Módulos ───────── */}
        <section id="modulos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center"><p className="text-sm font-semibold uppercase tracking-widest text-purple-300">Módulos</p><h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Tudo do RH, no mesmo lugar</h2><p className="mt-3 text-white/70">Menos abas, menos botões. Cada módulo foi desenhado para resolver a rotina em uma tela.</p></Reveal>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map(({ icon: Icon, title, text }, i) => (
              <Reveal as="li" key={title} delay={i * 70} className="lp-card group rounded-2xl border border-white/15 bg-white/5 p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-800)] shadow-lg shadow-purple-900/40 transition group-hover:scale-110"><Icon size={22} aria-hidden="true" /></span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-1.5 text-sm leading-relaxed text-white/70">{text}</p>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* ───────── Produto (abas) ───────── */}
        <section id="produto" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center"><p className="text-sm font-semibold uppercase tracking-widest text-purple-300">Na prática</p><h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Veja a rotina funcionando</h2></Reveal>
          <Reveal><Showcase /></Reveal>
        </section>

        {/* ───────── Ponto por localização ───────── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Reveal className="relative isolate overflow-hidden rounded-3xl p-8 sm:p-12">
            <div aria-hidden="true" className="absolute inset-0 -z-10 lp-gradient-bg" style={{ background: 'linear-gradient(120deg, #3b0764, #6d28d9, #1e3a8a, #6d28d9)' }} />
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-purple-200"><MapPin size={16} aria-hidden="true" /> Ponto por localização</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Sem reconhecimento facial. Sem aplicativo. Com prova do local.</h2>
                <p className="mt-4 text-white/80">Cada batida fica registrada com o horário do servidor e a localização do momento. A empresa decide a regra: bloquear fora da cerca, permitir com justificativa ou liberar para trabalho externo.</p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {['Cerca virtual por unidade', 'Horário do servidor', 'Pedido de ajuste com justificativa', 'Aprovação do gestor', 'Comprovante de cada batida', 'Consentimento de localização'].map((item, i) => (
                  <Reveal as="li" key={item} delay={i * 60} className="flex items-center gap-2.5 rounded-xl bg-white/10 px-4 py-3 text-sm backdrop-blur"><CheckCircle2 size={16} className="shrink-0 text-emerald-300" aria-hidden="true" />{item}</Reveal>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* ───────── Por perfil ───────── */}
        <section id="perfis" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center"><p className="text-sm font-semibold uppercase tracking-widest text-purple-300">Para cada pessoa</p><h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Cada perfil vê o que importa</h2></Reveal>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {ROLES.map(({ icon: Icon, who, text }, i) => (
              <Reveal as="li" key={who} delay={i * 80} className="lp-card rounded-2xl border border-white/15 bg-white/5 p-5 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-purple-200"><Icon size={22} aria-hidden="true" /></span>
                <h3 className="mt-4 font-semibold">{who}</h3><p className="mt-1.5 text-sm text-white/65">{text}</p>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* ───────── Passos ───────── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center"><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Do cadastro ao fechamento</h2></Reveal>
          <ol className="relative mt-12 grid gap-5 md:grid-cols-4">
            <div aria-hidden="true" className="absolute left-[12%] right-[12%] top-6 hidden h-px bg-gradient-to-r from-transparent via-purple-300/50 to-transparent md:block" />
            {STEPS.map((step, i) => (
              <Reveal as="li" key={step.n} delay={i * 110} className="relative text-center">
                <span className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-extrabold text-[var(--color-brand-800)] shadow-lg">{step.n}</span>
                <h3 className="mt-4 font-semibold">{step.title}</h3><p className="mt-1.5 text-sm text-white/65">{step.text}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* ───────── Segurança ───────── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Reveal className="grid items-center gap-8 rounded-3xl border border-white/15 bg-white/5 p-8 backdrop-blur sm:p-12 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300"><ShieldCheck size={28} aria-hidden="true" /></span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight">Segurança e privacidade no centro</h2>
              <p className="mt-3 text-white/70">Dados de pessoas exigem cuidado. A plataforma foi construída com isolamento por empresa e controle por perfil.</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[[KeyRound, 'Senhas fortes e política de troca'], [UserRoundCog, 'Permissões por perfil'], [ScrollText, 'Auditoria das ações'], [LockKeyhole, 'Dados separados por empresa'], [FileSpreadsheet, 'Termos e consentimento (LGPD)'], [ShieldCheck, 'Bloqueio após tentativas inválidas']].map(([Icon, label]) => {
                const I = Icon as typeof KeyRound;
                return <li key={label as string} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 text-sm"><I size={18} className="shrink-0 text-purple-300" aria-hidden="true" />{label as string}</li>;
              })}
            </ul>
          </Reveal>
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
                  {item.q}<ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-purple-300 transition-transform duration-300 ${open === index ? 'rotate-180' : ''}`} /></button></h3>
                <div id={`faq-${index}`} className={`grid transition-all duration-300 ${open === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}><p className="overflow-hidden px-5 text-sm leading-relaxed text-white/75"><span className="block pb-4">{item.a}</span></p></div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ───────── CTA final ───────── */}
        <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
          <Reveal className="relative isolate overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12">
            <div aria-hidden="true" className="lp-gradient-bg absolute inset-0 -z-10" style={{ background: 'linear-gradient(120deg, #8b00c5, #6d28d9, #4338ca, #8b00c5)' }} />
            <div aria-hidden="true" className="lp-glow absolute -top-20 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-white/30 blur-[90px]" />
            <h2 className="relative mx-auto max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">Pare de apagar incêndios. Comece a gerir pessoas.</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-white/85">Crie sua empresa em poucos minutos e traga a equipe para uma plataforma única.</p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/cadastro" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-8 text-sm font-semibold text-[var(--color-brand-800)] transition hover:-translate-y-0.5">Criar minha empresa <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/40 px-8 text-sm font-semibold hover:bg-white/10">Já tenho conta</Link>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ───────── Rodapé ───────── */}
      <footer className="border-t border-white/10 bg-black/20">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div><Link href="/" className="flex items-center gap-2.5"><Logo size={40} /><span className="font-bold">Innovation RH Connect</span></Link><p className="mt-3 max-w-xs text-sm text-white/60">Ponto, escalas, férias, vagas e fechamento em uma plataforma única.</p></div>
          <nav aria-label="Produto"><p className="text-sm font-semibold">Produto</p><ul className="mt-3 space-y-2 text-sm text-white/65"><li><a href="#modulos" className="hover:text-white">Módulos</a></li><li><a href="#produto" className="hover:text-white">Na prática</a></li><li><a href="#planos" className="hover:text-white">Planos</a></li></ul></nav>
          <nav aria-label="Conta"><p className="text-sm font-semibold">Conta</p><ul className="mt-3 space-y-2 text-sm text-white/65"><li><Link href="/login" className="hover:text-white">Entrar</Link></li><li><Link href="/cadastro" className="hover:text-white">Criar empresa</Link></li><li><Link href="/esqueci-senha" className="hover:text-white">Recuperar senha</Link></li></ul></nav>
          <nav aria-label="Legal"><p className="text-sm font-semibold">Ajuda e legal</p><ul className="mt-3 space-y-2 text-sm text-white/65"><li><Link href="/suporte" className="hover:text-white">Suporte</Link></li><li><Link href="/privacidade" className="hover:text-white">Privacidade</Link></li><li><Link href="/termos" className="hover:text-white">Termos de uso</Link></li></ul></nav>
        </div>
        <p className="border-t border-white/10 py-5 text-center text-xs text-white/45">&copy; {new Date().getFullYear()} Innovation RH. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
