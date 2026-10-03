'use client';

import {
  ArrowRight, Briefcase, CalendarRange, ChevronDown, ClipboardCheck, FileSpreadsheet, KeyRound, MapPin, ShieldCheck, Sun, UserRoundCog, Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { PricingSection } from './_components/pricing-section';

const MODULES = [
  { icon: Users, title: 'Funcionários', text: 'Cadastro completo, documentos, vínculos e importação por planilha.' },
  { icon: CalendarRange, title: 'Escalas e ponto', text: 'Uma tela só: escala, batida por localização, solicitações e aprovações.' },
  { icon: Sun, title: 'Férias', text: 'Períodos aquisitivos, saldo e programação sem planilha.' },
  { icon: Briefcase, title: 'Vagas', text: 'Funil configurável, perguntas e filtros definidos pelo próprio RH.' },
  { icon: FileSpreadsheet, title: 'Folha e fechamento', text: 'Horas, adicionais e encargos calculados com as regras da empresa, com PDF.' },
  { icon: UserRoundCog, title: 'Acessos', text: 'Perfis, permissões e trilha de auditoria por empresa.' },
];

const STEPS = [
  { n: '1', title: 'Crie a empresa', text: 'Cadastro em dois passos, com plano e usuários à sua medida.' },
  { n: '2', title: 'Cadastre a equipe', text: 'Importe uma planilha ou adicione pessoas e defina os perfis.' },
  { n: '3', title: 'Opere em um só lugar', text: 'Ponto, escalas, férias e fechamento sem trocar de sistema.' },
];

const FAQ = [
  { q: 'O sistema tem validade jurídica?', a: 'A plataforma oferece controles técnicos como rastreabilidade, auditoria e registro com hora do servidor e localização. A conformidade final depende da configuração e dos processos da sua empresa, com revisão jurídica aplicável ao seu caso.' },
  { q: 'Os funcionários precisam instalar aplicativo?', a: 'Não. É um aplicativo web: funciona no navegador do celular ou do computador.' },
  { q: 'Como funciona o ponto?', a: 'O funcionário registra a batida na própria tela de Escalas. O servidor grava o horário e a localização do momento — sem reconhecimento facial. A empresa define as regras, como cerca virtual e tolerâncias.' },
  { q: 'E se alguém esquecer de bater o ponto?', a: 'O funcionário solicita o ajuste na mesma tela, com justificativa. O gestor aprova ou reprova e tudo fica registrado.' },
  { q: 'Consigo migrar meus dados atuais?', a: 'Sim. O cadastro de funcionários aceita importação por planilha com validação prévia, mostrando os erros linha a linha antes de confirmar.' },
];

export default function Home() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(160deg, var(--auth-bg-start) 0%, var(--auth-bg-mid) 50%, var(--auth-bg-end) 100%)' }}>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[var(--auth-bg-end)]/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="Innovation RH Connect — início"><Image src="/logo-innovation-clean.png" alt="Innovation RH Connect" width={150} height={150} priority className="h-auto w-[120px] object-contain" /></Link>
          <nav aria-label="Seções" className="hidden gap-7 text-sm text-white/75 md:flex">
            <a href="#modulos" className="hover:text-white">Módulos</a><a href="#ponto" className="hover:text-white">Ponto</a>
            <a href="#planos" className="hover:text-white">Planos</a><a href="#faq" className="hover:text-white">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium text-white/90 hover:bg-white/10">Entrar</Link>
            <Link href="/cadastro" className="inline-flex min-h-10 items-center rounded-lg bg-white px-4 text-sm font-semibold text-[var(--color-brand-800)] hover:bg-purple-50">Criar empresa</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 text-center sm:px-6 sm:pt-20">
          <p className="mx-auto w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/85">RH e departamento pessoal em uma plataforma</p>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">Ponto, escalas e folha <span className="text-[var(--color-brand-300)]">sem planilhas</span>.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/75">A Innovation RH Connect reúne funcionários, escalas, ponto por localização, férias, vagas e fechamento em telas simples, com visão própria para cada perfil.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/cadastro" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-[var(--color-brand-800)] shadow-lg hover:bg-purple-50">Criar minha empresa <ArrowRight size={16} aria-hidden="true" /></Link>
            <a href="#modulos" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/30 px-6 text-sm font-semibold text-white hover:bg-white/10">Conhecer os módulos</a>
          </div>
        </section>

        <section id="modulos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Tudo do RH, no mesmo lugar</h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur transition hover:bg-white/10">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-brand)]/80"><Icon size={22} aria-hidden="true" /></span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3><p className="mt-1 text-sm text-white/70">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="ponto" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
          <div className="grid items-center gap-10 rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur sm:p-10 lg:grid-cols-2">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-300)]"><MapPin size={16} aria-hidden="true" /> Ponto por localização</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">Cada batida com horário do servidor e local</h2>
              <p className="mt-3 text-white/75">Sem reconhecimento facial e sem aplicativo: o funcionário bate o ponto na tela de Escalas e a empresa define as regras.</p>
            </div>
            <ul className="space-y-3 text-sm">
              {[
                [MapPin, 'Cerca virtual por unidade, com política configurável'],
                [ClipboardCheck, 'Pedidos de troca, ajuste e justificativa com aprovação do gestor'],
                [ShieldCheck, 'Registro com autor, motivo e data — tudo auditável'],
                [KeyRound, 'Cada perfil enxerga e faz só o que lhe cabe'],
              ].map(([Icon, text]) => {
                const I = Icon as typeof MapPin;
                return <li key={text as string} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3"><I size={18} className="shrink-0 text-[var(--color-brand-300)]" aria-hidden="true" />{text as string}</li>;
              })}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Comece em três passos</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="rounded-2xl border border-white/15 bg-white/5 p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-[var(--color-brand-800)]">{step.n}</span>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3><p className="mt-1 text-sm text-white/70">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="planos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6"><PricingSection /></section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-14 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Dúvidas frequentes</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((item, index) => (
              <div key={item.q} className="overflow-hidden rounded-xl border border-white/15 bg-white/5">
                <h3>
                  <button type="button" aria-expanded={open === index} aria-controls={`faq-${index}`} onClick={() => setOpen(open === index ? null : index)} className="flex min-h-12 w-full items-center justify-between gap-3 px-5 py-3 text-left font-semibold">
                    {item.q}<ChevronDown size={18} aria-hidden="true" className={`shrink-0 transition-transform ${open === index ? 'rotate-180' : ''}`} />
                  </button>
                </h3>
                {open === index && <p id={`faq-${index}`} className="px-5 pb-4 text-sm leading-relaxed text-white/75">{item.a}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">
          <div className="rounded-3xl bg-white px-6 py-12 text-center text-zinc-900 sm:px-12">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight">Pare de apagar incêndios. Comece a gerir pessoas.</h2>
            <p className="mx-auto mt-3 max-w-xl text-zinc-600">Crie sua empresa em poucos minutos e traga sua equipe para a plataforma.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/cadastro" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--color-brand)] px-7 text-sm font-semibold text-white hover:bg-[var(--color-brand-700)]">Criar minha empresa</Link>
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-zinc-300 px-7 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">Já tenho conta</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-white/60 sm:flex-row sm:px-6">
          <p>&copy; {new Date().getFullYear()} Innovation RH. Todos os direitos reservados.</p>
          <nav aria-label="Legal" className="flex gap-5"><Link href="/privacidade" className="hover:text-white">Privacidade</Link><Link href="/termos" className="hover:text-white">Termos</Link><Link href="/suporte" className="hover:text-white">Suporte</Link></nav>
        </div>
      </footer>
    </div>
  );
}
