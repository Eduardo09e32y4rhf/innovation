'use client';

import Link from 'next/link';
import { ArrowRight, Building2, CreditCard, FileSignature, Settings2, ShieldCheck, WalletCards } from 'lucide-react';

const sections = [
  {
    title: 'Financeiro',
    description: 'Cobranças, sincronização Asaas, reembolso, inadimplência e extratos operacionais.',
    href: '/finance',
    icon: WalletCards,
    tone: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600',
    bullets: ['Cobrança manual e automática', 'Reembolso e cancelamento', 'Eventos e falhas Asaas'],
  },
  {
    title: 'Contratos',
    description: 'Gestão comercial com ciclo de vida, vínculo com empresa e documento operacional.',
    href: '/contracts',
    icon: FileSignature,
    tone: 'from-cyan-500/15 to-cyan-500/5 text-cyan-600',
    bullets: ['Criar e editar contrato', 'Resumo de vigência e status', 'Documento e observações'],
  },
  {
    title: 'Configuração',
    description: 'Hub administrativo para empresas, planos, permissões, acessos e auditoria.',
    href: '/configuration',
    icon: Settings2,
    tone: 'from-violet-500/15 to-violet-500/5 text-violet-600',
    bullets: ['Planos e limites', 'Permissões globais', 'Auditoria e acessos DEV'],
  },
];

export default function PlatformDashboardPage({ params: { tenant } }: { params: { tenant: string } }) {
  return (
    <div className="mx-auto w-full space-y-6 pb-10">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 text-white shadow-[0_28px_80px_-42px_rgba(15,23,42,.55)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.18),transparent_30%)]" />
        <div className="relative grid gap-8 p-6 sm:p-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-300">Plataforma central</p>
            <h1 className="max-w-3xl text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              Um console unico para empresas, contratos e cobrancas sem duplicar responsabilidade.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              A raiz da Plataforma agora funciona como hub. Cada bloco leva para um fluxo proprio e evita repetir informacao de
              Financeiro, Contratos e Configuracao em varias telas ao mesmo tempo.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {[
              { label: 'Empresas', value: 'gestao central', icon: Building2 },
              { label: 'Cobrancas', value: 'Asaas + manual', icon: CreditCard },
              { label: 'Controle', value: 'permissoes e trilha', icon: ShieldCheck },
            ].map((item) => (
              <article key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em]">{item.label}</span>
                  <item.icon size={15} />
                </div>
                <p className="mt-3 text-lg font-black text-white">{item.value}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.title}
            href={`/${tenant}/dashboard/platform${section.href}`}
            className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${section.tone}`}>
                <section.icon size={20} />
              </span>
              <ArrowRight size={15} className="mt-1 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-900" />
            </div>
            <h2 className="mt-6 text-lg font-black text-slate-950">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{section.description}</p>
            <div className="mt-5 space-y-2">
              {section.bullets.map((bullet) => (
                <div key={bullet} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                  {bullet}
                </div>
              ))}
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
