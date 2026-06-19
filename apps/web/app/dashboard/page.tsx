'use client';

import React, { useEffect, useState } from 'react';
import { CalendarDays, Clock3, MessageSquareText, TrendingUp, Users } from 'lucide-react';
import { ErrorState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { demoSummary, demoTimeTracks, demoVacations, isLocalPresentation } from '@/app/lib/demo-data';
import { VACATION_STATUS_LABEL, formatMinutes, formatPeriod, formatTime } from '@/app/lib/format';

export default function DashboardHome() {
  return <DashboardContent />;
}

function DashboardContent() {
  const [presentationMode, setPresentationMode] = useState(false);

  useEffect(() => {
    setPresentationMode(isLocalPresentation());
  }, []);

  const summary = useQuery(() => api.dashboard.summary(), [], { enabled: !presentationMode, pollMs: 60000 });
  const timeTracks = useQuery(() => api.timeTrack.list(), [], { enabled: !presentationMode });
  const vacations = useQuery(() => api.vacations.list(), [], { enabled: !presentationMode });

  const summaryData = presentationMode ? demoSummary : summary.data;
  const timeTrackData = presentationMode ? demoTimeTracks : (timeTracks.data ?? []);
  const vacationData = presentationMode ? demoVacations : (vacations.data ?? []);

  const metrics = [
    {
      label: 'Funcionarios ativos',
      value: summaryData?.activeEmployees,
      icon: Users,
      detail: 'equipe em acompanhamento',
    },
    {
      label: 'Pontos hoje',
      value: summaryData?.timeTracksToday,
      icon: Clock3,
      detail: 'jornadas registradas',
    },
    {
      label: 'Ferias pendentes',
      value: summaryData?.pendingVacations,
      icon: CalendarDays,
      detail: 'aguardando decisao',
    },
    {
      label: 'Mensagens',
      value: summaryData?.whatsappMessages,
      icon: MessageSquareText,
      detail: 'conversas centralizadas',
    },
    {
      label: 'Banco de horas',
      value: summaryData ? formatMinutes(summaryData.totalTimeBalance) : undefined,
      icon: TrendingUp,
      detail: 'saldo consolidado',
    },
  ];

  const todayRows = timeTrackData.slice(0, 6);
  const vacationRows = vacationData.slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="relative overflow-hidden rounded-[18px] border border-slate-200 bg-white px-7 py-7 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
        <div className="absolute right-0 top-0 h-36 w-36 rounded-bl-full bg-teal-100/70" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-700">Painel executivo</p>
            {presentationMode ? (
              <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-teal-800">
                Apresentacao
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Sua operacao de RH em tempo real</h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            Indicadores, jornada, ferias e comunicacao reunidos para uma rotina mais clara e rapida.
          </p>
        </div>
      </section>

      {summary.error && !presentationMode ? (
        <ErrorState message={summary.error} onRetry={summary.refetch} />
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="ops-card rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-slate-500">{metric.label}</p>
                  <div className="icon-chip icon-chip-teal">
                    <Icon size={15} strokeWidth={1.8} />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-950">
                  {summary.loading && metric.value === undefined ? '--' : metric.value ?? '0'}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">{metric.detail}</p>
              </div>
            );
          })}
        </section>
      )}

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DataTable title="Jornadas recentes" headers={['Funcionario', 'Data', 'Entrada', 'Saida']}>
          {timeTracks.loading && !presentationMode && <LoadingRow span={4} />}
          {timeTracks.error && !presentationMode && <ErrorRow span={4} message={timeTracks.error} />}
          {!timeTracks.loading && !timeTracks.error && todayRows.length === 0 && (
            <EmptyRow span={4} message="Nenhum registro encontrado para hoje." />
          )}
          {todayRows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="py-3 pr-4 text-xs font-semibold text-slate-800">{row.employee?.name ?? '--'}</td>
              <td className="py-3 pr-4 text-xs text-slate-600">{new Date(row.date).toLocaleDateString('pt-BR')}</td>
              <td className="py-3 pr-4 text-xs font-bold text-slate-950">{formatTime(row.entry)}</td>
              <td className="py-3 text-xs text-slate-600">{formatTime(row.exit)}</td>
            </tr>
          ))}
        </DataTable>

        <DataTable title="Ferias e ausencias" headers={['Funcionario', 'Periodo', 'Status']}>
          {vacations.loading && !presentationMode && <LoadingRow span={3} />}
          {vacations.error && !presentationMode && <ErrorRow span={3} message={vacations.error} />}
          {!vacations.loading && !vacations.error && vacationRows.length === 0 && (
            <EmptyRow span={3} message="Nenhuma solicitacao em aberto." />
          )}
          {vacationRows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="py-3 pr-4 text-xs font-semibold text-slate-800">{row.employee?.name ?? '--'}</td>
              <td className="py-3 pr-4 text-xs text-slate-600">{formatPeriod(row.startDate, row.endDate)}</td>
              <td className="py-3 text-xs font-bold text-slate-700">{VACATION_STATUS_LABEL[row.status] ?? row.status}</td>
            </tr>
          ))}
        </DataTable>
      </section>
    </div>
  );
}

function DataTable({ title, headers, children }: { title: string; headers: string[]; children: React.ReactNode }) {
  return (
    <div className="ops-card overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-black text-slate-950">{title}</h3>
      </div>
      <div className="overflow-x-auto px-5 py-4">
        <table className="w-full min-w-[420px] text-left">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} className="pb-3 pr-4 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
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
      <td colSpan={span} className="py-6 text-center text-xs font-semibold text-amber-700">{message}</td>
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
