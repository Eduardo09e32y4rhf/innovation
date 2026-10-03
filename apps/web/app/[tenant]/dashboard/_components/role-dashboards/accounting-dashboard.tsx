import React from 'react';

interface AccountingDashboardProps {
  openPayrolls: number;
  pendingAdjustments: number;
  supportTickets: number;
  payrollDeadlines: Array<{ id: string; companyName: string; deadline: string }>;
}

export function AccountingDashboard({ openPayrolls, pendingAdjustments, supportTickets, payrollDeadlines }: AccountingDashboardProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Visão Contábil</h1>
        <p className="text-slate-500">Gestão de folhas, ajustes e chamados</p>
      </header>

      {/* 4 Indicadores Prioritários */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Folhas em Processamento</p>
          <p className="text-3xl font-bold mt-2 text-blue-600">{openPayrolls}</p>
        </div>
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Ajustes Pendentes (Correções)</p>
          <p className="text-3xl font-bold mt-2 text-yellow-600">{pendingAdjustments}</p>
        </div>
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Chamados em Aberto</p>
          <p className="text-3xl font-bold mt-2 text-red-600">{supportTickets}</p>
        </div>
      </div>

      {/* Requer Atenção */}
      <section className="bg-white border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 text-slate-900">Prazos e Fechamentos</h2>
        {payrollDeadlines.length === 0 ? (
          <p className="text-slate-500 text-sm">Nenhuma folha crítica próxima do vencimento.</p>
        ) : (
          <ul className="space-y-3">
            {payrollDeadlines.map(item => (
              <li key={item.id} className="p-3 bg-red-50 text-red-900 border border-red-100 rounded-lg flex items-center justify-between">
                <span className="font-medium text-sm">Empresa: {item.companyName}</span>
                <span className="text-sm font-bold">Vence em: {item.deadline}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
