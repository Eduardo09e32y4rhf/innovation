'use client';

import Link from 'next/link';
import { ArrowRight, Building2, Settings2, ShieldCheck, Users, CreditCard, FileText, MessageSquareText, ArchiveRestore } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';

type ConfigCard = {
  title: string;
  description: string;
  href: string;
  icon: typeof Building2;
  tone: string;
};

export default function PlatformConfigurationPage({ params: { tenant } }: { params: { tenant: string } }) {
  const { user } = useAuth();
  const isDev = String(user?.role || user?.profile || '').toUpperCase() === 'DEV';

  const coreCards: ConfigCard[] = [
    { title: 'Financeiro', description: 'Gerar cobranças, revisar extratos, reembolsos e eventos Asaas.', href: `/${tenant}/dashboard/platform/finance`, icon: CreditCard, tone: 'bg-violet-50 text-violet-700' },
    { title: 'Contratos', description: 'Criar, editar, excluir e emitir PDF dos contratos da plataforma.', href: `/${tenant}/dashboard/platform/contracts`, icon: FileText, tone: 'bg-sky-50 text-sky-700' },
    { title: 'Permissoes globais', description: 'Controlar o que cada perfil pode fazer e salvar por rascunho.', href: `/${tenant}/dashboard/platform/permissions`, icon: ShieldCheck, tone: 'bg-emerald-50 text-emerald-700' },
  ];

  const cards: ConfigCard[] = [
    { title: 'Empresas', description: 'Editar dados, status e acesso das empresas clientes.', href: `/${tenant}/dashboard/platform/companies`, icon: Building2, tone: 'bg-violet-50 text-violet-700' },
    { title: 'Planos e precos', description: 'Ajustar limites, valores e configuracoes dos planos.', href: `/${tenant}/dashboard/platform/plans`, icon: CreditCard, tone: 'bg-sky-50 text-sky-700' },
    { title: 'Acessos DEV', description: 'Listar acessos online e facilitar o suporte tecnico.', href: `/${tenant}/dashboard/platform/access`, icon: Users, tone: 'bg-amber-50 text-amber-700' },
    { title: 'Cupons', description: 'Criar, editar e revisar campanhas promocionais.', href: `/${tenant}/dashboard/platform/coupons`, icon: FileText, tone: 'bg-rose-50 text-rose-700' },
    { title: 'Assinaturas', description: 'Validar o vinculo das empresas com o Asaas.', href: `/${tenant}/dashboard/platform/subscriptions`, icon: ArchiveRestore, tone: 'bg-teal-50 text-teal-700' },
    { title: 'WhatsApp', description: 'Acompanhar a comunicacao operacional da plataforma.', href: `/${tenant}/dashboard/platform/whatsapp`, icon: MessageSquareText, tone: 'bg-indigo-50 text-indigo-700' },
    { title: 'Auditoria', description: 'Auditar eventos e rastrear alteracoes importantes.', href: `/${tenant}/dashboard/platform/audit`, icon: Settings2, tone: 'bg-slate-50 text-slate-700' },
  ];

  return (
    <div className="mx-auto w-full space-y-5 pb-10">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">Configuracao</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Central de configuracoes da plataforma</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">Tudo o que hoje esta espalhado fica reunido aqui: empresas, planos, acessos, permissoes e rotinas administrativas.</p>
          </div>
          <Link href={`/${tenant}/dashboard/platform/finance`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-black text-white hover:bg-slate-800">
            Abrir financeiro <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {coreCards.map((card) => (
          <Link key={card.href} href={card.href} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <span className={`rounded-2xl p-3 ${card.tone}`}>
                <card.icon size={20} />
              </span>
              <ArrowRight size={15} className="mt-1 text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-600" />
            </div>
            <h3 className="mt-5 text-base font-black text-slate-950">{card.title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">{card.description}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Empresas ativas', value: 'gestao central' },
          { label: 'Planos e limites', value: 'precos e seats' },
          { label: 'Permissoes', value: 'controle de acesso' },
          { label: isDev ? 'Modo DEV' : 'Modo comercial', value: isDev ? 'acesso total' : 'escopo limitado' },
        ].map((card) => (
          <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{card.label}</p>
            <p className="mt-2 text-lg font-black text-slate-950">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <span className={`rounded-2xl p-3 ${card.tone}`}>
                <card.icon size={20} />
              </span>
              <ArrowRight size={15} className="mt-1 text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-600" />
            </div>
            <h3 className="mt-5 text-base font-black text-slate-950">{card.title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">{card.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
