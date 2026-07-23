'use client';

import Link from 'next/link';
import { ArrowRight, Cake, CalendarCheck, Clock3, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DashboardInsights, DashboardSummary, TimeTrack } from '@/app/lib/api';
import { formatMinutes, formatTime } from '@/app/lib/format';

interface Props {
  tenant: string;
  userName?: string;
  summary?: DashboardSummary;
  insights?: DashboardInsights;
  tracks: TimeTrack[];
  loading: boolean;
}

const monthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const shortDate = (value: string) => {
  const [, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}`;
};

const axisMinutes = (value: number) => {
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(value);
  return `${sign}${Math.floor(absolute / 60)}h${String(absolute % 60).padStart(2, '0')}`;
};

export function EmployeeDashboard({ tenant, userName, summary, insights, tracks, loading }: Props) {
  const monthTracks = tracks
    .filter((track) => track.date.slice(0, 7) === monthKey() && !track.isFuture)
    .sort((a, b) => a.date.localeCompare(b.date));
  const worked = monthTracks.reduce((sum, track) => sum + (track.totalWorked ?? 0), 0);
  const credits = monthTracks.reduce((sum, track) => sum + Math.max(track.dailyBalance ?? 0, 0), 0);
  const debits = monthTracks.reduce((sum, track) => sum + Math.abs(Math.min(track.dailyBalance ?? 0, 0)), 0);
  const birthdays = insights?.birthdaysThisMonth ?? [];
  const firstName = userName?.trim().split(/\s+/)[0] || 'colaborador';
  let accumulated = 0;
  const chartData = monthTracks.map((track) => {
    accumulated += track.dailyBalance ?? 0;
    return { date: shortDate(track.date), balance: accumulated };
  });
  const recentTracks = [...monthTracks].reverse().slice(0, 5);

  return (
    <div className="mx-auto w-full space-y-5 px-3 py-4 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[26px] bg-[#0b0b0c] px-6 py-7 text-white sm:px-8 sm:py-9">
        <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/10" />
        <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/50">Meu dashboard</p>
            <h1 className="mt-3 max-w-xl text-3xl font-black tracking-tight sm:text-4xl">Ola, {firstName}. Sua jornada em um so lugar.</h1>
            <p className="mt-3 text-sm font-medium text-white/55">Acompanhe seu ponto, banco de horas e os momentos importantes da equipe.</p>
          </div>
          <Link href={`/${tenant}/dashboard/time-track/clock-in`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-xs font-black text-black hover:-translate-y-0.5"><Clock3 size={15} /> Bater ponto <ArrowRight size={14} /></Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Banco de horas" value={formatMinutes(summary?.totalTimeBalance ?? 0)} detail="saldo pessoal acumulado" icon={summary && summary.totalTimeBalance < 0 ? TrendingDown : TrendingUp} loading={loading} dark />
        <StatCard label="Trabalhado no mes" value={formatMinutes(worked)} detail={`${monthTracks.length} jornadas registradas`} icon={Clock3} loading={loading} />
        <StatCard label="Horas positivas" value={formatMinutes(credits)} detail="creditos no periodo" icon={TrendingUp} loading={loading} />
        <StatCard label="Horas negativas" value={formatMinutes(debits)} detail="debitos no periodo" icon={TrendingDown} loading={loading} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
        <article className="overflow-hidden rounded-[22px] border border-black/10 bg-white">
          <header className="flex items-start justify-between border-b border-black/10 px-5 py-5">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">Evolucao mensal</p><h2 className="mt-1 text-lg font-black text-black">Banco de horas</h2></div>
            <div className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-black">Saldo do mes: {formatMinutes(credits - debits)}</div>
          </header>
          <div className="h-[280px] px-3 pb-4 pt-5">
            {chartData.length === 0 && !loading ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white"><Minus size={18} /></div>
                <p className="mt-3 text-sm font-black">Sem jornadas neste mes</p>
                <p className="mt-1 text-xs text-black/45">O grafico aparece conforme seus pontos forem registrados.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <defs><linearGradient id="employeeBalanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#111" stopOpacity={0.22} /><stop offset="100%" stopColor="#111" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="#e7e7e7" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#777', fontSize: 10 }} minTickGap={18} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#777', fontSize: 10 }} tickFormatter={axisMinutes} />
                  <ReferenceLine y={0} stroke="#111" strokeOpacity={0.3} />
                  <Tooltip content={<BalanceTooltip />} />
                  <Area type="monotone" dataKey="balance" stroke="#0b0b0c" strokeWidth={2.5} fill="url(#employeeBalanceFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="overflow-hidden rounded-[22px] border border-black/10 bg-[#f4f4f2]">
          <header className="flex items-center justify-between border-b border-black/10 px-5 py-5">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">Equipe</p><h2 className="mt-1 text-lg font-black">Aniversariantes</h2></div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white"><Cake size={17} /></div>
          </header>
          <div className="space-y-2 p-4">
            {loading && <p className="py-8 text-center text-xs font-bold text-black/40">Carregando aniversariantes...</p>}
            {!loading && birthdays.length === 0 && <div className="py-8 text-center"><p className="text-sm font-black">Nenhum aniversario neste mes</p><p className="mt-1 text-xs text-black/45">As datas da sua equipe aparecerao aqui.</p></div>}
            {birthdays.slice(0, 7).map((person) => (
              <div key={person.id} className="flex items-center gap-3 rounded-[14px] border border-black/10 bg-white px-3 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-xs font-black text-white">{person.name.trim().charAt(0).toUpperCase()}</div>
                <p className="min-w-0 flex-1 truncate text-xs font-black">{person.name}</p>
                <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-black text-white">{person.birthDate ? shortDate(person.birthDate) : 'Mes'}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-black/10 bg-white">
        <header className="flex items-center justify-between border-b border-black/10 px-5 py-5">
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">Historico</p><h2 className="mt-1 text-lg font-black">Jornadas recentes</h2></div>
          <Link href={`/${tenant}/dashboard/time-track`} className="inline-flex items-center gap-1 text-[11px] font-black hover:underline">Ver todos <ArrowRight size={13} /></Link>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead className="bg-[#f4f4f2]"><tr>{['Data', 'Entrada', 'Saida', 'Trabalhado', 'Saldo'].map((label) => <th key={label} className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-black/40">{label}</th>)}</tr></thead>
            <tbody>
              {recentTracks.map((track) => (
                <tr key={track.id} className="border-t border-black/[0.07] text-xs font-bold">
                  <td className="px-5 py-4"><span className="inline-flex items-center gap-2"><CalendarCheck size={14} />{new Date(`${track.date.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')}</span></td>
                  <td className="px-5 py-4">{formatTime(track.entry)}</td>
                  <td className="px-5 py-4">{formatTime(track.exit)}</td>
                  <td className="px-5 py-4">{formatMinutes(track.totalWorked ?? 0)}</td>
                  <td className="px-5 py-4"><BalancePill minutes={track.dailyBalance ?? 0} /></td>
                </tr>
              ))}
              {!loading && recentTracks.length === 0 && <tr><td colSpan={5} className="px-6 py-10 text-center text-xs font-bold text-black/40">Nenhuma jornada registrada neste mes.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, detail, icon: Icon, loading, dark = false }: { label: string; value: string; detail: string; icon: typeof Clock3; loading: boolean; dark?: boolean }) {
  return (
    <article className={`rounded-[18px] border p-5 ${dark ? 'border-black bg-black text-white' : 'border-black/10 bg-white text-black'}`}>
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-45">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${dark ? 'bg-white text-black' : 'bg-[#f0f0ed]'}`}><Icon size={15} /></div>
      </div>
      <p className="mt-5 text-2xl font-black">{loading ? '--' : value}</p>
      <p className="mt-1 text-[11px] font-bold opacity-45">{detail}</p>
    </article>
  );
}

function BalancePill({ minutes }: { minutes: number }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${minutes < 0 ? 'border border-black/20' : 'bg-black text-white'}`}>{formatMinutes(minutes)}</span>;
}

function BalanceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-[12px] bg-black px-3 py-2 text-white shadow-xl"><p className="text-[10px] text-white/50">{label}</p><p className="text-xs font-black">Saldo: {formatMinutes(payload[0].value ?? 0)}</p></div>;
}
