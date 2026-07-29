'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CreditCard,
  Globe2,
  MessageSquareText,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react';

type ConfigCard = {
  title: string;
  description: string;
  href: string;
  icon: typeof Building2;
  tone: string;
};

const configurationCards: ConfigCard[] = [
  {
    title: 'Empresas',
    description: 'Edite dados, status, documentos e vinculos operacionais.',
    href: '/companies',
    icon: Building2,
    tone: 'from-violet-500/15 to-violet-500/5 text-violet-500',
  },
  {
    title: 'Planos e limites',
    description: 'Ajuste valores, seats, bonus, reajustes e regras comerciais.',
    href: '/plans',
    icon: CreditCard,
    tone: 'from-cyan-500/15 to-cyan-500/5 text-cyan-500',
  },
  {
    title: 'Permissoes globais',
    description: 'Controle o que cada perfil pode ver, editar e bloquear.',
    href: '/permissions',
    icon: ShieldCheck,
    tone: 'from-emerald-500/15 to-emerald-500/5 text-emerald-500',
  },
  {
    title: 'Acessos DEV',
    description: 'Acompanhe acessos de suporte e visibilidade operacional.',
    href: '/access',
    icon: Users,
    tone: 'from-amber-500/15 to-amber-500/5 text-amber-500',
  },
  {
    title: 'Cupons',
    description: 'Ative campanhas promocionais e politicas de bonus comercial.',
    href: '/coupons',
    icon: BadgeCheck,
    tone: 'from-rose-500/15 to-rose-500/5 text-rose-500',
  },
  {
    title: 'Assinaturas',
    description: 'Veja o vinculo das empresas com o Asaas e a renovacao.',
    href: '/subscriptions',
    icon: ReceiptText,
    tone: 'from-teal-500/15 to-teal-500/5 text-teal-500',
  },
  {
    title: 'WhatsApp',
    description: 'Centralize comunicados transacionais e notificacoes operacionais.',
    href: '/whatsapp',
    icon: MessageSquareText,
    tone: 'from-indigo-500/15 to-indigo-500/5 text-indigo-500',
  },
  {
    title: 'Auditoria',
    description: 'Rastreie alteracoes importantes, autor e impacto por modulo.',
    href: '/audit',
    icon: Settings2,
    tone: 'from-slate-500/15 to-slate-500/5 text-slate-600',
  },
];

export default function PlatformConfigurationPage({ params: { tenant } }: { params: { tenant: string } }) {
  const cards = configurationCards.map((card) => ({
    ...card,
    href: `/${tenant}/dashboard/platform${card.href}`,
  }));

  return (
    <div className="mx-auto w-full space-y-6 pb-10">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 text-white shadow-[0_28px_80px_-42px_rgba(15,23,42,.55)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.10),transparent_28%)]" />
        <div className="relative grid gap-8 p-6 sm:p-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-300">Configuracao central</p>
            <h2 className="max-w-2xl text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              Um ponto unico para organizar empresa, perfis, limites e auditoria.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Esta aba concentra o que configura a plataforma. Financeiro e Contratos seguem nas
              suas telas proprias para evitar redundancia e manter cada fluxo mais claro.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href={`/${tenant}/dashboard/platform/finance`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-xs font-black text-white transition hover:bg-white/10"
              >
                Ir para Financeiro
                <ArrowRight size={14} />
              </Link>
              <Link
                href={`/${tenant}/dashboard/platform/contracts`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-xs font-black text-white transition hover:bg-white/10"
              >
                Ir para Contratos
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {[
              { label: 'Escopo', value: 'Empresa' },
              { label: 'Protecao', value: 'Perfis' },
              { label: 'Registro', value: 'Auditoria' },
            ].map((item) => (
              <article key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-lg font-black text-white">{item.value}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.tone}`}>
                  <card.icon size={20} />
                </span>
                <ArrowRight size={15} className="mt-1 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-900" />
              </div>
              <h3 className="mt-6 text-base font-black text-slate-950">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{card.description}</p>
            </Link>
          ))}
        </div>

        <aside className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Guia rapido</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">O que pertence a esta aba</h3>
          <div className="mt-5 space-y-3">
            {[
              'Edicao de empresas e seus vinculos operacionais',
              'Ajuste de planos, limites e regras de acesso',
              'Permissoes globais com foco em seguranca',
              'Auditoria e rotinas administrativas centrais',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Globe2 size={13} />
                </span>
                <p className="text-sm leading-6 text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
