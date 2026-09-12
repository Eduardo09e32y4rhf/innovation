'use client';
import { EmptyState } from '@/app/components/data-states';
import { BarChart, PieChart, Download, FileSpreadsheet } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <header className="page-header items-center">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Analytics</p>
          <h1 className="text-2xl font-black text-slate-950">Relatórios e BI</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Extração de dados estratégicos e dashboards avançados.</p>
        </div>
        <button type="button" className="crystal-button flex items-center gap-2">
          <Download size={14} /> Exportar CSV
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 cursor-pointer hover:border-violet-300 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 mb-4">
            <BarChart size={20} />
          </div>
          <p className="text-sm font-black text-slate-900">Headcount e Demografia</p>
          <p className="text-xs font-medium text-slate-500 mt-1">Evolução do quadro de funcionários</p>
        </div>
        
        <div className="rounded-2xl border border-slate-200 bg-white p-5 cursor-pointer hover:border-violet-300 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 mb-4">
            <PieChart size={20} />
          </div>
          <p className="text-sm font-black text-slate-900">Turnover (Rotatividade)</p>
          <p className="text-xs font-medium text-slate-500 mt-1">Taxas de admissão e desligamento</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 cursor-pointer hover:border-violet-300 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-4">
            <FileSpreadsheet size={20} />
          </div>
          <p className="text-sm font-black text-slate-900">Custos de Folha</p>
          <p className="text-xs font-medium text-slate-500 mt-1">Análise de encargos e benefícios</p>
        </div>
        
        <div className="rounded-2xl border border-slate-200 bg-white p-5 cursor-pointer hover:border-violet-300 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-4">
            <BarChart size={20} />
          </div>
          <p className="text-sm font-black text-slate-900">Metas e Performance</p>
          <p className="text-xs font-medium text-slate-500 mt-1">Desempenho por departamento</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <h3 className="text-lg font-black text-slate-900 mb-6">Preview do Relatório</h3>
        <EmptyState message="Selecione um relatório acima para gerar os gráficos." />
      </div>
    </div>
  );
}
