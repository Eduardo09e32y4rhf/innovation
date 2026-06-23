'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowUpRight, Cake, CalendarDays, Clock3, MessageSquareText, TrendingUp, Users } from 'lucide-react';
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
    { label: 'Funcionários ativos', value: summaryData?.activeEmployees, icon: Users, detail: isFuncionario ? 'voce' : 'equipe em acompanhamento', trend: '+12%' },
    { label: 'Pontos hoje', value: summaryData?.timeTracksToday, icon: Clock3, detail: 'jornadas registradas', trend: '+5%' },
  ];
  const extraMetrics = isFuncionario ? [] : [
    { label: 'Férias pendentes', value: summaryData?.pendingVacations, icon: CalendarDays, detail: 'aguardando decisao', trend: '-3%' },
    ...(!isGestor ? [{ label: 'Mensagens', value: summaryData?.whatsappMessages, icon: MessageSquareText, detail: 'conversas centralizadas', trend: '+8%' }] : []),
  ];
  const bankMetric = { label: 'Banco de horas', value: summaryData ? formatMinutes(summaryData.totalTimeBalance) : undefined, icon: TrendingUp, detail: 'saldo consolidado', trend: '+2h' };
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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Premium Hero Section */}
      <section className="group relative overflow-hidden rounded-[24px] border border-slate-200/60 bg-gradient-to-br from-white via-slate-50/30 to-teal-50/20 p-8 shadow-[0_20px_70px_-15px_rgba(15,23,42,0.12)] transition-all duration-500 hover:shadow-[0_25px_80px_-15px_rgba(15,23,42,0.18)] lg:p-10">
        {/* Decorative Elements */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-teal-100/40 to-cyan-100/30 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-gradient-to-tr from-blue-100/30 to-teal-100/20 blur-2xl" />
        
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/60 bg-gradient-to-r from-teal-50 to-cyan-50 px-4 py-1.5 shadow-sm">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-700">{heroTitle}</p>
            </div>
            {presentationMode && (
              <span className="rounded-full border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-800 shadow-sm">
                Apresentacao
              </span>
            )}
          </div>
          <h1 className="mt-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-4xl font-black tracking-tight text-transparent lg:text-5xl">
            {heroH2}
          </h1>
          <p className="mt-3 max-w-3xl text-base font-semibold leading-relaxed text-slate-600">{heroSubtitle}</p>
        </div>
      </section>

      {/* Filters Section */}
      {!isFuncionario && !isCommercial && (
        <section className="grid gap-4 rounded-[16px] border border-slate-200/60 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:grid-cols-2">
          <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Mes</span>
            <input 
              type="month" 
              value={dashMonth} 
              onChange={(e) => setDashMonth(e.target.value)} 
              className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" 
            />
          </label>
          <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Departamento</span>
            <select 
              value={dashDept} 
              onChange={(e) => setDashDept(e.target.value)} 
              className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            >
              <option value="">Todos</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        </section>
      )}

      {/* Metrics Grid */}
      {summary.error && !presentationMode ? (
        <ErrorState message={summary.error} onRetry={summary.refetch} />
      ) : (
        <section className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${metrics.length <= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-5'}`}>
          {metrics.map((metric, idx) => {
            const Icon = metric.icon;
            return (
              <div 
                key={metric.label} 
                className="group relative overflow-hidden rounded-[18px] border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/30 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(15,23,42,0.15)]"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/0 to-cyan-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-5" />
                
                <div className="relative">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">{metric.label}</p>
                    <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/25 transition-transform duration-300 group-hover:scale-110">
                      <Icon size={18} strokeWidth={2.5} className="text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-3xl font-black tracking-tight text-slate-950">
                      {summary.loading && metric.value === undefined ? '--' : metric.value ?? '0'}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-slate-500">{metric.detail}</p>
                      {metric.trend && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600">
                          <ArrowUpRight size={12} strokeWidth={3} />
                          {metric.trend}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Insights Panels */}
      {!presentationMode && !isCommercial && !isFuncionario && (
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <InsightPanel title="Aniversarios" icon={Cake} loading={insights.loading} empty="Nenhum aniversario em destaque.">
            {(insightData?.birthdaysToday ?? []).map((person) => <InsightLine key={person.id} label={person.name} detail="Hoje" tone="teal" />)}
            {(insightData?.birthdaysThisMonth ?? []).filter((person) => !(insightData?.birthdaysToday ?? []).some((today) => today.id === person.id)).slice(0, 5).map((person) => <InsightLine key={person.id} label={person.name} detail="Este mes" />)}
          </InsightPanel>
          <InsightPanel title="Pendencias" icon={Clock3} loading={insights.loading} empty="Nenhuma pendencia critica.">
            {insightData && insightData.pending.timeTracks > 0 && <InsightLine label={`${insightData.pending.timeTracks} ponto(s) manual(is)`} detail="Aguardando aprovacao" tone="amber" />}
            {insightData && insightData.pending.vacations > 0 && <InsightLine label={`${insightData.pending.vacations} ferias`} detail="Aguardando decisao" tone="amber" />}
            {insightData && <InsightLine label={`${insightData.movements.admissionsThisMonth} admissao(oes)`} detail="Neste mês" />}
            {insightData && <InsightLine label={`${insightData.movements.terminationsThisMonth} desligamento(s)`} detail="Neste mês" />}
          </InsightPanel>
          <InsightPanel title="Alertas cadastrais" icon={AlertTriangle} loading={insights.loading} empty="Cadastros sem alerta critico.">
            {alertItems.map((item) => <InsightLine key={item.label} label={item.label} detail={item.detail} tone="rose" />)}
          </InsightPanel>
        </section>
      )}

      {/* Data Tables */}
      <section className={`grid grid-cols-1 gap-5 ${isFuncionario ? '' : 'lg:grid-cols-2'}`}>
        <DataTable title={isFuncionario ? 'Minhas jornadas recentes' : 'Jornadas recentes'} headers={isFuncionario ? ['Data', 'Entrada', 'Saida'] : ['Funcionário', 'Data', 'Entrada', 'Saida']}>
          {timeTracks.loading && !presentationMode && <LoadingRow span={isFuncionario ? 3 : 4} />}
          {timeTracks.error && !presentationMode && <ErrorRow span={isFuncionario ? 3 : 4} message={timeTracks.error} />}
          {!timeTracks.loading && !timeTracks.error && todayRows.length === 0 && (
            <EmptyRow span={isFuncionario ? 3 : 4} message="Nenhum registro encontrado para hoje." />
          )}
          {todayRows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
              {!isFuncionario && <td className="py-4 pr-4 text-xs font-bold text-slate-900">{row.employee?.name ?? '--'}</td>}
              <td className="py-4 pr-4 text-xs font-semibold text-slate-600">{new Date(row.date).toLocaleDateString('pt-BR')}</td>
              <td className="py-4 pr-4 text-xs font-black text-slate-950">{formatTime(row.entry)}</td>
              <td className="py-4 text-xs font-semibold text-slate-600">{formatTime(row.exit)}</td>
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
              <tr key={row.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
                <td className="py-4 pr-4 text-xs font-bold text-slate-900">{row.employee?.name ?? '--'}</td>
                <td className="py-4 pr-4 text-xs font-semibold text-slate-600">{formatPeriod(row.startDate, row.endDate)}</td>
                <td className="py-4 text-xs font-black text-slate-700">{VACATION_STATUS_LABEL[row.status] ?? row.status}</td>
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
    <div className="group overflow-hidden rounded-[18px] border border-slate-200/60 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-950">{title}</h3>
      </div>
      <div className="overflow-x-auto px-6 py-4">
        <table className="w-full min-w-[420px] text-left">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} className="pb-4 pr-4 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
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
      <td colSpan={span} className="py-8 text-center text-xs font-semibold text-slate-400">
        <div className="flex items-center justify-center gap-2">
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-500" style={{ animationDelay: '0ms' }} />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-500" style={{ animationDelay: '150ms' }} />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-500" style={{ animationDelay: '300ms' }} />
        </div>
      </td>
    </tr>
  );
}

function ErrorRow({ span, message }: { span: number; message: string }) {
  return (
    <tr className="border-t border-slate-100">
      <td colSpan={span} className="py-6 text-center text-xs font-bold text-amber-700">{message}</td>
    </tr>
  );
}

function EmptyRow({ span, message }: { span: number; message: string }) {
  return (
    <tr className="border-t border-slate-100">
      <td colSpan={span} className="py-6 text-center text-xs font-semibold text-slate-400">{message}</td>
    </tr>
  );
}

function buildAlertItems(alerts: NonNullable<import('@/app/lib/api').DashboardInsights['alerts']>) {
  const items: { label: string; detail: string }[] = [];
  if (alerts.companyIncomplete) items.push({ label: 'Dados da empresa incompletos', detail: 'Revise configuracoes' });
  if (alerts.employeesWithoutCpf > 0) items.push({ label: `${alerts.employeesWithoutCpf} sem CPF`, detail: 'Corrigir cadastro' });
  if (alerts.employeesWithoutUser > 0) items.push({ label: `${alerts.employeesWithoutUser} sem usuário`, detail: 'Vincular acesso' });
  if (alerts.employeesWithoutManager > 0) items.push({ label: `${alerts.employeesWithoutManager} sem gestor`, detail: 'Definir lideranca' });
  if (alerts.employeesWithoutWorkScale > 0) items.push({ label: `${alerts.employeesWithoutWorkScale} sem escala`, detail: 'Definir jornada' });
  if (alerts.employeesWithoutWorkload > 0) items.push({ label: `${alerts.employeesWithoutWorkload} sem carga horária`, detail: 'Definir jornada' });
  if (alerts.pendingTimeTracks > 0) items.push({ label: `${alerts.pendingTimeTracks} ponto(s) pendente(s)`, detail: 'Aprovar ajustes' });
  return items;
}

function InsightPanel({ title, icon: Icon, loading, empty, children }: { title: string; icon: React.ElementType; loading: boolean; empty: string; children: React.ReactNode }) {
  const hasChildren = React.Children.count(children) > 0;
  return (
    <div className="group overflow-hidden rounded-[18px] border border-slate-200/60 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.08)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-950">{title}</h3>
        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/20">
          <Icon size={16} strokeWidth={2.5} className="text-white" />
        </div>
      </div>
      <div className="space-y-2.5">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="flex gap-1.5">
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-500" style={{ animationDelay: '0ms' }} />
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-500" style={{ animationDelay: '150ms' }} />
              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-500" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : hasChildren ? children : <p className="py-6 text-center text-xs font-semibold text-slate-400">{empty}</p>}
      </div>
    </div>
  );
}

function InsightLine({ label, detail, tone = 'slate' }: { label: string; detail: string; tone?: 'slate' | 'teal' | 'amber' | 'rose' }) {
  const toneClass = tone === 'teal' 
    ? 'bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 border-teal-200/60' 
    : tone === 'amber' 
    ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200/60' 
    : tone === 'rose' 
    ? 'bg-gradient-to-r from-rose-50 to-pink-50 text-rose-700 border-rose-200/60' 
    : 'bg-gradient-to-r from-slate-50 to-gray-50 text-slate-600 border-slate-200/60';
  
  return (
    <div className={`flex items-center justify-between gap-3 rounded-[10px] border px-4 py-2.5 shadow-sm transition-all hover:shadow-md ${toneClass}`}>
      <span className="text-xs font-black">{label}</span>
      <span className="text-[11px] font-bold opacity-80">{detail}</span>
    </div>
  );
}
