'use client';

import React from 'react';
import { CalendarDays, Clock3, MessageSquareText, TrendingUp, Users } from 'lucide-react';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';

const metrics = [
  { label: 'Funcionarios ativos', value: '48', icon: Users, detail: '+3 neste mes' },
  { label: 'Pontos hoje', value: '37', icon: Clock3, detail: '77% da equipe' },
  { label: 'Ferias pendentes', value: '6', icon: CalendarDays, detail: '2 para aprovar' },
  { label: 'Mensagens WhatsApp', value: '124', icon: MessageSquareText, detail: '18 nao lidas' },
  { label: 'Banco de horas total', value: '+86h', icon: TrendingUp, detail: 'saldo consolidado' },
];

const todayRows = [
  { name: 'Ana Lima', event: 'Entrada registrada', time: '08:03', status: 'Regular' },
  { name: 'Bruno Rocha', event: 'Retorno almoco', time: '13:11', status: 'Regular' },
  { name: 'Carla Mendes', event: 'Pendente saida', time: '17:45', status: 'Acompanhar' },
];

const vacationRows = [
  { name: 'Diego Alves', period: '01/07 a 15/07', status: 'Pendente' },
  { name: 'Fernanda Costa', period: '10/08 a 24/08', status: 'Aprovada' },
  { name: 'Marina Souza', period: '05/09 a 14/09', status: 'Pendente' },
];

export default function DashboardHome() {
  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="crystal-dark relative overflow-hidden rounded-[18px] px-7 py-7 text-white">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">Dashboard RH</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">MVP vendavel em operacao</h2>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-300">
            Acompanhe funcionarios, ponto, ferias e comunicacao WhatsApp em uma visao unica.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="ops-card rounded-[8px] border border-slate-200 bg-white p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-slate-500">{metric.label}</p>
                  <div className="icon-chip icon-chip-teal">
                    <Icon size={15} strokeWidth={1.8} />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-950">{metric.value}</p>
                <p className="mt-1 text-[11px] text-slate-500">{metric.detail}</p>
              </div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <DataTable title="Ponto de hoje" headers={['Funcionario', 'Evento', 'Horario', 'Status']}>
            {todayRows.map((row) => (
              <tr key={row.name} className="border-t border-slate-100">
                <td className="py-3 pr-4 text-xs text-slate-700">{row.name}</td>
                <td className="py-3 pr-4 text-xs text-slate-700">{row.event}</td>
                <td className="py-3 pr-4 text-xs font-medium text-slate-950">{row.time}</td>
                <td className="py-3 text-xs text-slate-700">{row.status}</td>
              </tr>
            ))}
          </DataTable>

          <DataTable title="Ferias em andamento" headers={['Funcionario', 'Periodo', 'Status']}>
            {vacationRows.map((row) => (
              <tr key={row.name} className="border-t border-slate-100">
                <td className="py-3 pr-4 text-xs text-slate-700">{row.name}</td>
                <td className="py-3 pr-4 text-xs text-slate-700">{row.period}</td>
                <td className="py-3 text-xs text-slate-700">{row.status}</td>
              </tr>
            ))}
          </DataTable>
        </section>
      </div>
    </ProtectedRoute>
  );
}

function DataTable({ title, headers, children }: { title: string; headers: string[]; children: React.ReactNode }) {
  return (
    <div className="ops-card overflow-hidden rounded-[8px] border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-black text-slate-950">{title}</h3>
      </div>
      <div className="overflow-x-auto px-5 py-4">
        <table className="w-full min-w-[420px] text-left">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} className="pb-3 pr-4 text-[11px] font-medium text-slate-500">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
