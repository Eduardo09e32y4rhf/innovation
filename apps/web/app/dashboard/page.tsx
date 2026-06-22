'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Cake, CalendarDays, Clock3, MessageSquareText, TrendingUp, Users } from 'lucide-react';
import { ErrorState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { demoSummary, demoTimeTracks, demoVacations, isLocalPresentation } from '@/app/lib/demo-data';
import { VACATION_STATUS_LABEL, formatMinutes, formatPeriod, formatTime } from '@/app/lib/format';

export default function DashboardHome() {
  return <DashboardContent />;
}

function DashboardContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [presentationMode, setPresentationMode] = useState(false);
  const profile = user?.profile?.toUpperCase();
  const isCommercial = profile === 'COMERCIAL';
  const isFuncionario = profile === 'FUNCIONARIO';
  const isGestor = profile === 'GESTOR';
  const isConsulta = profile === 'CONSULTA';

  useEffect(() => {
    setPresentationMode(isLocalPresentation());
  }, []);

  useEffect(() => {
    if (isCommercial) router.replace('/dashboard/platform');
  }, [isCommercial, router]);

  const summary = useQuery(() => api.dashboard.summary(), [], { enabled: !presentationMode && !isCommercial, pollMs: 60000 });
  const insights = useQuery(() => api.dashboard.insights(), [], { enabled: !presentationMode && !isCommercial, pollMs: 60000 });
  const timeTracks = useQuery(() => api.timeTrack.list(), [], { enabled: !presentationMode && !isCommercial });
  const vacations = useQuery(() => api.vacations.list(), [], { enabled: !presentationMode && !isCommercial && !isFuncionario });
  const employees = useQuery(() => api.employees.list(), [], { enabled: !presentationMode && !isCommercial && !isFuncionario });

  const [dashMonth, setDashMonth] = useState('');
  const [dashDept, setDashDept] = useState('');
  const departments = useMemo(() => [...new Set((employees.data ?? []).map((e) => e.department).filter(Boolean))].sort(), [employees.data]);

  const summaryData = presentationMode ? demoSummary : summary.data;
  const timeTrackData = presentationMode ? demoTimeTracks : (timeTracks.data ?? []);
  const vacationData = presentationMode ? demoVacations : (vacations.data ?? []);
  const insightData = insights.data;
  const alertItems = insightData ? buildAlertItems(insightData.alerts) : [];

  const heroTitle = isFuncionario ? 'Meu painel' : isGestor ? 'Painel da equipe' : isConsulta ? 'Painel de consulta' : 'Painel executivo';
  const heroSubtitle = isFuncionario
    ? 'Seus indicadores pessoais de jornada e ponto.'
    : isGestor
      ? 'Indicadores da sua equipe em tempo real.'
      : 'Indicadores, jornada, ferias e comunicacao reunidos para uma rotina mais clara e rapida.';
  const heroH2 = isFuncionario
    ? 'Sua jornada em tempo real'
    : isGestor
      ? 'Sua equipe em tempo real'
      : 'Sua operação de RH em tempo real';

  const baseMetrics = [
    { label: 'Funcionários ativos', value: summaryData?.activeEmployees, icon: Users, detail: isFuncionario ? 'voce' : 'equipe em acompanhamento' },
    { label: 'Pontos hoje', value: summaryData?.timeTracksToday, icon: Clock3, detail: 'jornadas registradas' },
  ];
  const extraMetrics = isFuncionario ? [] : [
    { label: 'Férias pendentes', value: summaryData?.pendingVacations, icon: CalendarDays, detail: 'aguardando decisao' },
    ...(!isGestor ? [{ label: 'Mensagens', value: summaryData?.whatsappMessages, icon: MessageSquareText, detail: 'conversas centralizadas' }] : []),
  ];
  const bankMetric = { label: 'Banco de horas', value: summaryData ? formatMinutes(summaryData.totalTimeBalance) : undefined, icon: TrendingUp, detail: 'saldo consolidado' };
  const metrics = [...baseMetrics, ...extraMetrics, bankMetric];

  const filteredTimeTracks = useMemo(() => {
    return timeTrackData.filter((row) => {
      if (dashMonth && !row.date.startsWith(dashMonth)) return false;
      if (dashDept && row.employee?.department !== dashDept) return false;
      return true;
    });
  }, [timeTrackData, dashMonth, dashDept]);
  const filteredVacations = useMemo(() => {
    return vacationData.filter((row) => {
      if (dashDept && row.employee?.department !== dashDept) return false;
      return true;
    });
  }, [vacationData, dashDept]);

  const todayRows = filteredTimeTracks.slice(0, 6);
  const vacationRows = filteredVacations.slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="relative overflow-hidden rounded-[18px] border border-slate-200 bg-white px-7 py-7 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
        <div className="absolute right-0 top-0 h-36 w-36 rounded-bl-full bg-teal-100/70" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-700">{heroTitle}</p>
            {presentationMode ? (
              <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-teal-800">
                Apresentacao
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{heroH2}</h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">{heroSubtitle}</p>
        </div>
      </section>

      {!isFuncionario && !isCommercial && (
        <section className="ops-card grid gap-3 rounded-[8px] border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>Mes</span>
            <input type="month" value={dashMonth} onChange={(e) => setDashMonth(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>Departamento</span>
            <select value={dashDept} onChange={(e) => setDashDept(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
              <option value="">Todos</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        </section>
      )}

      {summary.error && !presentationMode ? (
        <ErrorState message={summary.error} onRetry={summary.refetch} />
      ) : (
        <section className={`grid grid-cols-1 gap-4 ${metrics.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-5'}`}>
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

      {!presentationMode && !isCommercial && !isFuncionario && (
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <InsightPanel title="Aniversarios" icon={Cake} loading={insights.loading} empty="Nenhum aniversario em destaque.">
            {(insightData?.birthdaysToday ?? []).map((person) => <InsightLine key={person.id} label={person.name} detail="Hoje" tone="teal" />)}
            {(insightData?.birthdaysThisMonth ?? []).filter((person) => !(insightData?.birthdaysToday ?? []).some((today) => today.id === person.id)).slice(0, 5).map((person) => <InsightLine key={person.id} label={person.name} detail="Este mes" />)}
          </InsightPanel>
          <InsightPanel title="Pendencias" icon={Clock3} loading={insights.loading} empty="Nenhuma pendencia critica.">
            {insightData && insightData.pending.timeTracks > 0 && <InsightLine label={`${insightData.pending.timeTracks} ponto(s) manual(is)`} detail="Aguardando aprovacao" tone="amber" />}
            {insightData && insightData.pending.vacations > 0 && <InsightLine label={`${insightData.pending.vacations} ferias`} detail="Aguardando decisao" tone="amber" />}
            {insightData && <InsightLine label={`${insightData.movements.admissionsThisMonth} admissao(oes)`} detail="Neste m?s" />}
            {insightData && <InsightLine label={`${insightData.movements.terminationsThisMonth} desligamento(s)`} detail="Neste m?s" />}
          </InsightPanel>
          <InsightPanel title="Alertas cadastrais" icon={AlertTriangle} loading={insights.loading} empty="Cadastros sem alerta critico.">
            {alertItems.map((item) => <InsightLine key={item.label} label={item.label} detail={item.detail} tone="rose" />)}
          </InsightPanel>
        </section>
      )}

      <section className={`grid grid-cols-1 gap-5 ${isFuncionario ? '' : 'lg:grid-cols-2'}`}>
        <DataTable title={isFuncionario ? 'Minhas jornadas recentes' : 'Jornadas recentes'} headers={isFuncionario ? ['Data', 'Entrada', 'Saida'] : ['Funcionário', 'Data', 'Entrada', 'Saida']}>
          {timeTracks.loading && !presentationMode && <LoadingRow span={isFuncionario ? 3 : 4} />}
          {timeTracks.error && !presentationMode && <ErrorRow span={isFuncionario ? 3 : 4} message={timeTracks.error} />}
          {!timeTracks.loading && !timeTracks.error && todayRows.length === 0 && (
            <EmptyRow span={isFuncionario ? 3 : 4} message="Nenhum registro encontrado para hoje." />
          )}
          {todayRows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              {!isFuncionario && <td className="py-3 pr-4 text-xs font-semibold text-slate-800">{row.employee?.name ?? '--'}</td>}
              <td className="py-3 pr-4 text-xs text-slate-600">{new Date(row.date).toLocaleDateString('pt-BR')}</td>
              <td className="py-3 pr-4 text-xs font-bold text-slate-950">{formatTime(row.entry)}</td>
              <td className="py-3 text-xs text-slate-600">{formatTime(row.exit)}</td>
            </tr>
          ))}
        </DataTable>

        {!isFuncionario && (
          <DataTable title="Férias e ausências" headers={['Funcionário', 'Período', 'Status']}>
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
        )}
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


function buildAlertItems(alerts: NonNullable<import('@/app/lib/api').DashboardInsights['alerts']>) {
  const items: { label: string; detail: string }[] = [];
  if (alerts.companyIncomplete) items.push({ label: 'Dados da empresa incompletos', detail: 'Revise configuracoes' });
  if (alerts.employeesWithoutCpf > 0) items.push({ label: `${alerts.employeesWithoutCpf} sem CPF`, detail: 'Corrigir cadastro' });
  if (alerts.employeesWithoutUser > 0) items.push({ label: `${alerts.employeesWithoutUser} sem usu?rio`, detail: 'Vincular acesso' });
  if (alerts.employeesWithoutManager > 0) items.push({ label: `${alerts.employeesWithoutManager} sem gestor`, detail: 'Definir lideranca' });
  if (alerts.employeesWithoutWorkScale > 0) items.push({ label: `${alerts.employeesWithoutWorkScale} sem escala`, detail: 'Definir jornada' });
  if (alerts.employeesWithoutWorkload > 0) items.push({ label: `${alerts.employeesWithoutWorkload} sem carga hor?ria`, detail: 'Definir jornada' });
  if (alerts.pendingTimeTracks > 0) items.push({ label: `${alerts.pendingTimeTracks} ponto(s) pendente(s)`, detail: 'Aprovar ajustes' });
  return items;
}

function InsightPanel({ title, icon: Icon, loading, empty, children }: { title: string; icon: React.ElementType; loading: boolean; empty: string; children: React.ReactNode }) {
  const hasChildren = React.Children.count(children) > 0;
  return (
    <div className="ops-card rounded-[10px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-slate-950">{title}</h3>
        <div className="icon-chip icon-chip-teal"><Icon size={15} /></div>
      </div>
      <div className="space-y-2">
        {loading ? <p className="py-4 text-center text-xs text-slate-400">Carregando...</p> : hasChildren ? children : <p className="py-4 text-center text-xs text-slate-400">{empty}</p>}
      </div>
    </div>
  );
}

function InsightLine({ label, detail, tone = 'slate' }: { label: string; detail: string; tone?: 'slate' | 'teal' | 'amber' | 'rose' }) {
  const toneClass = tone === 'teal' ? 'bg-teal-50 text-teal-700 border-teal-100' : tone === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-100' : tone === 'rose' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-50 text-slate-600 border-slate-100';
  return (
    <div className={`flex items-center justify-between gap-3 rounded-[8px] border px-3 py-2 ${toneClass}`}>
      <span className="text-xs font-black">{label}</span>
      <span className="text-[11px] font-semibold opacity-80">{detail}</span>
    </div>
  );
}
