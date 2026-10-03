'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertCircle, ArrowUpRight, Bell, Cake, CalendarDays, Clock3,
  Download, FileText, Stethoscope, TrendingUp, UserMinus, UserPlus,
  Users, UserX,
} from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { VACATION_STATUS_LABEL, formatMinutes, formatPeriod, formatTime } from '@/app/lib/format';
import { cn } from '@/app/lib/cn';
import type { LucideIcon } from 'lucide-react';

const EmployeeDashboard = dynamic(
  () => import('./_components/employee-dashboard').then((m) => m.EmployeeDashboard),
  { ssr: false },
);

/* â”€â”€ Estilos utilitÃ¡rios (usam tokens do globals.css) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const CARD = 'card-v2';
const PAGE = 'px-[clamp(1rem,2.5vw,2.5rem)] py-[clamp(1rem,1.8vw,2rem)] w-full';

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PAGE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export default function DashboardHome() {
  const params = useParams();
  const tenant = String(params?.tenant ?? '');

  return (
    <div className={PAGE}>
      <DashboardContent tenant={tenant} />
    </div>
  );
}

function DashboardContent({ tenant }: { tenant: string }) {
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const isCommercial = profile === 'COMERCIAL';
  const isFuncionario = profile === 'FUNCIONARIO';

  const summary = useQuery(() => api.dashboard.summary(), [], { enabled: !isCommercial, pollMs: 60000 });
  const insights = useQuery(() => api.dashboard.insights(), [], { enabled: !isCommercial, pollMs: 60000 });
  const rhAlerts = useQuery(() => api.dashboard.rhAlerts(), [], { enabled: !isCommercial && !isFuncionario });
  const notificationsWidget = useQuery(() => api.notifications.dashboardWidget(), [], { enabled: !isCommercial, pollMs: 30000 });
  const timeTracks = useQuery(() => api.timeTrack.list(), [], { enabled: !isCommercial });
  const vacations = useQuery(() => api.vacations.list(), [], { enabled: !isCommercial && !isFuncionario });
  const employees = useQuery(() => api.employees.list(), [], { enabled: !isCommercial && !isFuncionario });

  const [dashMonth, setDashMonth] = useState(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
  });
  const [dashDept, setDashDept] = useState('');

  const departments = useMemo(
    () => [...new Set((employees.data ?? []).map((e) => e.department).filter(Boolean))].sort() as string[],
    [employees.data],
  );

  const timeTrackData = useMemo(() => timeTracks.data ?? [], [timeTracks.data]);
  const vacationData = useMemo(() => vacations.data ?? [], [vacations.data]);
  const insightData = insights.data;
  const rhAlertData = rhAlerts.data;
  const notificationWidgetData = notificationsWidget.data;

  const filteredTimeTracks = useMemo(
    () => timeTrackData.filter((row) => {
      if (dashMonth && !row.date.startsWith(dashMonth)) return false;
      if (dashDept && row.employee?.department !== dashDept) return false;
      return true;
    }),
    [timeTrackData, dashMonth, dashDept],
  );

  const filteredVacations = useMemo(
    () => vacationData.filter((row) => (!dashDept || row.employee?.department === dashDept)),
    [vacationData, dashDept],
  );

  const pendingTimeTracks = filteredTimeTracks.filter((t) => t.manualStatus === 'pending').length;
  const pendingVacations = filteredVacations.filter((v) => v.status === 'PENDING').length;
  const employeesNoManager = (employees.data ?? []).filter((e) => !e.managerId).length;
  const employeesNoAccess = (employees.data ?? []).filter((e) => !e.userId).length;

  const totalBalanceThisMonth = useMemo(
    () => filteredTimeTracks.reduce((acc, t) => acc + (t.dailyBalance ?? 0), 0),
    [filteredTimeTracks],
  );

  const isSelectedMonth = (dateStr?: string | null) =>
    !!dashMonth && !!dateStr && dateStr.startsWith(dashMonth);

  const admissionsThisMonth = (employees.data ?? []).filter((e) => isSelectedMonth(e.admissionDate)).length;
  const terminationsThisMonth = (employees.data ?? []).filter((e) => isSelectedMonth(e.terminationDate)).length;

  /* â”€â”€ GrÃ¡ficos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const chartJornadas = useMemo(() => {
    const byDay = new Map<string, { day: string; registros: number; saldo: number }>();
    filteredTimeTracks.forEach((t) => {
      const key = t.date.slice(0, 10);
      const label = key.slice(8, 10) + '/' + key.slice(5, 7);
      const cur = byDay.get(key) ?? { day: label, registros: 0, saldo: 0 };
      cur.registros += 1;
      cur.saldo += t.dailyBalance ?? 0;
      byDay.set(key, cur);
    });
    return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  }, [filteredTimeTracks]);

  const chartStatus = useMemo(() => {
    const list = employees.data ?? [];
    const map = { ACTIVE: 0, INACTIVE: 0, ONBOARDING: 0, TERMINATED: 0 } as Record<string, number>;
    list.forEach((e) => { map[e.status] = (map[e.status] ?? 0) + 1; });
    return [
      { name: 'Ativos',     value: map.ACTIVE,      color: 'rgb(20 184 166)' },
      { name: 'Em admissÃ£o',value: map.ONBOARDING,  color: 'rgb(245 158 11)' },
      { name: 'Inativos',   value: map.INACTIVE,    color: 'rgb(148 163 184)' },
      { name: 'Desligados', value: map.TERMINATED,  color: 'rgb(244 63 94)' },
    ].filter((d) => d.value > 0);
  }, [employees.data]);

  const chartMovimentacoes = useMemo(() => {
    const months: { mes: string; admissoes: number; desligamentos: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      const admissoes = (employees.data ?? []).filter((e) => e.admissionDate?.startsWith(key)).length;
      const desligamentos = (employees.data ?? []).filter((e) => e.terminationDate?.startsWith(key)).length;
      months.push({ mes: label, admissoes, desligamentos });
    }
    return months;
  }, [employees.data]);

  const { birthdays, workAnniversaries } = useMemo(() => {
    const b: any[] = []; const w: any[] = [];
    if (!dashMonth || !employees.data) return { birthdays: b, workAnniversaries: w };
    const month = dashMonth.split('-')[1];
    const year = parseInt(dashMonth.split('-')[0], 10);
    employees.data.forEach((emp) => {
      if (emp.birthDate?.substring(5, 7) === month) b.push(emp);
      if (emp.admissionDate?.substring(5, 7) === month) {
        const y = year - parseInt(emp.admissionDate.substring(0, 4), 10);
        if (y > 0) w.push({ ...emp, years: y });
      }
    });
    return { birthdays: b, workAnniversaries: w };
  }, [dashMonth, employees.data]);

  const todayRows = filteredTimeTracks.slice(0, 5);
  const vacationRows = filteredVacations.slice(0, 5);

  if (isFuncionario) {
    return (
      <EmployeeDashboard
        tenant={tenant}
        userName={user?.name}
        summary={summary.data}
        insights={insightData}
        tracks={timeTrackData}
        loading={summary.loading || insights.loading || timeTracks.loading}
      />
    );
  }

  const rolePresentation: Record<string, { eyebrow: string; title: string; description: string }> = {
    DEV:      { eyebrow: 'Dashboard Dev',      title: 'VisÃ£o global da plataforma', description: 'Empresas, acessos, faturamento e saÃºde operacional em um sÃ³ lugar.' },
    ADMIN:    { eyebrow: 'Dashboard Administrador', title: 'Controle completo da empresa', description: 'Pessoas, usuÃ¡rios, jornada e fechamento sob sua administraÃ§Ã£o.' },
    RH:       { eyebrow: 'Dashboard RH',        title: 'GestÃ£o de pessoas em tempo real', description: 'Cadastros, fÃ©rias, ocorrÃªncias e fechamento para o time de RH.' },
    GESTOR:   { eyebrow: 'Dashboard Gestor',    title: 'Sua equipe em tempo real', description: 'Escala, ponto, banco de horas e pendÃªncias da equipe sob sua gestÃ£o.' },
    CONSULTA: { eyebrow: 'Dashboard Consulta',  title: 'Indicadores da operaÃ§Ã£o', description: 'Acompanhamento em modo de consulta, sem alteraÃ§Ãµes operacionais.' },
  };
  const presentation = profile === 'COMERCIAL'
    ? { eyebrow: 'Dashboard Comercial', title: 'VisÃ£o comercial da plataforma', description: 'Acompanhe empresas, propostas, planos e a operaÃ§Ã£o comercial em um sÃ³ lugar.' }
    : rolePresentation[profile || ''] ?? rolePresentation.ADMIN;

  const roleActions: Record<string, { label: string; href: string; icon: LucideIcon }[]> = {
    DEV:      [
      { label: 'Plataforma', href: `/${tenant}/dashboard/platform`, icon: TrendingUp },
      { label: 'Financeiro', href: `/${tenant}/dashboard/platform/finance`, icon: FileText },
      { label: 'UsuÃ¡rios',   href: `/${tenant}/dashboard/users`,    icon: Users },
    ],
    ADMIN:    [
      { label: 'FuncionÃ¡rios', href: `/${tenant}/dashboard/employees`, icon: Users },
      { label: 'UsuÃ¡rios',     href: `/${tenant}/dashboard/users`,     icon: UserPlus },
      { label: 'Fechamento',   href: `/${tenant}/dashboard/time-track/closing`, icon: Download },
    ],
    RH:       [
      { label: 'Novo funcionÃ¡rio', href: `/${tenant}/dashboard/employees/new`, icon: UserPlus },
      { label: 'FÃ©rias',           href: `/${tenant}/dashboard/vacations`,     icon: CalendarDays },
      { label: 'GestÃ£o',           href: `/${tenant}/dashboard/management`,    icon: Users },
    ],
    GESTOR:   [
      { label: 'Minha equipe', href: `/${tenant}/dashboard/employees`,       icon: Users },
      { label: 'Escala',       href: `/${tenant}/dashboard/escala?tab=equipe`, icon: CalendarDays },
      { label: 'Ponto',        href: `/${tenant}/dashboard/time-track`,      icon: Clock3 },
    ],
    CONSULTA: [
      { label: 'FuncionÃ¡rios', href: `/${tenant}/dashboard/employees`, icon: Users },
      { label: 'Escala',       href: `/${tenant}/dashboard/escala`,    icon: CalendarDays },
      { label: 'Ponto',        href: `/${tenant}/dashboard/time-track`,icon: Clock3 },
    ],
  };
  const shortcuts = profile === 'COMERCIAL'
    ? [
        { label: 'Plataforma', href: `/${tenant}/dashboard/platform`, icon: TrendingUp },
        { label: 'Propostas', href: `/${tenant}/dashboard/platform/proposals`, icon: FileText },
        { label: 'Empresas', href: `/${tenant}/dashboard/platform/companies`, icon: Users },
      ]
    : roleActions[profile || ''] ?? roleActions.ADMIN;

  return (
    <div className="flex flex-col gap-5">
      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between pb-2">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.22em] text-brand-600">
            {presentation.eyebrow}
          </p>
          <h1 className="text-[clamp(1.75rem,1.5rem+1.4vw,2.25rem)] font-black tracking-tight text-fg">
            {presentation.title}
          </h1>
          <p className="mt-2 max-w-3xl text-[clamp(0.875rem,0.85rem+0.25vw,1rem)] font-medium text-fg-mut">
            {presentation.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {shortcuts.map((s, i) => {
            const Icon = s.icon;
            return (
              <Link
                key={i}
                href={s.href}
                className="btn-v2-outline"
              >
                <Icon size={15} strokeWidth={2.4} />
                <span className="hidden sm:inline">{s.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* â”€â”€ Filtros â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {!isCommercial && (
        <div className="card-v2 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
          <label className="flex flex-col gap-1 min-w-[180px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-fg-sub">
              MÃªs de referÃªncia
            </span>
            <input
              type="month"
              value={dashMonth}
              onChange={(e) => setDashMonth(e.target.value)}
              className="input-v2"
            />
          </label>
          <label className="flex flex-col gap-1 min-w-[200px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-fg-sub">
              Departamento
            </span>
            <select
              value={dashDept}
              onChange={(e) => setDashDept(e.target.value)}
              className="input-v2"
            >
              <option value="">Todos os departamentos</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        </div>
      )}

      {/* â”€â”€ KPIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          delay={0.0}
          title="FuncionÃ¡rios ativos"
          value={summary.data?.activeEmployees ?? 0}
          icon={Users}
          accent="brand"
          trend={admissionsThisMonth > 0 ? { value: `+${admissionsThisMonth}`, direction: 'up', label: 'admissÃµes no mÃªs' } : undefined}
          loading={summary.loading}
        />
        <KpiCard
          delay={0.05}
          title="Pontos hoje"
          value={summary.data?.timeTracksToday ?? 0}
          icon={Clock3}
          accent="accent"
          hint="jornadas registradas"
          loading={summary.loading}
        />
        <KpiCard
          delay={0.1}
          title="FÃ©rias pendentes"
          value={pendingVacations}
          icon={CalendarDays}
          accent={pendingVacations > 0 ? 'warning' : 'success'}
          hint="aguardando decisÃ£o"
          loading={summary.loading}
        />
        <KpiCard
          delay={0.15}
          title="Banco de horas"
          value={formatMinutes(totalBalanceThisMonth)}
          icon={TrendingUp}
          accent={totalBalanceThisMonth >= 0 ? 'success' : 'danger'}
          hint="saldo do perÃ­odo"
          loading={summary.loading}
        />
      </section>

      {/* â”€â”€ Bento de grÃ¡ficos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* EvoluÃ§Ã£o de jornadas */}
        <ChartBlock
          delay={0.2}
          title="Jornadas no mÃªs"
          subtitle="Registros por dia"
          className="lg:col-span-2"
          height={260}
        >
          {chartJornadas.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartJornadas} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradJornadas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="rgb(168 85 247)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="rgb(168 85 247)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="rgb(var(--border))" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgb(var(--fg-sub))', fontSize: 11 }} minTickGap={18} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgb(var(--fg-sub))', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="registros"
                  stroke="rgb(138 5 190)"
                  strokeWidth={2.5}
                  fill="url(#gradJornadas)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartBlock>

        {/* DistribuiÃ§Ã£o de status */}
        <ChartBlock delay={0.25} title="DistribuiÃ§Ã£o da equipe" subtitle="Status atual" height={260}>
          {chartStatus.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartBlock>
      </section>

      {/* â”€â”€ MovimentaÃ§Ãµes + Alerta rÃ¡pido â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartBlock
          delay={0.3}
          title="MovimentaÃ§Ãµes"
          subtitle="AdmissÃµes vs desligamentos (6 meses)"
          className="lg:col-span-2"
          height={240}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartMovimentacoes} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="rgb(var(--border))" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: 'rgb(var(--fg-sub))', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgb(var(--fg-sub))', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(var(--bg-sub))' }} />
              <Bar dataKey="admissoes" fill="rgb(20 184 166)" radius={[6, 6, 0, 0]} barSize={18} />
              <Bar dataKey="desligamentos" fill="rgb(244 63 94)" radius={[6, 6, 0, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBlock>

        <PendencyCard
          delay={0.35}
          pendingTimeTracks={pendingTimeTracks}
          pendingVacations={pendingVacations}
          employeesNoManager={employeesNoManager}
          employeesNoAccess={employeesNoAccess}
          tenant={tenant}
        />
      </section>

      {/* â”€â”€ Alertas RH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {rhAlertData && (
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'ASOs vencidos',        value: rhAlertData.asoExpired ?? 0,         accent: 'danger' as const },
            { label: 'ASOs a vencer',        value: rhAlertData.asoExpiringSoon ?? 0,    accent: 'warning' as const },
            { label: 'ASO admissional pend.',value: rhAlertData.pendingAdmissionAso ?? 0,accent: 'warning' as const },
            { label: 'Inaptos',              value: rhAlertData.inaptoCount ?? 0,        accent: 'danger' as const },
          ].map((r, i) => (
            <KpiCard key={i} delay={0.4 + i * 0.04} title={r.label} value={r.value} accent={r.accent} />
          ))}
        </section>
      )}

      {/* â”€â”€ NotificaÃ§Ãµes + Aniversariantes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {notificationWidgetData && (
          <div className="card-v2 flex flex-col lg:col-span-2">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-brand-600" />
                <h3 className="text-sm font-black text-fg">Central de notificaÃ§Ãµes</h3>
                {notificationWidgetData.unreadCount > 0 && (
                  <span className="chip chip-brand">{notificationWidgetData.unreadCount} nÃ£o lidas</span>
                )}
              </div>
              <Link
                href={`/${tenant}/dashboard/notifications`}
                className="text-[11px] font-black text-brand-600 hover:underline"
              >
                Ver todas â†’
              </Link>
            </div>
            <div className="flex-1 p-3">
              {notificationWidgetData.notifications.length === 0 ? (
                <p className="py-8 text-center text-xs text-fg-sub">Nenhuma notificaÃ§Ã£o no momento.</p>
              ) : (
                <div className="space-y-2">
                  {notificationWidgetData.notifications.slice(0, 5).map((n: any) => (
                    <div
                      key={n.id}
                      className="rounded-v2-md border border-border/60 bg-bg-sub/40 px-4 py-3 text-xs transition-colors hover:bg-bg-sub"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-fg-sub">
                          {n.type === 'SYSTEM' ? 'Sistema' : 'RH'}
                        </span>
                        <span className="text-[10px] font-medium text-fg-sub">
                          {n.createdAt ? new Date(n.createdAt).toLocaleDateString('pt-BR') : ''}
                        </span>
                      </div>
                      <p className="mt-1 font-bold text-fg">{n.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-fg-mut">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="card-v2 flex flex-col">
          <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
            <Cake size={16} className="text-brand-600" />
            <h3 className="text-sm font-black text-fg">Datas importantes</h3>
          </div>
          <div className="flex-1 space-y-2 p-3 max-h-[320px] overflow-y-auto">
            {birthdays.length === 0 && workAnniversaries.length === 0 && (
              <p className="py-8 text-center text-xs font-medium text-fg-sub">Nenhum evento neste mÃªs.</p>
            )}
            {birthdays.map((emp: any) => (
              <div key={`b-${emp.id}`} className="flex items-center justify-between gap-2 rounded-v2-md border border-border/60 bg-bg-sub/40 px-3 py-2 text-xs">
                <span className="truncate font-bold text-fg">{emp.name}</span>
                <span className="chip chip-brand shrink-0">AniversÃ¡rio</span>
              </div>
            ))}
            {workAnniversaries.map((emp: any) => (
              <div key={`w-${emp.id}`} className="flex items-center justify-between gap-2 rounded-v2-md border border-border/60 bg-bg-sub/40 px-3 py-2 text-xs">
                <span className="truncate font-bold text-fg">{emp.name}</span>
                <span className="chip chip-accent shrink-0">{emp.years} ano{emp.years > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Tabelas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DataTableCard
          delay={0.5}
          title="Jornadas recentes"
          headers={['FuncionÃ¡rio', 'Data', 'Entrada', 'SaÃ­da', '']}
          loading={timeTracks.loading}
          error={timeTracks.error}
          empty="Nenhum registro encontrado."
          footerHref={`/${tenant}/dashboard/time-track`}
          footerLabel="Ver todos os registros"
        >
          {todayRows.map((row) => (
            <tr key={row.id} className="border-t border-border/60 transition-colors hover:bg-bg-sub/50">
              <td className="py-3 pr-4 text-xs font-bold text-fg">{row.employee?.name ?? '--'}</td>
              <td className="py-3 pr-4 text-xs font-medium text-fg-mut">
                {new Date(row.date).toLocaleDateString('pt-BR')}
              </td>
              <td className="py-3 pr-4 text-xs font-black text-fg tabular-nums">{formatTime(row.entry)}</td>
              <td className="py-3 text-xs font-medium text-fg-mut tabular-nums">{formatTime(row.exit)}</td>
              <td className="py-3">
                <Link
                  href={`/${tenant}/dashboard/time-track?employeeId=${row.employeeId}`}
                  className="text-[11px] font-black text-brand-600 hover:underline"
                >
                  Ver â†’
                </Link>
              </td>
            </tr>
          ))}
        </DataTableCard>

        {!isFuncionario && (
          <DataTableCard
            delay={0.55}
            title="FÃ©rias e ausÃªncias"
            headers={['FuncionÃ¡rio', 'PerÃ­odo', 'Status']}
            loading={vacations.loading}
            error={vacations.error}
            empty="Nenhuma solicitaÃ§Ã£o em aberto."
            footerHref={`/${tenant}/dashboard/vacations`}
            footerLabel="Ver todas as solicitaÃ§Ãµes"
          >
            {vacationRows.map((row) => (
              <tr key={row.id} className="border-t border-border/60 transition-colors hover:bg-bg-sub/50">
                <td className="py-3 pr-4 text-xs font-bold text-fg">{row.employee?.name ?? '--'}</td>
                <td className="py-3 pr-4 text-xs font-medium text-fg-mut">
                  {formatPeriod(row.startDate, row.endDate)}
                </td>
                <td className="py-3">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black',
                    row.status === 'PENDING'  && 'chip chip-warning',
                    row.status === 'APPROVED' && 'chip chip-success',
                    row.status === 'REJECTED' && 'chip chip-danger',
                    !['PENDING', 'APPROVED', 'REJECTED'].includes(row.status) && 'chip',
                  )}>
                    <span className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      row.status === 'PENDING'  && 'bg-amber-500',
                      row.status === 'APPROVED' && 'bg-emerald-500',
                      row.status === 'REJECTED' && 'bg-rose-500',
                    )} />
                    {VACATION_STATUS_LABEL[row.status] ?? row.status}
                  </span>
                </td>
              </tr>
            ))}
          </DataTableCard>
        )}
      </section>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   COMPONENTES INTERNOS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function KpiCard({
  title, value, icon: Icon, accent = 'brand', trend, hint, loading, delay = 0,
}: {
  title: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  accent?: 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  trend?: { value: string; direction: 'up' | 'down' | 'neutral'; label?: string };
  hint?: string;
  loading?: boolean;
  delay?: number;
}) {
  const accentMap = {
    brand:   'text-brand-600',
    accent:  'text-accent-600',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger:  'text-rose-600',
    info:    'text-blue-600',
  } as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="card-v2 relative overflow-hidden p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-fg-mut">
            {title}
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-fg tabular-nums">
            {loading ? <span className="inline-block h-8 w-24 animate-pulse rounded-md bg-bg-sub" /> : value}
          </p>
          {(trend || hint) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {trend && (
                <span className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold',
                  trend.direction === 'up'      && 'bg-emerald-500/12 text-emerald-700',
                  trend.direction === 'down'    && 'bg-rose-500/12 text-rose-700',
                  trend.direction === 'neutral' && 'bg-bg-sub text-fg-mut',
                )}>
                  {trend.direction === 'up' && <ArrowUpRight size={11} />}
                  {trend.value}
                </span>
              )}
              {trend?.label && <span className="text-[11px] font-medium text-fg-sub">{trend.label}</span>}
              {!trend && hint && <span className="text-[11px] font-medium text-fg-sub">{hint}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            'flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-v2-md bg-bg-sub',
            accentMap[accent],
          )}>
            <Icon size={16} strokeWidth={2.4} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ChartBlock({
  title, subtitle, children, height = 260, className, delay = 0,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={cn('card-v2 flex flex-col', className)}
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-2">
        <div>
          <h3 className="text-sm font-black tracking-tight text-fg">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs font-medium text-fg-mut">{subtitle}</p>}
        </div>
      </div>
      <div className="px-2 pb-3" style={{ height }}>
        {children}
      </div>
    </motion.div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-v2 px-3 py-2 shadow-v2-lg">
      {label != null && (
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-fg-sub">{label}</p>
      )}
      {payload.map((p: any, i: number) => (
        <p key={i} className="flex items-center gap-2 text-xs font-bold text-fg">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-fg-mut">{p.name}:</span>
          <span>{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-sub text-fg-sub">
        <AlertCircle size={18} />
      </div>
      <p className="text-xs font-semibold text-fg-sub">Sem dados para o perÃ­odo</p>
    </div>
  );
}

function PendencyCard({
  pendingTimeTracks, pendingVacations, employeesNoManager, employeesNoAccess, tenant, delay = 0,
}: {
  pendingTimeTracks: number;
  pendingVacations: number;
  employeesNoManager: number;
  employeesNoAccess: number;
  tenant: string;
  delay?: number;
}) {
  const items = [
    { label: 'Pontos manuais', value: pendingTimeTracks, href: `/${tenant}/dashboard/time-track`, accent: 'warning' as const },
    { label: 'FÃ©rias pendentes', value: pendingVacations, href: `/${tenant}/dashboard/vacations`, accent: 'warning' as const },
    { label: 'Sem gestor',       value: employeesNoManager, href: `/${tenant}/dashboard/employees`, accent: 'danger' as const },
    { label: 'Sem acesso',       value: employeesNoAccess, href: `/${tenant}/dashboard/employees`, accent: 'danger' as const },
  ];
  const total = items.reduce((a, b) => a + b.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="card-v2 flex flex-col"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-brand-600" />
          <h3 className="text-sm font-black text-fg">PendÃªncias</h3>
        </div>
        <span className={cn('chip', total > 0 && 'chip-warning')}>
          {total} {total === 1 ? 'item' : 'itens'}
        </span>
      </div>
      <div className="flex-1 space-y-2 p-3">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center justify-between gap-3 rounded-v2-md border border-border/60 bg-bg-sub/40 px-3 py-2.5 text-xs transition-all hover:border-border-strong hover:bg-bg-sub"
          >
            <span className="font-bold text-fg">{item.label}</span>
            <span className={cn(
              'flex h-5 min-w-[22px] items-center justify-center rounded-full px-1.5 text-[10px] font-black',
              item.accent === 'warning' && 'bg-amber-500 text-white',
              item.accent === 'danger'  && 'bg-rose-500 text-white',
            )}>
              {item.value}
            </span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

function DataTableCard({
  title, headers, loading, error, empty, children, footerHref, footerLabel, delay = 0,
}: {
  title: string;
  headers: string[];
  loading?: boolean;
  error?: string | null;
  empty: string;
  children: React.ReactNode;
  footerHref?: string;
  footerLabel?: string;
  delay?: number;
}) {
  const hasRows = React.Children.count(children) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="card-v2 overflow-hidden flex flex-col"
    >
      <div className="border-b border-border/60 px-5 py-4">
        <h3 className="text-sm font-black text-fg">{title}</h3>
      </div>
      <div className="overflow-x-auto px-5 py-3 flex-1">
        <table className="w-full min-w-[380px] text-left">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} className="pb-3 pr-4 text-[10px] font-black uppercase tracking-[0.14em] text-fg-sub">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={headers.length} className="py-8 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500" style={{ animationDelay: '300ms' }} />
                </div>
              </td></tr>
            )}
            {!loading && error && (
              <tr><td colSpan={headers.length} className="py-6 text-center text-xs font-bold text-amber-700">{error}</td></tr>
            )}
            {!loading && !error && !hasRows && (
              <tr><td colSpan={headers.length} className="py-6 text-center text-xs font-medium text-fg-sub">{empty}</td></tr>
            )}
            {!loading && !error && children}
          </tbody>
        </table>
      </div>
      {footerHref && footerLabel && (
        <div className="border-t border-border/60 px-5 py-3 text-center">
          <Link
            href={footerHref}
            className="text-xs font-black text-brand-600 transition-colors hover:text-brand-700 hover:underline"
          >
            {footerLabel} â†’
          </Link>
        </div>
      )}
    </motion.div>
  );
}
