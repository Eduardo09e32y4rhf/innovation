'use client';

import { Check, Plus, X } from 'lucide-react';

const requests = [
  { employee: 'Diego Alves', period: '01/07/2026 a 15/07/2026', days: 15, status: 'PENDING' },
  { employee: 'Fernanda Costa', period: '10/08/2026 a 24/08/2026', days: 15, status: 'APPROVED' },
  { employee: 'Marina Souza', period: '05/09/2026 a 14/09/2026', days: 10, status: 'PENDING' },
];

export default function VacationsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Ferias</p>
          <h2 className="text-2xl font-black text-slate-950">Solicitacoes</h2>
        </div>
        <button className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white">
          <Plus size={14} />
          Nova solicitacao
        </button>
      </header>

      <section className="ops-card overflow-hidden rounded-[8px] border border-slate-200 bg-white">
        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr className="text-[11px] font-medium text-slate-500">
                <th className="pb-3 pr-4">Funcionario</th>
                <th className="pb-3 pr-4">Periodo</th>
                <th className="pb-3 pr-4">Dias</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Aprovacao</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((row) => (
                <tr key={`${row.employee}-${row.period}`} className="border-t border-slate-100 text-xs text-slate-700">
                  <td className="py-3 pr-4 font-medium text-slate-950">{row.employee}</td>
                  <td className="py-3 pr-4">{row.period}</td>
                  <td className="py-3 pr-4">{row.days}</td>
                  <td className="py-3 pr-4">{row.status}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px]"><Check size={12} />Aprovar</button>
                      <button className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px]"><X size={12} />Rejeitar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
