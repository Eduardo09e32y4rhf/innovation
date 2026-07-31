'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  History,
  KeyRound,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { api, request, type PlatformCompany, type PublicPlatformPlan } from '@/app/lib/api';

type GlobalPermission = {
  role: string;
  permissions: string[];
};

type PlanWithStatus = PublicPlatformPlan & {
  isActive?: boolean;
};

type ConfigurationSnapshot = {
  companies: PlatformCompany[];
  plans: PlanWithStatus[];
  permissions: GlobalPermission[];
  loadedAt: Date;
};

type HubItem = {
  title: string;
  description: string;
  href: string;
  action: string;
  icon: typeof Building2;
  accent: string;
  meta: string;
};

function formatTime(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function ConfigurationSkeleton() {
  return (
    <div className="space-y-5" aria-label="Carregando configuracoes">
      <div className="h-40 animate-pulse rounded-[28px] bg-slate-200" />
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-44 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}

export default function PlatformConfigurationPage({
  params: { tenant },
}: {
  params: { tenant: string };
}) {
  const [snapshot, setSnapshot] = useState<ConfigurationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function loadConfiguration(background = false) {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [companies, plans, permissions] = await Promise.all([
        api.platform.listCompanies(),
        api.platform.listPlans() as Promise<PlanWithStatus[]>,
        request<GlobalPermission[]>('/platform/global-permissions'),
      ]);

      setSnapshot({
        companies: companies ?? [],
        plans: plans ?? [],
        permissions: permissions ?? [],
        loadedAt: new Date(),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nao foi possivel carregar a configuracao.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadConfiguration();
  }, []);

  const summary = useMemo(() => {
    const companies = snapshot?.companies ?? [];
    const plans = snapshot?.plans ?? [];
    const permissions = snapshot?.permissions ?? [];
    const plansById = new Map(plans.map((plan) => [plan.id, plan]));
    const activeCompanies = companies.filter((company) => company.status === 'ACTIVE' || company.isActive);
    const companiesWithoutPlan = companies.filter((company) => (
      !company.platformPlanId && !company.planId && !company.plan
    ));
    const companiesWithoutAsaas = companies.filter((company) => {
      const plan = plansById.get(company.platformPlanId || company.planId || '');
      const isFree = company.plan === 'FREE' || plan?.isFree === true;
      const requiresBilling = ['ACTIVE', 'PAST_DUE', 'PENDING_PAYMENT'].includes(company.billingStatus || '');
      return requiresBilling && !isFree && !company.asaasCustomerId;
    });
    const inactivePlans = plans.filter((plan) => plan.isActive === false);

    return {
      companies,
      plans,
      permissions,
      activeCompanies,
      companiesWithoutPlan,
      companiesWithoutAsaas,
      inactivePlans,
      pendingTotal: companiesWithoutPlan.length + companiesWithoutAsaas.length,
    };
  }, [snapshot]);

  const governanceItems: HubItem[] = [
    {
      title: 'Empresas',
      description: 'Cadastro, limites, situacao de acesso e dados operacionais de cada cliente.',
      href: `/${tenant}/dashboard/platform/companies`,
      action: 'Gerenciar empresas',
      icon: Building2,
      accent: 'border-l-cyan-500',
      meta: `${summary.companies.length} cadastradas`,
    },
    {
      title: 'Planos e limites',
      description: 'Precos, quantidade de usuarios, modulos e regras comerciais disponiveis.',
      href: `/${tenant}/dashboard/platform/plans`,
      action: 'Administrar planos',
      icon: CreditCard,
      accent: 'border-l-amber-500',
      meta: `${summary.plans.length} planos`,
    },
    {
      title: 'Permissoes globais',
      description: 'Politicas por perfil para controlar visualizacao e operacoes sensiveis.',
      href: `/${tenant}/dashboard/platform/permissions`,
      action: 'Revisar permissoes',
      icon: ShieldCheck,
      accent: 'border-l-emerald-500',
      meta: `${summary.permissions.length} perfis configurados`,
    },
  ];

  const operationItems: HubItem[] = [
    {
      title: 'Assinaturas',
      description: 'Vinculos entre empresas, planos e cobranca recorrente no Asaas.',
      href: `/${tenant}/dashboard/platform/subscriptions`,
      action: 'Acompanhar assinaturas',
      icon: CircleDollarSign,
      accent: 'border-l-teal-500',
      meta: `${summary.companiesWithoutAsaas.length} sem cliente Asaas`,
    },
    {
      title: 'Acessos DEV',
      description: 'Acessos tecnicos e sessoes de suporte que exigem controle administrativo.',
      href: `/${tenant}/dashboard/platform/access`,
      action: 'Controlar acessos',
      icon: KeyRound,
      accent: 'border-l-orange-500',
      meta: 'Consulta operacional',
    },
    {
      title: 'Integracoes e comunicacao',
      description: 'Configuracao e acompanhamento dos canais de comunicacao da plataforma.',
      href: `/${tenant}/dashboard/platform/whatsapp`,
      action: 'Abrir integracoes',
      icon: MessageSquareText,
      accent: 'border-l-sky-500',
      meta: 'Status verificado na area',
    },
    {
      title: 'Auditoria',
      description: 'Historico de alteracoes por empresa, autor, entidade e data.',
      href: `/${tenant}/dashboard/platform/audit`,
      action: 'Consultar auditoria',
      icon: History,
      accent: 'border-l-slate-500',
      meta: 'Consulta por empresa',
    },
  ];

  if (loading) return <ConfigurationSkeleton />;

  if (error && !snapshot) {
    return (
      <section className="rounded-[28px] border border-rose-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle size={22} />
        </span>
        <h2 className="mt-4 text-xl font-black text-slate-950">Configuracao indisponivel</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">{error}</p>
        <button
          type="button"
          onClick={() => void loadConfiguration()}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          <RefreshCw size={15} />
          Tentar novamente
        </button>
      </section>
    );
  }

  return (
    <div className="mx-auto w-full space-y-5 pb-10">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950 px-5 py-6 text-white shadow-[0_24px_70px_-42px_rgba(15,23,42,.75)] sm:px-7">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.18),transparent_62%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-teal-300">
              <Settings2 size={15} />
              <p className="text-[10px] font-black uppercase tracking-[0.22em]">Administracao da plataforma</p>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-[-0.035em] sm:text-3xl">
              Configuracao central, sem duplicacao.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Empresas, planos, acessos, integracoes e rastreabilidade em um unico ponto.
              Cobrancas e contratos permanecem em seus fluxos proprios.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-400">
              Leitura do console: {snapshot ? formatTime(snapshot.loadedAt) : '--:--'}
            </span>
            <button
              type="button"
              onClick={() => void loadConfiguration(true)}
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-black text-white transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
            >
              {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Atualizar
            </button>
          </div>
        </div>
      </section>

      {error && snapshot && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>Os dados anteriores foram preservados, mas a atualizacao falhou: {error}</p>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Empresas ativas',
            value: summary.activeCompanies.length,
            detail: `${summary.companies.length} cadastradas`,
            icon: Building2,
          },
          {
            label: 'Planos cadastrados',
            value: summary.plans.length,
            detail: summary.inactivePlans.length ? `${summary.inactivePlans.length} inativos` : 'Nenhum inativo',
            icon: CreditCard,
          },
          {
            label: 'Perfis configurados',
            value: summary.permissions.length,
            detail: 'Politicas carregadas da API',
            icon: Users,
          },
          {
            label: 'Pendencias',
            value: summary.pendingTotal,
            detail: 'Plano ou vinculo Asaas',
            icon: ClipboardList,
          },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{item.value}</p>
                <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <item.icon size={17} />
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <ConfigurationGroup
            eyebrow="Governanca"
            title="Estrutura e controle"
            description="Cadastros e politicas que definem como a plataforma opera."
            items={governanceItems}
          />
          <ConfigurationGroup
            eyebrow="Operacao"
            title="Acessos, integracoes e rastreabilidade"
            description="Ferramentas administrativas para acompanhar o funcionamento cotidiano."
            items={operationItems}
          />
        </div>

        <aside className="h-fit rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Alteracoes pendentes
              </p>
              <h2 className="mt-2 text-lg font-black text-slate-950">Fila administrativa</h2>
            </div>
            <span className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-black ${
              summary.pendingTotal > 0
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {summary.pendingTotal}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {summary.pendingTotal === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 size={17} />
                  <p className="text-sm font-black">Nenhuma pendencia detectada</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-emerald-800">
                  Todas as empresas possuem plano e vinculo de cliente Asaas conforme os dados atuais.
                </p>
              </div>
            ) : (
              <>
                {summary.companiesWithoutPlan.length > 0 && (
                  <PendingItem
                    title="Empresas sem plano"
                    count={summary.companiesWithoutPlan.length}
                    description="Defina plano e limites para evitar acesso sem regra comercial."
                    href={`/${tenant}/dashboard/platform/companies`}
                  />
                )}
                {summary.companiesWithoutAsaas.length > 0 && (
                  <PendingItem
                    title="Empresas sem cliente Asaas"
                    count={summary.companiesWithoutAsaas.length}
                    description="Revise o vinculo antes de operar cobranca recorrente."
                    href={`/${tenant}/dashboard/platform/subscriptions`}
                  />
                )}
              </>
            )}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-xs leading-5 text-slate-500">
              Esta fila usa apenas dados carregados da API. O estado de integracoes deve ser confirmado
              dentro da respectiva area.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

function ConfigurationGroup({
  eyebrow,
  title,
  description,
  items,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: HubItem[];
}) {
  return (
    <section>
      <div className="mb-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-700">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex min-h-44 flex-col rounded-2xl border border-l-4 border-slate-200 ${item.accent} bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md`}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
                <item.icon size={18} />
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                {item.meta}
              </span>
            </div>
            <h3 className="mt-4 text-base font-black text-slate-950">{item.title}</h3>
            <p className="mt-1 flex-1 text-sm leading-6 text-slate-500">{item.description}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-slate-800">
              {item.action}
              <ArrowUpRight size={14} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PendingItem({
  title,
  count,
  description,
  href,
}: {
  title: string;
  count: number;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-amber-200 bg-amber-50 p-4 transition hover:border-amber-300"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-amber-950">{title}</p>
        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-black text-amber-900">{count}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-amber-900/75">{description}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-amber-950">
        Resolver
        <ArrowUpRight size={13} />
      </span>
    </Link>
  );
}
