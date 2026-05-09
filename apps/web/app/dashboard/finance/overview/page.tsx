"use client";

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, RefreshCw, TrendingUp } from 'lucide-react';
import {
  FinanceSummary,
  fallbackSummary,
  formatCurrency,
  formatDate,
  getFinanceSummary,
  toNumber,
} from '../api';

const FluxoDeCaixaChart = dynamic(
  () => import('../_components/FinanceCharts').then(m => m.FluxoDeCaixaChart),
  { ssr: false, loading: () => <div style={{ height: 240, background: '#F9FAFB', borderRadius: 8 }} /> }
);
const ReceitaCategoriaChart = dynamic(
  () => import('../_components/FinanceCharts').then(m => m.ReceitaCategoriaChart),
  { ssr: false, loading: () => <div style={{ height: 200, background: '#F9FAFB', borderRadius: 8 }} /> }
);

export default function FinanceOverview() {
  const [summary, setSummary] = useState<FinanceSummary>(fallbackSummary);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setSummary(await getFinanceSummary());
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const margin = summary.revenueMonth ? Math.round((summary.balanceMonth / summary.revenueMonth) * 100) : 0;
  const categoriesTotal = summary.categories.reduce((total, item) => total + item.val, 0);
  const kpis = [
    { label: 'Receita do mês', value: formatCurrency(summary.revenueMonth), change: `${margin}%`, up: summary.balanceMonth >= 0, sub: 'margem líquida' },
    { label: 'Despesas do mês', value: formatCurrency(summary.expenseMonth), change: formatCurrency(summary.pendingExpense), up: false, sub: 'a pagar' },
    { label: 'Lucro líquido', value: formatCurrency(summary.balanceMonth), change: summary.balanceMonth >= 0 ? 'positivo' : 'negativo', up: summary.balanceMonth >= 0, sub: 'resultado atual' },
    { label: 'Boletos em aberto', value: String(summary.pendingCount), change: formatCurrency(summary.dueSoonTotal), up: false, sub: 'próx. 7 dias' },
  ];

  const recent = useMemo(() => summary.recent.slice(0, 5), [summary.recent]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-5">
        {kpis.map(k => (
          <div key={k.label} className="dash-card p-6">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{k.label}</p>
            <p className="text-[28px] font-black leading-none tracking-tight text-gray-900">{k.value}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {k.up
                ? <ArrowUpRight size={15} className="shrink-0 text-teal-500" />
                : <ArrowDownRight size={15} className="shrink-0 text-amber-500" />}
              <span className={`text-[12px] font-bold ${k.up ? 'text-teal-600' : 'text-amber-600'}`}>{k.change}</span>
              <span className="text-[12px] text-gray-400">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-5">
        <div className="dash-card p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h3 className="text-[17px] font-bold tracking-tight text-gray-900">Fluxo de Caixa</h3>
              <p className="mt-1 text-[12px] text-gray-400">Entradas e saídas mensais vindas da API</p>
            </div>
            <button onClick={load} className="btn-outline flex items-center gap-1.5" disabled={loading}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>

          <FluxoDeCaixaChart data={summary.cashFlow} />

          <div className="mt-5 flex items-center gap-6 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-0.5 w-4 rounded bg-teal-500" />
              <span className="text-[12px] text-gray-500">Entradas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-0.5 w-4 rounded bg-red-400" />
              <span className="text-[12px] text-gray-500">Saídas</span>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Lucro mês</p>
              <p className="mt-0.5 text-[20px] font-black leading-tight text-teal-600">{formatCurrency(summary.balanceMonth)}</p>
            </div>
          </div>
        </div>

        <div className="dash-card p-6">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[17px] font-bold tracking-tight text-gray-900">Por Categoria</h3>
              <p className="mt-1 text-[12px] text-gray-400">Receitas classificadas automaticamente</p>
            </div>
            <TrendingUp size={16} className="mt-1 text-teal-600" />
          </div>

          <ReceitaCategoriaChart data={summary.categories} />

          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Total</p>
              <p className="text-[20px] font-black leading-none text-gray-900">{formatCurrency(categoriesTotal)}</p>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Categorias</p>
              <p className="text-[22px] font-black leading-none text-gray-900">{summary.categories.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h3 className="text-[16px] font-bold tracking-tight text-gray-900">Últimas Movimentações</h3>
            <p className="mt-0.5 text-[12px] text-gray-400">{recent.length} transações recentes</p>
          </div>
          <Link href="/dashboard/finance/lancamentos" className="text-[13px] font-semibold text-teal-600 transition-colors hover:text-teal-700">
            Ver todas
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="table-premium w-full" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th className="px-6" style={{ width: '40%' }}>Descrição</th>
                <th className="px-6" style={{ width: '16%' }}>Valor</th>
                <th className="px-6" style={{ width: '14%' }}>Tipo</th>
                <th className="px-6" style={{ width: '14%' }}>Status</th>
                <th className="px-6" style={{ width: '16%' }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(item => {
                const amount = toNumber(item.amount);
                return (
                  <tr key={item.id} className="cursor-pointer transition-colors hover:bg-gray-50">
                    <td className="px-6 py-4 text-[13px] leading-snug text-gray-700">{item.description}</td>
                    <td className={`whitespace-nowrap px-6 py-4 text-[14px] font-bold ${item.type === 'REVENUE' ? 'text-teal-600' : 'text-red-500'}`}>
                      {item.type === 'REVENUE' ? '+' : '-'}{formatCurrency(amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${item.type === 'REVENUE' ? 'badge-teal' : 'badge-gray'}`}>
                        {item.type === 'REVENUE' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${item.status === 'PAID' ? 'badge-green' : item.status === 'CANCELED' ? 'badge-red' : 'badge-amber'}`}>
                        {item.status === 'PAID' ? 'Pago' : item.status === 'CANCELED' ? 'Cancelado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-[13px] font-medium text-gray-400">{formatDate(item.dueDate ?? item.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
