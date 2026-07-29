'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  BadgeDollarSign,
  Building2,
  CalendarDays,
  Clock3,
  CreditCard,
  ExternalLink,
  History,
  RefreshCw,
  Search,
  ShieldCheck,
  ReceiptText,
  Users,
  AlertTriangle,
  FileText,
  X,
} from 'lucide-react';
import { EmptyState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { api, type PlatformBillingAuditLog, type PlatformCompany, type PlatformFinanceSummary, type PublicPlatformPlan } from '@/app/lib/api';
import { toast } from 'sonner';

type SubscriptionCompany = PlatformCompany & {
  subscription?: {
    status?: string | null;
    seatQuantity?: number | null;
    pendingSeatQuantity?: number | null;
    nextDueDate?: string | null;
    currentPeriodEnd?: string | null;
  } | null;
  trialEndsAt?: string | null;
};

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ACTIVE', label: 'Ativas' },
  { value: 'TRIAL', label: 'Trial' },
  { value: 'PENDING_PAYMENT', label: 'Aguardando pagamento' },
  { value: 'PAST_DUE', label: 'Em atraso' },
  { value: 'CANCELED', label: 'Canceladas' },
] as const;

function money(value?: number | string | null) {
  const numeric = Number(value ?? 0);
  return numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dateLabel(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value));
}

function plainDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' }).format(new Date(value));
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function formatAction(action: string) {
  const labels: Record<string, string> = {
    COMPANY_CREATED: 'Conta criada',
    BILLING_ONBOARDING_PAYMENT_CREATED: 'Primeira cobrança gerada',
    BILLING_ONBOARDING_PENDING: 'Cobrança pendente',
    BILLING_ONBOARDING_READY: 'Onboarding pronto',
    ONBOARDING_FREE_ACTIVATED: 'Plano free ativado',
    ONBOARDING_TRIAL_READY: 'Trial liberado',
    ONBOARDING_TRIAL_SUBSCRIPTION_SCHEDULED: 'Assinatura agendada',
    ONBOARDING_PAYMENT_READY: 'Pagamento preparado',
    SEATS_QUANTITY_CHANGED: 'Assentos aumentados',
    SEATS_REDUCTION_SCHEDULED: 'Redução agendada',
    PLAN_CHANGED: 'Plano alterado',
    INVOICE_SYNCED: 'Fatura sincronizada',
    INVOICE_CANCELED: 'Fatura cancelada',
    INVOICE_REFUND_REQUESTED: 'Estorno solicitado',
    INITIAL_CHARGE_CREATED: 'Cobrança inicial criada',
    RECURRING_SUBSCRIPTION_CREATED: 'Assinatura recorrente criada',
    MANUAL_CONTRACT_BILLING_SYNCED: 'Contrato manual integrado',
  };
  return labels[action] || action.replace(/_/g, ' ').toLowerCase();
}

function auditTone(action: string) {
  if (action.includes('CANCELED') || action.includes('PENDING') || action.includes('REFUND')) {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }
  if (action.includes('SCHEDULED') || action.includes('READY') || action.includes('TRIAL')) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function statusTone(status?: string | null) {
  if (status === 'ACTIVE') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'TRIAL' || status === 'PENDING_PAYMENT') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'PAST_DUE') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (status === 'CANCELED') return 'border-slate-200 bg-slate-100 text-slate-600';
  return 'border-slate-200 bg-slate-100 text-slate-600';
}

function lifecycleLabel(company: SubscriptionCompany) {
  const billingStatus = company.billingStatus || company.subscription?.status || 'TRIAL';
  if (billingStatus === 'ACTIVE') return 'Ativa e faturando';
  if (billingStatus === 'TRIAL') return 'Conta criada, trial ativo';
  if (billingStatus === 'PENDING_PAYMENT') return 'Aguardando primeiro pagamento';
  if (billingStatus === 'PAST_DUE') return 'Cobrança vencida';
  if (billingStatus === 'CANCELED') return 'Cancelamento em ciclo final';
  return 'Sem status definido';
}

function planPricing(plan?: PublicPlatformPlan | null, seats = 0) {
  if (!plan) return null;
  const base = Number(plan.baseMonthlyPrice ?? plan.price ?? 0);
  const user = Number(plan.userMonthlyPrice ?? 0);
  const currentSeats = Math.max(0, Number(seats) || 0);
  const total = plan.isFree ? 0 : base + (user * currentSeats);
  return { base, user, total, currentSeats };
}

export default function SubscriptionsPage({ params: { tenant } }: { params: { tenant: string } }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<SubscriptionCompany[]>([]);
  const [plans, setPlans] = useState<PublicPlatformPlan[]>([]);
  const [summary, setSummary] = useState<PlatformFinanceSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<PlatformBillingAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]['value']>('ALL');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [workingCheckoutId, setWorkingCheckoutId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [companiesData, plansData, summaryData, logsData] = await Promise.all([
        api.platform.listCompanies(),
        api.platform.listPlans(),
        api.platform.finance.summary(),
        api.platform.finance.billingAuditLogs({ limit: 80 }),
      ]);
      setCompanies(companiesData || []);
      setPlans((plansData || []) as PublicPlatformPlan[]);
      setSummary(summaryData);
      setAuditLogs(logsData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar as assinaturas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const planById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);

  const filteredCompanies = useMemo(() => {
    const term = normalizeText(search.trim());
    return companies.filter((company) => {
      const status = company.billingStatus || company.subscription?.status || 'TRIAL';
      if (statusFilter !== 'ALL' && status !== statusFilter) return false;
      if (!term) return true;
      const plan = planById.get(company.platformPlanId || '');
      return (
        normalizeText(company.name).includes(term) ||
        normalizeText(company.document || '').includes(term) ||
        normalizeText(plan?.name || '').includes(term) ||
        normalizeText(lifecycleLabel(company)).includes(term)
      );
    });
  }, [companies, planById, search, statusFilter]);

  const totals = useMemo(() => {
    const result = {
      active: 0,
      trial: 0,
      pending: 0,
      overdue: 0,
      canceled: 0,
    };
    for (const company of companies) {
      const status = company.billingStatus || company.subscription?.status || 'TRIAL';
      if (status === 'ACTIVE') result.active += 1;
      else if (status === 'TRIAL') result.trial += 1;
      else if (status === 'PENDING_PAYMENT') result.pending += 1;
      else if (status === 'PAST_DUE') result.overdue += 1;
      else if (status === 'CANCELED') result.canceled += 1;
    }
    return result;
  }, [companies]);

  const recentAudit = useMemo(() => auditLogs.slice(0, 12), [auditLogs]);
  const selectedCompany = useMemo(
    () => filteredCompanies.find((company) => company.id === selectedCompanyId) || null,
    [filteredCompanies, selectedCompanyId],
  );
  const canRunCheckout = String(user?.role || user?.profile || '').toUpperCase() === 'DEV';

  async function runCheckout(company: SubscriptionCompany) {
    if (!window.confirm(`Gerar ou atualizar a cobranca de onboarding para ${company.name}?`)) return;
    setWorkingCheckoutId(company.id);
    try {
      await api.platform.finance.checkoutCompany(company.id);
      toast.success('Cobrança de onboarding gerada.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nao foi possivel gerar a cobranca.');
    } finally {
      setWorkingCheckoutId(null);
    }
  }

  return (
    <div className="mx-auto w-full space-y-6 pb-10">
      <header className="rounded-[18px] border border-slate-200 bg-slate-950 px-6 py-6 text-white shadow-2xl shadow-slate-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-300">Gestao de assinaturas</p>
            <h2 className="text-2xl font-black tracking-tight">Conta criada. Pagamento liberado. Renovacao auditada.</h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-300">
              Esta tela mostra o ciclo operacional da assinatura: criacao da empresa, primeira cobranca, renovacao por assentos e cancelamento com trilha de auditoria.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={load}
              className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/15 bg-white/8 px-4 text-xs font-bold text-white shadow-sm hover:bg-white/12"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Atualizar contexto
            </button>
            <Link
              href={`/${tenant}/dashboard/platform/companies`}
              className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-violet-600 px-4 text-xs font-black text-white shadow-sm hover:bg-violet-500"
            >
              <Building2 size={14} />
              Ir para empresas
            </Link>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'MRR real', value: summary ? money(summary.mrr) : '—', icon: BadgeDollarSign, tone: 'bg-slate-950 text-white' },
          { label: 'Assinaturas ativas', value: totals.active, icon: ShieldCheck, tone: 'bg-emerald-600 text-white' },
          { label: 'Primeiro pagamento pendente', value: totals.pending, icon: CreditCard, tone: 'bg-amber-500 text-white' },
          { label: 'Inadimplentes', value: totals.overdue, icon: AlertTriangle, tone: 'bg-rose-600 text-white' },
        ].map((stat) => (
          <article key={stat.label} className="flex items-center gap-4 rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.tone} shadow-inner`}>
              <stat.icon size={20} strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{stat.label}</p>
              <p className="mt-0.5 text-2xl font-black tracking-tight text-slate-950">{stat.value}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-[16px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-950">Fluxo operacional da assinatura</h3>
              <p className="mt-1 text-xs text-slate-500">
                Valor inicial + adicional por usuario + renovacao automatica + cancelamento controlado.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-600">
                Conta criada
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-600">
                1a cobranca
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-600">
                Renovacao
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-600">
                Cancelamento
              </div>
            </div>
          </div>

          <div className="border-b border-slate-100 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por empresa, plano ou contexto..."
                  className="h-10 w-full rounded-[10px] border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-violet-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as (typeof STATUS_FILTERS)[number]['value'])}
                className="h-10 rounded-[10px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-500"
              >
                {STATUS_FILTERS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => { setSearch(''); setStatusFilter('ALL'); }}
                className="h-10 rounded-[10px] border border-slate-200 bg-slate-50 px-4 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Limpar filtros
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8">
              <LoadingState label="Carregando assinaturas, planos e auditoria..." />
            </div>
          ) : !filteredCompanies.length ? (
            <div className="p-8">
              <EmptyState message="Nenhuma assinatura encontrada para os filtros selecionados." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Empresa</th>
                    <th className="px-4 py-3">Plano e precificacao</th>
                    <th className="px-4 py-3">Ciclo operacional</th>
                    <th className="px-4 py-3">Financeiro</th>
                    <th className="px-4 py-3">Acesso</th>
                    <th className="px-5 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCompanies.map((company) => {
                    const plan = planById.get(company.platformPlanId || '');
                    const seats = company.subscription?.seatQuantity ?? company.usersCount ?? 0;
                    const pricing = planPricing(plan, seats);
                    const billingStatus = company.billingStatus || company.subscription?.status || 'TRIAL';
                    const activeLabel = lifecycleLabel(company);
                    const nextDue = company.subscription?.nextDueDate || company.trialEndsAt || company.subscription?.currentPeriodEnd;

                    return (
                      <tr key={company.id} className="group hover:bg-slate-50/70">
                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-500">
                              {company.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900">{company.name}</p>
                              <p className="mt-0.5 text-[10px] font-medium text-slate-400">{company.document || 'Sem CNPJ'} · Criada em {plainDate(company.createdAt)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="text-xs font-black text-slate-800">{plan?.name || company.plan || 'Sem plano vinculado'}</p>
                          <div className="mt-1 space-y-1 text-[10px] text-slate-500">
                            <p>Base: {pricing ? money(pricing.base) : '—'}</p>
                            <p>Adicional por usuario: {pricing ? money(pricing.user) : '—'}</p>
                            <p>{pricing ? `${pricing.currentSeats} usuario(s) considerados` : '—'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-1">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${statusTone(billingStatus)}`}>
                              {billingStatus}
                            </span>
                            <p className="text-[10px] font-medium text-slate-500">{activeLabel}</p>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Clock3 size={11} />
                              {nextDue ? `Proximo marco: ${plainDate(nextDue)}` : 'Sem vencimento definido'}
                            </div>
                            {company.subscription?.pendingSeatQuantity ? (
                              <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
                                Reducao pendente para {company.subscription.pendingSeatQuantity} usuarios
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mensalidade estimada</p>
                            <p className="text-sm font-black text-slate-950">{pricing ? money(pricing.total) : '—'}</p>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                              <ReceiptText size={11} />
                              {company.asaasCustomerId || company.asaasSubscriptionId ? 'Integrado ao Asaas' : 'Aguardando integracao'}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-1">
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600">
                              {company.asaasSubscriptionId ? 'Assinatura ativa' : 'Conta em configuracao'}
                            </span>
                            <p className="text-[10px] font-medium text-slate-500">Usuarios cobraveis: {company.subscription?.seatQuantity ?? company.usersCount ?? 0}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedCompanyId(company.id)}
                              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[10px] font-bold text-slate-600 shadow-sm hover:bg-white hover:text-slate-900"
                            >
                              <FileText size={12} />
                              Detalhes
                            </button>
                            {company.asaasCustomerId ? (
                              <a
                                href={`https://www.asaas.com/customer/view/${company.asaasCustomerId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[10px] font-bold text-slate-600 shadow-sm hover:bg-white hover:text-violet-700"
                              >
                                <ExternalLink size={12} />
                                Asaas
                              </a>
                            ) : null}
                            <Link
                              href={`/${tenant}/dashboard/platform/companies?search=${encodeURIComponent(company.name)}`}
                              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[10px] font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                            >
                              <ArrowRightLeft size={12} />
                              Empresa
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <section className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <History size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-950">Auditoria pesada</h3>
                <p className="text-xs text-slate-500">Quem criou, quem alterou e o que mudou em cada assinatura.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {recentAudit.length === 0 && !loading ? (
                <div className="rounded-[14px] border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500">
                  Nenhum evento de assinatura encontrado ainda.
                </div>
              ) : (
                recentAudit.map((log) => {
                  const summaryText = (() => {
                    const metadata = log.metadata || {};
                    if (typeof metadata === 'object' && metadata) {
                      const keys = ['name', 'nextPlanName', 'amount', 'nextSeatQuantity', 'previousStatus', 'nextStatus', 'paymentUrlCreated'];
                      const parts = keys
                        .filter((key) => key in metadata)
                        .map((key) => `${key}: ${String((metadata as Record<string, unknown>)[key])}`);
                      return parts.join(' · ');
                    }
                    return '';
                  })();

                  return (
                    <article key={log.id} className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${auditTone(log.action)}`}>
                              {formatAction(log.action)}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{log.entity}</span>
                          </div>
                          <p className="mt-2 text-sm font-black text-slate-900">{log.company?.name || 'Empresa removida'}</p>
                          <p className="mt-1 text-[10px] leading-5 text-slate-500">
                            {summaryText || 'Evento financeiro registrado com dados de auditoria persistentes.'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400">{dateLabel(log.createdAt)}</p>
                          <p className="mt-1 text-[10px] font-semibold text-slate-500">
                            {log.user?.name || log.user?.email || 'Sistema'}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-[16px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <h3 className="text-sm font-black">Como a assinatura cresce</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-black">1</div>
                <div>
                  <p className="font-bold text-white">Criacao da conta</p>
                  <p className="text-xs leading-5">A empresa nasce com plano, trial ou primeiro pagamento pendente.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-black">2</div>
                <div>
                  <p className="font-bold text-white">Cobrança base + usuarios</p>
                  <p className="text-xs leading-5">O valor mensal parte do plano e sobe com cada colaborador adicional cobrável.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-black">3</div>
                <div>
                  <p className="font-bold text-white">Renovacao e cancelamento</p>
                  <p className="text-xs leading-5">Toda mudanca gera auditoria e o bloqueio final respeita o ciclo de pagamento.</p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[14px] border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
              Auditoria e contexto operacional agora vivem juntos: quem criou, quando cobrou, qual o valor e o que foi ajustado.
            </div>
          </section>
        </aside>
      </section>

      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/50 p-4">
          <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">Detalhe da assinatura</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">{selectedCompany.name}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedCompany.document || 'Sem CNPJ'} • {lifecycleLabel(selectedCompany)}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedCompanyId(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={18} />
                <span className="sr-only">Fechar</span>
              </button>
            </header>

            <div className="grid gap-4 overflow-y-auto p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Plano', planById.get(selectedCompany.platformPlanId || '')?.name || selectedCompany.plan || 'Sem plano'],
                  ['Status financeiro', selectedCompany.billingStatus || selectedCompany.subscription?.status || 'TRIAL'],
                  ['Assentos cobrados', String(selectedCompany.subscription?.seatQuantity ?? selectedCompany.usersCount ?? 0)],
                  ['Próximo vencimento', plainDate(selectedCompany.subscription?.nextDueDate || selectedCompany.trialEndsAt || selectedCompany.subscription?.currentPeriodEnd)],
                  ['Cliente Asaas', selectedCompany.asaasCustomerId || '-'],
                  ['Assinatura Asaas', selectedCompany.asaasSubscriptionId || '-'],
                ].map(([label, value]) => (
                  <article key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                    <p className="mt-2 text-sm font-bold text-slate-900">{value}</p>
                  </article>
                ))}
              </div>

              <article className="rounded-2xl border border-slate-200 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Precificação estimada</p>
                {(() => {
                  const plan = planById.get(selectedCompany.platformPlanId || '');
                  const pricing = planPricing(plan, selectedCompany.subscription?.seatQuantity ?? selectedCompany.usersCount ?? 0);
                  return (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Base</p>
                        <p className="mt-1 text-sm font-black text-slate-950">{pricing ? money(pricing.base) : '—'}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Adicional</p>
                        <p className="mt-1 text-sm font-black text-slate-950">{pricing ? money(pricing.user) : '—'}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total</p>
                        <p className="mt-1 text-sm font-black text-slate-950">{pricing ? money(pricing.total) : '—'}</p>
                      </div>
                    </div>
                  );
                })()}
              </article>

              <article className="rounded-2xl border border-slate-200 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Ações</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/${tenant}/dashboard/platform/finance?search=${encodeURIComponent(selectedCompany.name)}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <ReceiptText size={14} />
                    Ver financeiro
                  </Link>
                  <Link
                    href={`/${tenant}/dashboard/platform/companies?search=${encodeURIComponent(selectedCompany.name)}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Building2 size={14} />
                    Abrir empresa
                  </Link>
                  {canRunCheckout && (
                    <button
                      type="button"
                      onClick={() => runCheckout(selectedCompany)}
                      disabled={workingCheckoutId === selectedCompany.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CreditCard size={14} />
                      {workingCheckoutId === selectedCompany.id ? 'Gerando...' : 'Gerar cobrança'}
                    </button>
                  )}
                </div>
              </article>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
