'use client';

import React from 'react';
import { CalendarDays, Clock3, MessageSquareText, TrendingUp, Users } from 'lucide-react';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { ErrorState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import {
  VACATION_STATUS_LABEL,
  formatMinutes,
  formatPeriod,
  formatTime,
} from '@/app/lib/format';

export default function DashboardHome() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const summary = useQuery(() => api.dashboard.summary(), [], { pollMs: 60000 });
  const timeTracks = useQuery(() => api.timeTrack.list(), []);
  const vacations = useQuery(() => api.vacations.list(), []);

  const metrics = [
    {
      label: 'Funcionarios ativos',
      value: summary.data?.activeEmployees,
      icon: Users,
      detail: 'cadastro atual',
    },
    {
      label: 'Pontos hoje',
      value: summary.data?.timeTracksToday,
      icon: Clock3,
      detail: 'registros do dia',
    },
    {
      label: 'Ferias pendentes',
      value: summary.data?.pendingVacations,
      icon: CalendarDays,
      detail: 'aguardando aprovacao',
    },
    {
      label: 'Mensagens WhatsApp',
      value: summary.data?.whatsappMessages,
      icon: MessageSquareText,
      detail: 'total registrado',
    },
    {
      label: 'Banco de horas total',
      value: summary.data ? formatMinutes(summary.data.totalTimeBalance) : undefined,
      icon: TrendingUp,
      detail: 'saldo consolidado',
    },
  ];

  const todayRows = (timeTracks.data ?? []).slice(0, 6);
  const vacationRows = (vacations.data ?? []).slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="crystal-dark relative overflow-hidden rounded-[18px] px-7 py-7 text-white">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">Dashboard RH</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">MVP vendavel em operacao</h2>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-300">
          Acompanhe funcionarios, ponto, ferias e comunicacao WhatsApp em uma visao unica.
        </p>
      </section>

      {summary.error ? (
        <ErrorState message={summary.error} onRetry={summary.refetch} />
      ) : (
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
                <p className="text-2xl font-black text-slate-950">
                  {summary.loading && metric.value === undefined ? '—' : metric.value ?? '0'}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">{metric.detail}</p>
              </div>
            );
          })}
        </section>
      )}

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DataTable title="Ponto recente" headers={['Funcionario', 'Data', 'Entrada', 'Saida']}>
          {timeTracks.loading && <LoadingRow span={4} />}
          {timeTracks.error && <ErrorRow span={4} message={timeTracks.error} />}
          {!timeTracks.loading && !timeTracks.error && todayRows.length === 0 && (
            <EmptyRow span={4} message="Nenhum registro de ponto ainda." />
          )}
          {todayRows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="py-3 pr-4 text-xs text-slate-700">{row.employee?.name ?? '—'}</td>
              <td className="py-3 pr-4 text-xs text-slate-700">{formatTime(row.entry) === '—' ? '—' : new Date(row.date).toLocaleDateString('pt-BR')}</td>
              <td className="py-3 pr-4 text-xs font-medium text-slate-950">{formatTime(row.entry)}</td>
              <td className="py-3 text-xs text-slate-700">{formatTime(row.exit)}</td>
            </tr>
          ))}
        </DataTable>

        <DataTable title="Ferias" headers={['Funcionario', 'Periodo', 'Status']}>
          {vacations.loading && <LoadingRow span={3} />}
          {vacations.error && <ErrorRow span={3} message={vacations.error} />}
          {!vacations.loading && !vacations.error && vacationRows.length === 0 && (
            <EmptyRow span={3} message="Nenhuma solicitacao de ferias." />
          )}
          {vacationRows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="py-3 pr-4 text-xs text-slate-700">{row.employee?.name ?? '—'}</td>
              <td className="py-3 pr-4 text-xs text-slate-700">{formatPeriod(row.startDate, row.endDate)}</td>
              <td className="py-3 text-xs text-slate-700">{VACATION_STATUS_LABEL[row.status] ?? row.status}</td>
            </tr>
          ))}
        </DataTable>
      </section>
    </div>
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

function LoadingRow({ span }: { span: number }) {
  return (
    <tr className="border-t border-slate-100">
      <td colSpan={span} className="py-6 text-center text-xs text-slate-400">Carregando...</td>
    </tr>
  );
}
function ErrorRow({ span, message }: { span: number; message: string }) {
  return (
    <tr className="border-t border-slate-100">
      <td colSpan={span} className="py-6 text-center text-xs text-rose-600">{message}</td>
    </tr>
  );
}
function EmptyRow({ span, message }: { span: number; message: string }) {
  return (
    <tr className="border-t border-slate-100">
      <td colSpan={span} className="py-6 text-center text-xs text-slate-400">{message}</td>
    </tr>
  );
}
