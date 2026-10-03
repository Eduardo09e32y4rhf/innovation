import React from 'react';

interface HrDashboardProps {
  activeEmployees: number;
  pendingPunches: number; // Marcações de ponto pendentes
  upcomingVacations: number;
  alerts: Array<{ id: string; message: string; type: 'warning' | 'info' }>;
}

export function HrDashboard({ activeEmployees, pendingPunches, upcomingVacations, alerts }: HrDashboardProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Recursos Humanos (RH)</h1>
        <p className="text-slate-500">Pessoas, ponto e pendências trabalhistas</p>
      </header>

      {/* 4 Indicadores Prioritários */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Colaboradores Ativos</p>
          <p className="text-3xl font-bold mt-2">{activeEmployees}</p>
        </div>
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Ajustes de Ponto</p>
          <p className="text-3xl font-bold mt-2 text-yellow-600">{pendingPunches}</p>
        </div>
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Férias Próximas</p>
          <p className="text-3xl font-bold mt-2 text-blue-600">{upcomingVacations}</p>
        </div>
      </div>

      {/* Pendências */}
      <section className="bg-white border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 text-slate-900">Pendências e Alertas</h2>
        {alerts.length === 0 ? (
          <p className="text-slate-500 text-sm">Tudo certo por aqui!</p>
        ) : (
          <ul className="space-y-3">
            {alerts.map(alert => (
              <li key={alert.id} className={`p-3 rounded-lg flex items-center gap-3 ${alert.type === 'warning' ? 'bg-yellow-50 border-yellow-100 text-yellow-900' : 'bg-blue-50 border-blue-100 text-blue-900'} border`}>
                <span className="font-medium text-sm">{alert.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
