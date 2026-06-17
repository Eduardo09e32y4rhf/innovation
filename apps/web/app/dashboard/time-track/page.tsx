'use client';

import { Clock3, Edit3 } from 'lucide-react';

const rows = [
  { employee: 'Ana Lima', date: '17/06/2026', entry: '08:03', lunch: '12:01 - 13:02', exit: '17:09', balance: '+6 min' },
  { employee: 'Bruno Rocha', date: '17/06/2026', entry: '08:12', lunch: '12:20 - 13:10', exit: '17:00', balance: '-2 min' },
  { employee: 'Carla Mendes', date: '17/06/2026', entry: '08:00', lunch: '12:00 - 13:00', exit: 'Pendente', balance: 'Aberto' },
];

export default function TimeTrackPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Controle de ponto</p>
          <h2 className="text-2xl font-black text-slate-950">Registros do mes</h2>
        </div>
        <button className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white">
          <Clock3 size={14} />
          Registrar ponto
        </button>
      </header>

      <section className="ops-card overflow-hidden rounded-[8px] border border-slate-200 bg-white">
        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="text-[11px] font-medium text-slate-500">
                <th className="pb-3 pr-4">Funcionario</th>
                <th className="pb-3 pr-4">Data</th>
                <th className="pb-3 pr-4">Entrada</th>
                <th className="pb-3 pr-4">Almoco</th>
                <th className="pb-3 pr-4">Saida</th>
                <th className="pb-3 pr-4">Saldo</th>
                <th className="pb-3">Correcao</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.employee}-${row.date}`} className="border-t border-slate-100 text-xs text-slate-700">
                  <td className="py-3 pr-4 font-medium text-slate-950">{row.employee}</td>
                  <td className="py-3 pr-4">{row.date}</td>
                  <td className="py-3 pr-4">{row.entry}</td>
                  <td className="py-3 pr-4">{row.lunch}</td>
                  <td className="py-3 pr-4">{row.exit}</td>
                  <td className="py-3 pr-4">{row.balance}</td>
                  <td className="py-3"><button className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px]"><Edit3 size={12} />RH/Admin</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
