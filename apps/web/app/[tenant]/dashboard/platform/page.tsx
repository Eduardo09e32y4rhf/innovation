'use client';

import Link from 'next/link';
import { ArrowRight, Building2, CreditCard, FileSignature, Settings2, ShieldCheck, WalletCards } from 'lucide-react';

const sections = [
  {
    title: 'Financeiro',
    description: 'Cobranças, sincronização Asaas, reembolso, inadimplência e extratos operacionais.',
    href: '/finance',
    icon: WalletCards,
    tone: 'from-[#8A05BE]/15 to-[#8A05BE]/5 text-[#8A05BE]',
    bullets: ['Cobrança manual e automática', 'Reembolso e cancelamento', 'Eventos e falhas Asaas'],
  },
  {
    title: 'Contratos',
    description: 'Gestão comercial com ciclo de vida, vínculo com empresa e documento operacional.',
    href: '/contracts',
    icon: FileSignature,
    tone: 'from-slate-800/15 to-slate-800/5 text-slate-800',
    bullets: ['Criar e editar contrato', 'Resumo de vigência e status', 'Documento e observações'],
  },
  {
    title: 'Configuração',
    description: 'Hub administrativo para empresas, planos, permissões, acessos e auditoria.',
    href: '/configuration',
    icon: Settings2,
    tone: 'from-black/15 to-black/5 text-black',
    bullets: ['Planos e limites', 'Permissões globais', 'Auditoria e acessos DEV'],
  },
];

export default function PlatformDashboardPage({ params: { tenant } }: { params: { tenant: string } }) {
  return (
    <div className="mx-auto w-full space-y-6 pb-10">
      <section className="overflow-hidden rounded-[28px] border border-black/5 bg-[#050505] text-white shadow-[0_28px_80px_-42px_rgba(138,5,190,0.5)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(138,5,190,0.25),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_30%)]" />
        <div className="relative grid gap-8 p-6 sm:p-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
          <div className="space-y-4">
            <p className="inline-block rounded-full bg-[#8A05BE]/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#d48aff] ring-1 ring-[#8A05BE]/50 shadow-[0_0_15px_rgba(138,5,190,0.3)]">Plataforma central</p>
            <h1 className="max-w-3xl text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              Um console unico para empresas, contratos e cobrancas sem duplicar responsabilidade.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
              A raiz da Plataforma agora funciona como hub. Cada bloco leva para um fluxo proprio e evita repetir informacao de
              Financeiro, Contratos e Configuracao em varias telas ao mesmo tempo.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {[
              { label: 'Empresas', value: 'gestão central', icon: Building2 },
              { label: 'Cobranças', value: 'Asaas + manual', icon: CreditCard },
              { label: 'Controle', value: 'permissões e trilha', icon: ShieldCheck },
            ].map((item) => (
              <article key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition hover:bg-white/10 hover:border-[#8A05BE]/50">
                <div className="flex items-center justify-between text-white/50">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em]">{item.label}</span>
                  <item.icon size={15} className="text-[#8A05BE]" />
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
            className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#8A05BE]/30 hover:shadow-[0_15px_35px_-10px_rgba(138,5,190,0.15)]"
          >
            <div className="flex items-start justify-between gap-4">
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${section.tone}`}>
                <section.icon size={20} />
              </span>
              <ArrowRight size={15} className="mt-1 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#8A05BE]" />
            </div>
            <h2 className="mt-6 text-lg font-black text-slate-950">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{section.description}</p>
            <div className="mt-5 space-y-2">
              {section.bullets.map((bullet) => (
                <div key={bullet} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition group-hover:border-[#8A05BE]/10">
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
