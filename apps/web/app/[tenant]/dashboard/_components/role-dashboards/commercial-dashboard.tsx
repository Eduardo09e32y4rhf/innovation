import React from 'react';

interface CommercialDashboardProps {
  proposalsSent: number;
  salesClosed: number;
  totalCommissions: number;
  recentSales: Array<{ id: string; clientName: string; value: number; date: string }>;
}

export function CommercialDashboard({ proposalsSent, salesClosed, totalCommissions, recentSales }: CommercialDashboardProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Meu Painel (Comercial)</h1>
        <p className="text-slate-500">Acompanhamento de Vendas e Comissões</p>
      </header>

      {/* 4 Indicadores Prioritários */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Propostas Abertas</p>
          <p className="text-3xl font-bold mt-2 text-blue-600">{proposalsSent}</p>
        </div>
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Vendas Fechadas (Mês)</p>
          <p className="text-3xl font-bold mt-2 text-green-600">{salesClosed}</p>
        </div>
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Comissões a Receber</p>
          <p className="text-3xl font-bold mt-2">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCommissions)}
          </p>
        </div>
      </div>

      {/* Vendas Recentes */}
      <section className="bg-white border rounded-xl p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Últimas Vendas</h2>
          <button className="text-sm text-blue-600 font-medium">Ver Histórico</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-sm text-slate-500">
                <th className="py-2 font-medium">Cliente</th>
                <th className="py-2 font-medium">Data</th>
                <th className="py-2 font-medium">Valor Contrato</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map(sale => (
                <tr key={sale.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="py-3 text-sm font-medium">{sale.clientName}</td>
                  <td className="py-3 text-sm text-slate-500">{sale.date}</td>
                  <td className="py-3 text-sm font-medium text-green-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.value)}
                  </td>
                </tr>
              ))}
              {recentSales.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-sm text-slate-500">Nenhuma venda registrada ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
