'use client';

import { TrendingUp, Users, AlertCircle, CheckCircle2, DollarSign, Activity, FileText } from 'lucide-react';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { formatCurrency } from '@/app/lib/format';
import { LoadingState, ErrorState, EmptyState } from '@/app/components/data-states';

export default function PlatformDashboardPage() {
  const statsQuery = useQuery(() => api.platform.stats(), []);
  const summaryQuery = useQuery(() => api.platform.finance.summary(), []);
  const invoicesQuery = useQuery(() => api.platform.finance.list({ limit: 5 }), []);

  if (statsQuery.loading || summaryQuery.loading) {
    return <LoadingState label="Carregando indicadores da plataforma..." />;
  }

  if (statsQuery.error || summaryQuery.error) {
    return (
      <ErrorState 
        message={statsQuery.error || summaryQuery.error || 'Não foi possível carregar os dados da plataforma.'} 
        onRetry={() => { statsQuery.refetch(); summaryQuery.refetch(); invoicesQuery.refetch(); }} 
      />
    );
  }

  const stats = statsQuery.data;
  const summary = summaryQuery.data;
  const invoices = invoicesQuery.data?.items || [];

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
    PAID: 'Concluído',
    OPEN: 'Pendente',
    OVERDUE: 'Atrasado',
    CANCELED: 'Cancelado',
  };

  return (
    <div className="mx-auto w-full space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Central de Operações</h2>
          <p className="text-sm text-slate-500">Visão consolidada da plataforma</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          title="Recebido no mês" 
          value={formatCurrency(summary?.totals?.received ?? 0)} 
          icon={<DollarSign size={20} className="text-emerald-600" />} 
          trend={`${summary?.conversionRate ?? 0}% taxa de conversão`} 
        />
        <Card 
          title="Faturamento Bruto" 
          value={formatCurrency(summary?.totals?.billed ?? 0)} 
          icon={<TrendingUp size={20} className="text-blue-600" />} 
          trend={`${summary?.count ?? 0} faturas`} 
        />
        <Card 
          title="Empresas Ativas" 
          value={stats?.activeCompanies ? String(stats.activeCompanies) : (stats?.companies ? String(stats.companies) : '0')} 
          icon={<Users size={20} className="text-indigo-600" />} 
          trend={`${stats?.users ?? 0} usuários cadastrados`} 
        />
        <Card 
          title="Atrasado / Em Aberto" 
          value={formatCurrency(summary?.totals?.overdue ?? 0)} 
          icon={<AlertCircle size={20} className="text-rose-600" />} 
          trend={`${formatCurrency(summary?.totals?.open ?? 0)} a vencer`} 
          trendDown 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Activity size={16} /> Faturamento Mensal (Últimos Meses)
            </h3>
          </div>
          {summary?.monthly && summary.monthly.length > 0 ? (
            <div className="h-56 w-full rounded-xl bg-slate-50 border border-slate-100 flex items-end justify-between p-4 px-6 gap-2">
              {summary.monthly.map((m, i) => {
                const maxVal = Math.max(...summary.monthly.map(item => item.billed), 1);
                const heightPercent = Math.min(100, Math.max(10, Math.round((m.billed / maxVal) * 100)));
                return (
                  <div key={i} className="w-full bg-blue-500/20 rounded-t-md relative group hover:bg-blue-500/40 transition-colors" style={{ height: `${heightPercent}%` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {formatCurrency(m.billed)}
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 font-medium uppercase">
                      {m.month}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400">
              Sem dados históricos disponíveis
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <CheckCircle2 size={16} /> Status dos Serviços (Core)
            </h3>
          </div>
          <div className="space-y-4 flex-1 mt-2">
            <StatusRow label="API Principal (NestJS)" status="Operacional" color="emerald" />
            <StatusRow label="Banco de Dados (PostgreSQL)" status="Operacional" color="emerald" />
            <StatusRow label="Integração Asaas" status="Operacional" color="emerald" />
            <StatusRow label="Antivírus ClamAV" status="Operacional" color="emerald" />
            <StatusRow label="Fila Redis & Notificações" status="Operacional" color="emerald" />
          </div>
        </section>
      </div>
      
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <FileText size={16} /> Últimas Faturas Registradas
          </h3>
        </div>
        {invoices.length === 0 ? (
          <EmptyState message="Nenhuma fatura registrada recentemente." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-500 uppercase tracking-wider bg-white">
                  <th className="p-3 pl-0">Data Vencimento</th>
                  <th className="p-3">Empresa</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3 text-right">Valor</th>
                  <th className="p-3 pr-0 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const colorKey = statusBadgeColor[inv.status] || 'amber';
                  return (
                    <tr key={inv.id} className="border-b border-slate-50 last:border-0 text-sm text-slate-700">
                      <td className="p-3 pl-0 text-slate-400 text-xs">{inv.dueDate}</td>
                      <td className="p-3 font-medium text-slate-900">{inv.company?.name || 'Empresa'}</td>
                      <td className="p-3 text-slate-600">{inv.description || 'Assinatura Plataforma'}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(Number(inv.amount))}</td>
                      <td className="p-3 pr-0 text-right">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeColors[colorKey]}`}>
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

function Card({ title, value, icon, trend, trendDown = false }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
          <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
        </div>
        <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          <span className={`text-xs font-bold ${trendDown ? 'text-rose-600' : 'text-emerald-600'}`}>
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
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${badgeColors[color]}`}>
        {status}
      </span>
    </div>
  );
}
