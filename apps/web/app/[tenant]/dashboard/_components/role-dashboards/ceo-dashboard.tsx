import React from 'react';

interface CeoDashboardProps {
  totalCompanies: number;
  activeSubscriptions: number;
  mrr: number; // Monthly Recurring Revenue
  alerts: Array<{ id: string; message: string; severity: 'high' | 'medium' }>;
}

export function CeoDashboard({ totalCompanies, activeSubscriptions, mrr, alerts }: CeoDashboardProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Visão Global (CEO/DEV)</h1>
        <p className="text-slate-500">Resumo financeiro e operacional da plataforma</p>
      </header>

      {/* 4 Indicadores Prioritários */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total de Empresas</p>
          <p className="text-3xl font-bold mt-2">{totalCompanies}</p>
        </div>
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Assinaturas Ativas</p>
          <p className="text-3xl font-bold mt-2 text-green-600">{activeSubscriptions}</p>
        </div>
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Receita Recorrente (MRR)</p>
          <p className="text-3xl font-bold mt-2">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mrr)}
          </p>
        </div>
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Inadimplência</p>
          <p className="text-3xl font-bold mt-2 text-red-600">
            {totalCompanies > 0 ? (((totalCompanies - activeSubscriptions) / totalCompanies) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* Requer Atenção */}
      <section className="bg-white border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 text-slate-900">Requer Atenção</h2>
        {alerts.length === 0 ? (
          <p className="text-slate-500 text-sm">Nenhum alerta crítico no momento.</p>
        ) : (
          <ul className="space-y-3">
            {alerts.map(alert => (
              <li key={alert.id} className={`p-3 rounded-lg flex items-center gap-3 ${alert.severity === 'high' ? 'bg-red-50 text-red-900 border border-red-100' : 'bg-yellow-50 text-yellow-900 border border-yellow-100'}`}>
                <span className="font-medium text-sm">{alert.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
