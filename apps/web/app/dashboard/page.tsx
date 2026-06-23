'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, Cake, CalendarDays, Clock3, MessageSquareText, TrendingUp, Users, UserPlus, FileText, Download, AlertCircle, CheckCircle, XCircle, UserMinus, UserX } from 'lucide-react';
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
  const isRh = profile === 'RH' || profile === 'ADMIN' || profile === 'DEV';

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

  // Compute real indicators
  const pendingTimeTracks = (timeTrackData ?? []).filter(t => t.manualStatus === 'pending').length;
  const pendingVacations = (vacationData ?? []).filter(v => v.status === 'PENDING').length;
  const employeesNoManager = (employees.data ?? []).filter(e => !e.managerId).length;
  const employeesNoAccess = (employees.data ?? []).filter(e => !e.userId).length;
  const admissionsThisMonth = insightData?.movements.admissionsThisMonth ?? 0;
  const terminationsThisMonth = insightData?.movements.terminationsThisMonth ?? 0;

  const heroTitle = isFuncionario ? 'Meu painel' : isGestor ? 'Painel da equipe' : isConsulta ? 'Painel de consulta' : 'Painel executivo';
  const heroH2 = isFuncionario
    ? 'Sua jornada em tempo real'
    : isGestor
      ? 'Sua equipe em tempo real'
      : 'Sua operação de RH em tempo real';

  // Action shortcuts
  const actionShortcuts = isFuncionario ? [] : [
    { label: 'Novo funcionário', href: '/dashboard/employees/new', icon: UserPlus, color: 'teal' },
    { label: 'Lançar ponto', href: '/dashboard/time-track', icon: Clock3, color: 'indigo' },
    { label: 'Nova solicitação', href: '#', icon: CalendarDays, color: 'emerald', onClick: () => {} },
    { label: 'Exportar folha', href: '/dashboard/time-track', icon: Download, color: 'amber' },
  ];

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

  const todayRows = filteredTimeTracks.slice(0, 5);
  const vacationRows = filteredVacations.slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Premium Hero Section */}
      <section className="group relative overflow-hidden rounded-[24px] border border-slate-200/60 bg-gradient-to-br from-white via-slate-50/30 to-teal-50/20 p-6 shadow-[0_20px_70px_-15px_rgba(15,23,42,0.12)] transition-all duration-500 hover:shadow-[0_25px_80px_-15px_rgba(15,23,42,0.18)] sm:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-teal-100/40 to-cyan-100/30 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-gradient-to-tr from-blue-100/30 to-teal-100/20 blur-2xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/60 bg-gradient-to-r from-teal-50 to-cyan-50 px-4 py-1.5 shadow-sm">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-700">{heroTitle}</p>
            </div>
            {presentationMode && (
              <span className="rounded-full border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-800 shadow-sm">Apresentacao</span>
            )}
          </div>
          <h1 className="mt-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-3xl font-black tracking-tight text-transparent lg:text-4xl">{heroH2}</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">{isFuncionario ? 'Seus indicadores pessoais de jornada e ponto.' : isGestor ? 'Indicadores da sua equipe em tempo real.' : 'Visão completa da operação de RH.'}</p>
        </div>
      </section>

      {/* Action Shortcuts */}
      {!isFuncionario && !isCommercial && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {actionShortcuts.map((action) => {
            const Icon = action.icon;
            const colorMap: Record<string, string> = {
              teal: 'from-teal-500 to-cyan-600 shadow-teal-500/25 hover:shadow-teal-500/30',
              indigo: 'from-indigo-500 to-violet-600 shadow-indigo-500/25 hover:shadow-indigo-500/30',
              emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/25 hover:shadow-emerald-500/30',
              amber: 'from-amber-500 to-orange-600 shadow-amber-500/25 hover:shadow-amber-500/30',
            };
            return action.onClick ? (
              <button key={action.label} type="button" onClick={action.onClick} className={`flex items-center gap-3 rounded-[14px] bg-gradient-to-r ${colorMap[action.color]} p-4 text-xs font-black text-white shadow-lg transition-all duration-200 hover:shadow-xl active:scale-[0.98]`}>
                <Icon size={18} strokeWidth={2.5} className="shrink-0" />
                <span className="leading-tight">{action.label}</span>
              </button>
            ) : (
              <Link key={action.label} href={action.href} className={`flex items-center gap-3 rounded-[14px] bg-gradient-to-r ${colorMap[action.color]} p-4 text-xs font-black text-white shadow-lg transition-all duration-200 hover:shadow-xl active:scale-[0.98]`}>
                <Icon size={18} strokeWidth={2.5} className="shrink-0" />
                <span className="leading-tight">{action.label}</span>
              </Link>
            );
          })}
        </section>
      )}

      {/* Filters */}
      {!isFuncionario && !isCommercial && (
        <section className="grid gap-4 rounded-[16px] border border-slate-200/60 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:grid-cols-2">
          <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Mês</span>
            <input type="month" value={dashMonth} onChange={(e) => setDashMonth(e.target.value)} className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10" />
          </label>
          <label className="space-y-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Departamento</span>
            <select value={dashDept} onChange={(e) => setDashDept(e.target.value)} className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10">
              <option value="">Todos</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        </section>
      )}

      {/* Real Indicators Grid */}
      {summary.error && !presentationMode ? (
        <ErrorState message={summary.error} onRetry={summary.refetch} />
      ) : (
        <>
          {/* Main KPI Cards */}
          <section className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${isFuncionario ? '' : 'lg:grid-cols-4'}`}>
            <MetricCard 
              label="Funcionários ativos" 
              value={summaryData?.activeEmployees} 
              icon={Users} 
              detail="equipe em acompanhamento"
              trend={admissionsThisMonth > 0 ? `+${admissionsThisMonth} admissões` : undefined}
              trendColor="emerald"
              loading={summary.loading}
            />
            <MetricCard 
              label="Pontos hoje" 
              value={summaryData?.timeTracksToday} 
              icon={Clock3} 
              detail="jornadas registradas"
              loading={summary.loading}
            />
            {!isFuncionario && (
              <>
                <MetricCard 
                  label="Férias pendentes" 
                  value={pendingVacations} 
                  icon={CalendarDays} 
                  detail="aguardando decisão"
                  alert={pendingVacations > 0}
                  loading={summary.loading}
                />
                <MetricCard 
                  label="Banco de horas" 
                  value={summaryData ? formatMinutes(summaryData.totalTimeBalance) : undefined} 
                  icon={TrendingUp} 
                  detail="saldo consolidado"
                  loading={summary.loading}
                />
              </>
            )}
          </section>

          {/* Alert & Action Cards */}
          {!isFuncionario && (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Pendências */}
              <div className="rounded-[16px] border border-amber-200/60 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-800">Pendências</h3>
                  <AlertCircle size={18} strokeWidth={2.5} className="text-amber-500" />
                </div>
                <div className="space-y-2.5">
                  <PendencyItem label="Pontos manuais" count={pendingTimeTracks} href="/dashboard/time-track" />
                  <PendencyItem label="Férias" count={pendingVacations} href="/dashboard/vacations" />
                </div>
              </div>

              {/* Cadastro */}
              <div className="rounded-[16px] border border-rose-200/60 bg-gradient-to-br from-rose-50 to-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-rose-800">Alertas cadastrais</h3>
                  <UserX size={18} strokeWidth={2.5} className="text-rose-500" />
                </div>
                <div className="space-y-2.5">
                  <PendencyItem label="Sem gestor" count={employeesNoManager} href="/dashboard/employees" />
                  <PendencyItem label="Sem acesso" count={employeesNoAccess} href="/dashboard/employees" />
                  {alertItems.slice(0, 2).map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-[8px] bg-rose-50/50 px-3 py-2 text-xs">
                      <span className="font-bold text-rose-700">{item.label}</span>
                      <span className="text-[10px] font-semibold text-rose-500">{item.detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Movimentações */}
              <div className="rounded-[16px] border border-teal-200/60 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-teal-800">Movimentações do mês</h3>
                  <UserPlus size={18} strokeWidth={2.5} className="text-teal-500" />
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between rounded-[8px] bg-teal-50/50 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500"><ArrowUpRight size={14} className="text-white" /></div>
                      <span className="text-xs font-bold text-slate-700">Admissões</span>
                    </div>
                    <span className="text-sm font-black text-emerald-600">{admissionsThisMonth}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[8px] bg-teal-50/50 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500"><UserMinus size={14} className="text-white" /></div>
                      <span className="text-xs font-bold text-slate-700">Desligamentos</span>
                    </div>
                    <span className="text-sm font-black text-rose-600">{terminationsThisMonth}</span>
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* Data Tables - Ponto e Férias lado a lado */}
      <section className={`grid grid-cols-1 gap-5 ${isFuncionario ? '' : 'lg:grid-cols-2'}`}>
        <DataTable title={isFuncionario ? 'Minhas jornadas recentes' : 'Jornadas recentes'} headers={isFuncionario ? ['Data', 'Entrada', 'Saída'] : ['Funcionário', 'Data', 'Entrada', 'Saída', 'Ações']}>
          {timeTracks.loading && !presentationMode && <LoadingRow span={isFuncionario ? 3 : 4} />}
          {timeTracks.error && !presentationMode && <ErrorRow span={isFuncionario ? 3 : 4} message={timeTracks.error} />}
          {!timeTracks.loading && !timeTracks.error && todayRows.length === 0 && (
            <EmptyRow span={isFuncionario ? 3 : 4} message="Nenhum registro encontrado para hoje." />
          )}
          {todayRows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
              {!isFuncionario && <td className="py-3.5 pr-4 text-xs font-bold text-slate-900">{row.employee?.name ?? '--'}</td>}
              <td className="py-3.5 pr-4 text-xs font-semibold text-slate-600">{new Date(row.date).toLocaleDateString('pt-BR')}</td>
              <td className="py-3.5 pr-4 text-xs font-black text-slate-950">{formatTime(row.entry)}</td>
              <td className="py-3.5 text-xs font-semibold text-slate-600">{formatTime(row.exit)}</td>
              {!isFuncionario && (
                <td className="py-3.5">
                  <Link href={`/dashboard/time-track?employeeId=${row.employeeId}`} className="inline-flex h-7 items-center gap-1.5 rounded-[6px] bg-gradient-to-r from-teal-500 to-cyan-600 px-2.5 text-[10px] font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                    Ponto
                  </Link>
                </td>
              )}
            </tr>
          ))}
          {todayRows.length > 0 && (
            <tr className="border-t border-slate-100">
              <td colSpan={isFuncionario ? 3 : 4} className="py-3 text-center">
                <Link href="/dashboard/time-track" className="text-xs font-black text-teal-600 hover:text-teal-700 transition-colors">Ver todos os registros →</Link>
              </td>
            </tr>
          )}
        </DataTable>

        {!isFuncionario && (
          <DataTable title="Férias e ausências" headers={['Funcionário', 'Período', 'Status']}>
            {vacations.loading && !presentationMode && <LoadingRow span={3} />}
            {vacations.error && !presentationMode && <ErrorRow span={3} message={vacations.error} />}
            {!vacations.loading && !vacations.error && vacationRows.length === 0 && (
              <EmptyRow span={3} message="Nenhuma solicitação em aberto." />
            )}
            {vacationRows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
                <td className="py-3.5 pr-4 text-xs font-bold text-slate-900">{row.employee?.name ?? '--'}</td>
                <td className="py-3.5 pr-4 text-xs font-semibold text-slate-600">{formatPeriod(row.startDate, row.endDate)}</td>
                <td className="py-3.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-1 text-[10px] font-black ${
                    row.status === 'PENDING' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                    row.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                    'border-rose-200 bg-rose-50 text-rose-700'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      row.status === 'PENDING' ? 'bg-amber-500' :
                      row.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} />
                    {VACATION_STATUS_LABEL[row.status] ?? row.status}
                  </span>
                </td>
              </tr>
            ))}
            {vacationRows.length > 0 && (
              <tr className="border-t border-slate-100">
                <td colSpan={3} className="py-3 text-center">
                  <Link href="/dashboard/vacations" className="text-xs font-black text-teal-600 hover:text-teal-700 transition-colors">Ver todas as solicitações →</Link>
                </td>
              </tr>
            )}
          </DataTable>
        )}
      </section>
    </div>
  );
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, icon: Icon, detail, trend, trendColor = 'emerald', alert = false, loading }: {
  label: string; value: React.ReactNode; icon: React.ElementType; detail: string;
  trend?: string; trendColor?: string; alert?: boolean; loading?: boolean;
}) {
  return (
        <div className="group relative rounded-[18px] border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/30 p-5 shadow-[0_8px_30px_rgba(15,23,42,0.08)] transition-shadow duration-300 hover:shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
      {alert && <div className="absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full bg-amber-500" />}
      <div className="relative">
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</p>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/25 transition-transform duration-300 group-hover:scale-110">
            <Icon size={17} strokeWidth={2.5} className="text-white" />
          </div>
        </div>
        <p className="text-2xl font-black tracking-tight text-slate-950">
          {loading && value === undefined ? '--' : value ?? '0'}
        </p>
        <div className="mt-1.5 flex items-center justify-between">
          <p className="text-[11px] font-bold text-slate-500">{detail}</p>
          {trend && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-black text-${trendColor}-600`}>
              <ArrowUpRight size={11} strokeWidth={3} />
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PendencyItem({ label, count, href }: { label: string; count: number; href: string }) {
  if (count === 0) return null;
  return (
    <Link href={href} className="flex items-center justify-between rounded-[8px] bg-white/80 px-3 py-2.5 text-xs shadow-sm transition-all hover:bg-white hover:shadow-md">
      <span className="font-bold text-slate-700">{label}</span>
      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-black text-white">{count}</span>
    </Link>
  );
}

function DataTable({ title, headers, children }: { title: string; headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-slate-200/60 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-950">{title}</h3>
      </div>
      <div className="overflow-x-auto px-5 py-3">
        <table className="w-full min-w-[380px] text-left">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} className="pb-3 pr-4 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{header}</th>
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
  if (alerts.companyIncomplete) items.push({ label: 'Dados da empresa incompletos', detail: 'Revise configurações' });
  if (alerts.employeesWithoutCpf > 0) items.push({ label: `${alerts.employeesWithoutCpf} sem CPF`, detail: 'Corrigir cadastro' });
  if (alerts.employeesWithoutUser > 0) items.push({ label: `${alerts.employeesWithoutUser} sem usuário`, detail: 'Vincular acesso' });
  if (alerts.employeesWithoutManager > 0) items.push({ label: `${alerts.employeesWithoutManager} sem gestor`, detail: 'Definir liderança' });
  if (alerts.employeesWithoutWorkScale > 0) items.push({ label: `${alerts.employeesWithoutWorkScale} sem escala`, detail: 'Definir jornada' });
  if (alerts.employeesWithoutWorkload > 0) items.push({ label: `${alerts.employeesWithoutWorkload} sem carga horária`, detail: 'Definir jornada' });
  if (alerts.pendingTimeTracks > 0) items.push({ label: `${alerts.pendingTimeTracks} ponto(s) pendente(s)`, detail: 'Aprovar ajustes' });
  return items;
}