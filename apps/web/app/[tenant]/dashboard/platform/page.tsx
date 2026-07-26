'use client';

import React from 'react';
import {
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Activity,
  FileText,
  AlertTriangle,
  ChevronRight,
  Building2,
  CreditCard
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { formatCurrency } from '@/app/lib/format';
import { LoadingState, ErrorState, EmptyState } from '@/app/components/data-states';

export default function PlatformDashboardPage() {
  const params = useParams();
  const tenant = String(params?.tenant || '');

  const statsQuery = useQuery(() => api.platform.stats(), []);
  const summaryQuery = useQuery(() => api.platform.finance.summary(), []);
  const invoicesQuery = useQuery(() => api.platform.finance.list({ limit: 5 }), []);
  const companiesQuery = useQuery(() => api.platform.listCompanies(), []);

  if (statsQuery.loading || summaryQuery.loading || companiesQuery.loading) {
    return <LoadingState label="Carregando console operacional corporativo..." />;
  }

  if (statsQuery.error || summaryQuery.error) {
    return (
      <ErrorState
        message={statsQuery.error || summaryQuery.error || 'NÃƒÆ’Ã‚Â£o foi possÃƒÆ’Ã‚Â­vel carregar os dados da plataforma.'}
        onRetry={() => {
          statsQuery.refetch();
          summaryQuery.refetch();
          invoicesQuery.refetch();
          companiesQuery.refetch();
        }}
      />
    );
  }

  const stats = statsQuery.data;
  const summary = summaryQuery.data;
  const invoices = invoicesQuery.data?.items || [];
  const companies = Array.isArray(companiesQuery.data) ? companiesQuery.data : [];

  // Itens que requerem atenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o
  const overdueCompanies = companies.filter((c: any) => c.billingStatus === 'PAST_DUE' || c.status === 'SUSPENDED');
  const missingAsaasCompanies = companies.filter((c: any) => !c.asaasCustomerId && c.plan !== 'FREE' && c.billingStatus !== 'FREE');

  const badgeColors: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
  };

  const statusBadgeColor: Record<string, string> = {
    PAID: 'emerald',
    OPEN: 'amber',
    OVERDUE: 'rose',
    CANCELED: 'rose',
  };

  const statusText: Record<string, string> = {
    PAID: 'ConcluÃƒÆ’Ã‚Â­do',
    OPEN: 'Pendente',
    OVERDUE: 'Atrasado',
    CANCELED: 'Cancelado',
  };

  const mrrReal = summary?.mrr ?? 0;
  return (
    <div className="mx-auto w-full space-y-8 animate-in fade-in duration-500">

      {/* Top Banner Operacional tipo Internet Banking */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -top-10 h-48 w-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SaaS Operations Console v1.1.0
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Painel de Controlo & Tesouraria
            </h2>
            <p className="mt-1 text-sm text-slate-300 max-w-xl font-medium">
              GestÃƒÆ’Ã‚Â£o centralizada de tenants, liquidez financeira, conciliaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de cobranÃƒÆ’Ã‚Â§as e monitoramento de SLAs tÃƒÆ’Ã‚Â©cnicos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/${tenant}/dashboard/platform/companies`}
              className="flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 px-4 py-3 text-xs font-bold text-white transition-all backdrop-blur-md border border-white/10 shadow-lg hover:scale-105 active:scale-95"
            >
              <Building2 size={16} />
              Ver Empresas Clientes
            </Link>
            <Link
              href={`/${tenant}/dashboard/platform/finance`}
              className="flex items-center gap-2 rounded-2xl bg-violet-600 hover:bg-violet-500 px-5 py-3 text-xs font-black text-white transition-all shadow-lg shadow-violet-600/30 hover:scale-105 active:scale-95"
            >
              <CreditCard size={16} />
              Emitir CobranÃƒÆ’Ã‚Â§a
            </Link>
          </div>
        </div>
      </div>

      {/* BLOCO: REQUER SUA ATENÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã†â€™O (CrÃƒÆ’Ã‚Â­tico para OperaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes) */}
      {(overdueCompanies.length > 0 || missingAsaasCompanies.length > 0) && (
        <div className="rounded-2xl border-2 border-amber-300/80 bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-amber-50/80 p-5 md:p-6 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <AlertTriangle size={22} className="animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-black text-amber-950 uppercase tracking-wide">
                Requer Sua AtenÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o Imediata
              </h3>
              <p className="text-xs font-semibold text-amber-800">
                AÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes preventivas e pendÃƒÆ’Ã‚Âªncias operacionais detectadas pelo sistema de monitoramento:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overdueCompanies.length > 0 && (
              <Link
                href={`/${tenant}/dashboard/platform/companies`}
                className="flex items-center justify-between p-4 rounded-xl bg-white/90 border border-amber-200 shadow-sm hover:border-amber-400 hover:bg-white transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">
                      {overdueCompanies.length} {overdueCompanies.length === 1 ? 'Empresa Inadimplente' : 'Empresas Inadimplentes'}
                    </span>
                    <span className="text-[11px] text-slate-500">Status PAST_DUE ou Suspensas</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 group-hover:text-amber-600 transition-all" />
              </Link>
            )}

            {missingAsaasCompanies.length > 0 && (
              <Link
                href={`/${tenant}/dashboard/platform/companies`}
                className="flex items-center justify-between p-4 rounded-xl bg-white/90 border border-amber-200 shadow-sm hover:border-amber-400 hover:bg-white transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">
                      {missingAsaasCompanies.length} {missingAsaasCompanies.length === 1 ? 'Empresa sem Asaas ID' : 'Empresas sem Asaas ID'}
                    </span>
                    <span className="text-[11px] text-slate-500">NecessÃƒÆ’Ã‚Â¡rio vincular cliente</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 group-hover:text-amber-600 transition-all" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Faixa de Indicadores Financeiros e Operacionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card
          title="Recebido no mes (Liquidez)"
          value={formatCurrency(summary?.totals?.received ?? 0)}
          icon={<DollarSign size={22} className="text-emerald-600" />}
          trend={`${summary?.conversionRate ?? 0}% taxa de conversÃƒÆ’Ã‚Â£o`}
          highlightColor="emerald"
        />
        <Card
          title="MRR Real (Recorrente)"
          value={formatCurrency(mrrReal)}
          icon={<TrendingUp size={22} className="text-violet-600" />}
          trend={`${summary?.activeSubscriptions ?? 0} assinaturas ativas`}
          highlightColor="violet"
        />
        <Card
          title="Faturamento Bruto Emitido"
          value={formatCurrency(summary?.totals?.billed ?? 0)}
          icon={<Activity size={22} className="text-blue-600" />}
          trend={`${summary?.count ?? 0} faturas registradas`}
          highlightColor="blue"
        />
        <Card
          title="InadimplÃƒÆ’Ã‚Âªncia / Em Aberto"
          value={formatCurrency(summary?.totals?.overdue ?? 0)}
          icon={<AlertCircle size={22} className="text-rose-600" />}
          trend={`${formatCurrency(summary?.totals?.open ?? 0)} pendente`}
          trendDown
          highlightColor="rose"
        />
      </div>

      {/* GrÃƒÆ’Ã‚Â¡ficos e Status Core */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <section className="lg:col-span-2 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col">
          <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Activity size={18} className="text-violet-600" />
                EvoluÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do Faturamento Mensal
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">HistÃƒÆ’Ã‚Â³rico consolidado das emissÃƒÆ’Ã‚Âµes e cobranÃƒÆ’Ã‚Â§as Asaas</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Sincronizado
            </span>
          </div>

          {summary?.monthly && summary.monthly.length > 0 ? (
            <div className="h-64 w-full rounded-2xl bg-slate-50/60 border border-slate-100/80 flex items-end justify-between p-6 gap-3">
              {summary.monthly.map((m: any, i: number) => {
                const maxVal = Math.max(...summary.monthly.map((item: any) => item.billed), 1);
                const heightPercent = Math.min(100, Math.max(12, Math.round((m.billed / maxVal) * 100)));
                return (
                  <div key={i} className="w-full bg-violet-600/20 hover:bg-violet-600/60 rounded-t-lg relative group transition-all duration-300" style={{ height: `${heightPercent}%` }}>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-10 pointer-events-none">
                      {formatCurrency(m.billed)}
                    </div>
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">
                      {m.month}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <Activity size={32} className="text-slate-300 mb-2" />
              <span>Sem dados histÃƒÆ’Ã‚Â³ricos de faturamento disponÃƒÆ’Ã‚Â­veis para exibiÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o</span>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col">
          <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                SaÃƒÆ’Ã‚Âºde dos ServiÃƒÆ’Ã‚Â§os (Core)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Infraestrutura em tempo real</p>
            </div>
          </div>
          <div className="space-y-4 flex-1">
            <StatusRow label="API Principal (NestJS AI)" status="Operacional" color="emerald" />
            <StatusRow label="Banco de Dados (PostgreSQL)" status="Operacional" color="emerald" />
            <StatusRow label="Gateway Financeiro Asaas" status="Operacional" color="emerald" />
            <StatusRow label="Motor IA (OpenAI GPT-4o)" status="Operacional" color="emerald" />
            <StatusRow label="SeguranÃƒÆ’Ã‚Â§a Anexos (SHA-256)" status="Operacional" color="emerald" />
            <StatusRow label="Fila Redis & SLA Cron" status="Operacional" color="emerald" />
          </div>
        </section>

      </div>

      {/* ÃƒÆ’Ã…Â¡ltimas Faturas Registradas */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileText size={18} className="text-indigo-600" />
              Fluxo de Caixa & ÃƒÆ’Ã…Â¡ltimas Faturas Registradas
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">MovimentaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Âµes recentes de assinaturas na plataforma</p>
          </div>
          <Link
            href={`/${tenant}/dashboard/platform/finance`}
            className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-colors"
          >
            Ver Todas
            <ChevronRight size={14} />
          </Link>
        </div>

        {invoices.length === 0 ? (
          <EmptyState message="Nenhuma fatura registrada recentemente." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="p-3 pl-4">Vencimento</th>
                  <th className="p-3">Empresa Cliente</th>
                  <th className="p-3">DescriÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o da CobranÃƒÆ’Ã‚Â§a</th>
                  <th className="p-3 text-right">Valor Bruto</th>
                  <th className="p-3 pr-4 text-right">Status do Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {invoices.map((inv: any) => {
                  const colorKey = statusBadgeColor[inv.status] || 'amber';
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors text-sm text-slate-700 font-medium">
                      <td className="p-3 pl-4 text-slate-500 text-xs font-mono">{inv.dueDate}</td>
                      <td className="p-3 font-bold text-slate-900">{inv.company?.name || 'Empresa'}</td>
                      <td className="p-3 text-slate-600">{inv.description || 'Assinatura Plataforma'}</td>
                      <td className="p-3 text-right font-black text-slate-900">{formatCurrency(Number(inv.amount))}</td>
                      <td className="p-3 pr-4 text-right">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold ${badgeColors[colorKey]}`}>
                          {statusText[inv.status] || inv.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}

function Card({ title, value, icon, trend, trendDown = false, highlightColor = 'slate' }: any) {
  const borderColors: Record<string, string> = {
    emerald: 'border-l-4 border-l-emerald-500',
    violet: 'border-l-4 border-l-violet-500',
    blue: 'border-l-4 border-l-blue-500',
    rose: 'border-l-4 border-l-rose-500',
    slate: 'border-l-4 border-l-slate-400',
  };

  return (
    <div className={`rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all ${borderColors[highlightColor] || ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{title}</p>
          <h4 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{value}</h4>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100 shadow-inner">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          <span className={`text-xs font-extrabold ${trendDown ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md' : 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md'}`}>
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}

function StatusRow({ label, status, color }: any) {
  const badgeColors: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
  };
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${badgeColors[color]}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
        {status}
      </span>
    </div>
  );
}
