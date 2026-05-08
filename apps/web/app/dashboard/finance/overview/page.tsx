"use client";

import dynamic from 'next/dynamic';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

/* ── Carrega os gráficos SÓ no cliente ──────────── */
const FluxoDeCaixaChart    = dynamic(
  () => import('../_components/FinanceCharts').then(m => m.FluxoDeCaixaChart),
  { ssr: false, loading: () => <div style={{ height: 240, background: '#F9FAFB', borderRadius: 8 }} /> }
);
const ReceitaCategoriaChart = dynamic(
  () => import('../_components/FinanceCharts').then(m => m.ReceitaCategoriaChart),
  { ssr: false, loading: () => <div style={{ height: 200, background: '#F9FAFB', borderRadius: 8 }} /> }
);

const kpis = [
  { label: 'Receita Jul',       value: 'R$ 31.200', change: '+12,4%',   up: true,  sub: 'vs. junho'      },
  { label: 'Despesas Jul',      value: 'R$ 13.800', change: '+4,1%',    up: false, sub: 'vs. junho'      },
  { label: 'Lucro Líquido',     value: 'R$ 17.400', change: '+19,8%',   up: true,  sub: 'margem 55%'     },
  { label: 'Boletos em Aberto', value: '3',          change: 'R$ 7.980', up: false, sub: 'venc. próximo'  },
];

const recentes = [
  { desc: 'Mensalidade Plano Growth — Cliente Alpha', val: '+R$ 12.800', tipo: 'entrada', status: 'Pago',     st: 'badge-green', data: '07/05' },
  { desc: 'Campanhas e automações',                   val: '-R$ 2.380',  tipo: 'saida',   status: 'Pendente', st: 'badge-amber', data: '06/05' },
  { desc: 'Setup de implantação',                     val: '+R$ 5.600',  tipo: 'entrada', status: 'Aberto',   st: 'badge-blue',  data: '05/05' },
  { desc: 'Licença de software anual',                val: '-R$ 4.200',  tipo: 'saida',   status: 'Pago',     st: 'badge-green', data: '04/05' },
  { desc: 'Consultoria estratégica',                  val: '+R$ 3.500',  tipo: 'entrada', status: 'Pago',     st: 'badge-green', data: '03/05' },
];

export default function FinanceOverview() {
  return (
    <div className="space-y-6">

      {/* ── KPIs ──────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-5">
        {kpis.map(k => (
          <div key={k.label} className="dash-card p-6">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-4">{k.label}</p>
            <p className="text-[30px] font-black text-gray-900 leading-none tracking-tight">{k.value}</p>
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              {k.up
                ? <ArrowUpRight size={15} className="text-teal-500 shrink-0" />
                : <ArrowDownRight size={15} className="text-amber-500 shrink-0" />}
              <span className={`text-[12px] font-bold ${k.up ? 'text-teal-600' : 'text-amber-600'}`}>{k.change}</span>
              <span className="text-[12px] text-gray-400">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts ────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_340px] gap-5">

        {/* Fluxo de Caixa */}
        <div className="dash-card p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-[17px] font-bold text-gray-900 tracking-tight">Fluxo de Caixa</h3>
              <p className="text-[12px] text-gray-400 mt-1">Entradas e saídas mensais (R$)</p>
            </div>
            <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-lg px-3 py-1.5">
              <TrendingUp size={14} className="text-teal-600" strokeWidth={2.2} />
              <span className="text-[12px] font-bold text-teal-700">+19,8%</span>
            </div>
          </div>

          {/* ← gráfico isolado no componente cliente */}
          <FluxoDeCaixaChart />

          <div className="flex items-center gap-6 mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-0.5 rounded bg-teal-500" />
              <span className="text-[12px] text-gray-500">Entradas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-0.5 rounded bg-red-400" />
              <span className="text-[12px] text-gray-500">Saídas</span>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Lucro Jul</p>
              <p className="text-[20px] font-black text-teal-600 leading-tight mt-0.5">R$ 17.400</p>
            </div>
          </div>
        </div>

        {/* Por Categoria */}
        <div className="dash-card p-6">
          <h3 className="text-[17px] font-bold text-gray-900 tracking-tight mb-1">Por Categoria</h3>
          <p className="text-[12px] text-gray-400 mb-6">Distribuição de receita — julho</p>

          {/* ← gráfico isolado no componente cliente */}
          <ReceitaCategoriaChart />

          <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Total</p>
              <p className="text-[22px] font-black text-gray-900 leading-none">R$ 33.300</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Categorias</p>
              <p className="text-[22px] font-black text-gray-900 leading-none">4</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabela ────────────────────────────────── */}
      <div className="dash-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="text-[16px] font-bold text-gray-900 tracking-tight">Últimas Movimentações</h3>
            <p className="text-[12px] text-gray-400 mt-0.5">5 transações recentes</p>
          </div>
          <button className="text-[13px] font-semibold text-teal-600 hover:text-teal-700 transition-colors">
            Ver todas →
          </button>
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
              {recentes.map(r => (
                <tr key={r.desc} className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-6 py-4 text-[13px] text-gray-700 leading-snug">{r.desc}</td>
                  <td className={`px-6 py-4 text-[14px] font-bold whitespace-nowrap ${r.tipo === 'entrada' ? 'text-teal-600' : 'text-red-500'}`}>
                    {r.val}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${r.tipo === 'entrada' ? 'badge-teal' : 'badge-gray'}`}>
                      {r.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${r.st}`}>{r.status}</span>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-gray-400 font-medium whitespace-nowrap">{r.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
