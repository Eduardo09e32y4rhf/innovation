'use client';

import { AlertTriangle, CalendarPlus, ClipboardCheck, Users } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { hubApi } from '../_lib/hub-api';
import { DAY_TYPE_LABEL, DAY_TYPE_STYLE, WEEKDAYS, fmtDate, fmtMinutes, shiftMonth } from '../_lib/format';
import type { HubView } from '@/app/lib/schedule-access';
import type { Overview, TeamPerson } from '../_lib/types';
import { PunchWidget } from './punch-widget';

interface Props {
  overview: Overview;
  onNavigate: (view: HubView) => void;
  onOpenDay: (employeeId: string, date: string) => void;
  onNewRequest: () => void;
  onLaunch: (employeeId?: string) => void;
  refresh: () => void;
}

function Stat({ label, value, tone = 'default', hint }: { label: string; value: number | string; tone?: 'default' | 'warn' | 'bad' | 'good'; hint?: string }) {
  const tones = { default: 'text-fg', warn: 'text-amber-600', bad: 'text-rose-600', good: 'text-emerald-600' };
  return (
    <article className="card-v2 p-4">
      <p className="text-sm text-fg-sub">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-fg-sub">{hint}</p>}
    </article>
  );
}

function WeekStrip({ employeeId, today, month }: { employeeId: string; today: string; month: string }) {
  const nextMonthNeeded = Number(today.slice(8, 10)) > 24;
  const current = useQuery(() => hubApi.calendar(month, 'me'), [month]);
  const next = useQuery(() => hubApi.calendar(shiftMonth(month, 1), 'me'), [month], { enabled: nextMonthNeeded });
  const days = useMemo(() => {
    const rows = [...(current.data?.employees[0]?.days.map((day, index) => ({ date: current.data!.dates[index], ...day })) ?? []), ...(next.data?.employees[0]?.days.map((day, index) => ({ date: next.data!.dates[index], ...day })) ?? [])];
    const start = rows.findIndex((row) => row.date === today);
    return start < 0 ? [] : rows.slice(start, start + 7);
  }, [current.data, next.data, today]);
  void employeeId;
  return (
    <section aria-label="Minha semana" className="card-v2 p-4">
      <h2 className="mb-3 text-sm font-semibold">Minha semana</h2>
      {days.length === 0 ? <p className="text-sm text-fg-sub">{current.loading ? 'Carregando…' : 'Sem escala atribuída. Procure o RH.'}</p> : (
        <ol className="grid grid-cols-7 gap-1.5 text-center">
          {days.map((day) => (
            <li key={day.date} className={`rounded-lg border p-1.5 text-xs ${DAY_TYPE_STYLE[day.type]} ${day.date === today ? 'ring-2 ring-purple-500' : ''}`}>
              <p className="font-semibold">{WEEKDAYS[new Date(`${day.date}T00:00:00Z`).getUTCDay()]}</p>
              <p className="text-[11px] opacity-80">{day.date.slice(8, 10)}</p>
              <p className="mt-1 leading-tight">{day.entry ? `${day.entry}\n${day.exit}` : DAY_TYPE_LABEL[day.type]}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function EmployeeToday({ overview, onNavigate, onNewRequest, refresh }: Props) {
  const me = overview.me;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {overview.capabilities.punch && me ? <PunchWidget onPunched={refresh} /> : (
        <section className="card-v2 p-6 text-sm text-fg-sub">Seu perfil não registra ponto por aqui.</section>
      )}
      <div className="space-y-5">
        {me?.employee && overview.capabilities.punch && <WeekStrip employeeId={me.employee.id} today={overview.today} month={overview.today.slice(0, 7)} />}
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Banco de horas" value={fmtMinutes(me?.bankBalance ?? 0, true)} tone={(me?.bankBalance ?? 0) < 0 ? 'bad' : 'good'} />
          <Stat label="Solicitações em andamento" value={me?.pendingRequests ?? 0} />
        </div>
        {overview.capabilities['requests.create'] && (
          <div className="card-v2 space-y-3 p-4">
            <h2 className="text-sm font-semibold">Precisa de alguma coisa?</h2>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onNewRequest}><CalendarPlus size={16} aria-hidden="true" /> Nova solicitação</Button>
              <Button variant="outline" onClick={() => onNavigate('ponto')}>Meu espelho de ponto</Button>
              <Button variant="outline" onClick={() => onNavigate('solicitacoes')}>Ver minhas solicitações</Button>
            </div>
            <p className="text-xs text-fg-sub">Troca de folga, troca de turno, nova escala, ajuste de batida ou justificativa — tudo com acompanhamento.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_CHIP: Record<string, string> = {
  TRABALHANDO: 'bg-emerald-50 text-emerald-700', ENCERRADO: 'bg-zinc-100 text-zinc-600', ATRASADO: 'bg-rose-50 text-rose-700',
  AGUARDANDO: 'bg-amber-50 text-amber-700', FERIAS: 'bg-sky-50 text-sky-700', SEM_ESCALA: 'bg-white text-zinc-500 border border-dashed border-zinc-300',
};

function TeamPanel({ overview, onOpenDay, onLaunch }: Pick<Props, 'overview' | 'onOpenDay' | 'onLaunch'>) {
  const team = overview.team;
  if (!team) return null;
  const canLaunch = Boolean(overview.capabilities['schedule.write']);
  const order = (person: TeamPerson) => ({ ATRASADO: 0, SEM_ESCALA: 1, AGUARDANDO: 2, TRABALHANDO: 3, ENCERRADO: 4 } as Record<string, number>)[person.status] ?? 5;
  const people = [...team.people].sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name));
  return (
    <section aria-label="Equipe hoje" className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
        <Stat label="Trabalhando" value={team.counts.working} tone="good" />
        <Stat label="Atrasados" value={team.counts.late} tone={team.counts.late ? 'bad' : 'default'} />
        <Stat label="Aguardando entrada" value={team.counts.waiting} />
        <Stat label="Já encerraram" value={team.counts.finished} />
        <Stat label="Folga / férias" value={team.counts.off + team.counts.vacation} />
        <Stat label="Sem escala" value={team.counts.noSchedule} tone={team.counts.noSchedule ? 'warn' : 'default'} />
      </div>
      <div className="card-v2 overflow-hidden">
        <ul className="divide-y divide-border">
          {people.slice(0, 80).map((person) => (
            <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <button type="button" className="min-w-0 text-left" onClick={() => onOpenDay(person.id, overview.today)}>
                <p className="truncate text-sm font-medium hover:underline">{person.name}</p>
                <p className="text-xs text-fg-sub">{person.department ?? 'Sem setor'}{person.entry ? ` · ${person.entry}–${person.exit}` : ''}</p>
              </button>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CHIP[person.status] ?? 'bg-zinc-100 text-zinc-600'}`}>{person.label}</span>
                {person.status === 'SEM_ESCALA' && canLaunch && <Button size="sm" variant="outline" onClick={() => onLaunch(person.id)}>Atribuir escala</Button>}
              </div>
            </li>
          ))}
          {people.length === 0 && <li className="p-6 text-center text-sm text-fg-sub">Nenhum funcionário no seu escopo.</li>}
        </ul>
      </div>
    </section>
  );
}

function PendingBanner({ overview, onNavigate }: Pick<Props, 'overview' | 'onNavigate'>) {
  const pending = overview.pending;
  if (!pending || pending.total === 0) return null;
  return (
    <button type="button" onClick={() => onNavigate('aprovacoes')} className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-left hover:bg-amber-100">
      <span className="flex items-center gap-3"><ClipboardCheck size={22} className="text-amber-700" aria-hidden="true" />
        <span><strong className="block text-sm text-amber-900">{pending.total} item(ns) aguardando sua decisão</strong>
          <span className="text-xs text-amber-800">{pending.requests} solicitação(ões) · {pending.punches} ponto(s) fora do local/manuais · {pending.overtime} hora(s) extra</span></span>
      </span>
      <span className="text-sm font-medium text-amber-900">Decidir →</span>
    </button>
  );
}

function HrPanel({ overview, onLaunch }: Pick<Props, 'overview' | 'onLaunch'>) {
  const hr = overview.hr;
  if (!hr) return null;
  const closing = hr.closing;
  return (
    <section aria-label="Painel do RH" className="grid gap-3 lg:grid-cols-3">
      <article className="card-v2 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle size={16} className={hr.withoutScheduleCount ? 'text-amber-600' : 'text-emerald-600'} aria-hidden="true" /> Sem escala ({hr.withoutScheduleCount})</h2>
        {hr.withoutScheduleCount === 0 ? <p className="mt-2 text-sm text-fg-sub">Todos os funcionários ativos têm escala.</p> : (
          <ul className="mt-2 space-y-1.5 text-sm">
            {hr.withoutSchedule.slice(0, 6).map((person) => (
              <li key={person.id} className="flex items-center justify-between gap-2"><span className="truncate">{person.name}</span><Button size="sm" variant="outline" onClick={() => onLaunch(person.id)}>Atribuir</Button></li>
            ))}
            {hr.withoutScheduleCount > 6 && <li className="text-xs text-fg-sub">+ {hr.withoutScheduleCount - 6} funcionário(s)</li>}
          </ul>
        )}
      </article>
      <article className="card-v2 p-4">
        <h2 className="text-sm font-semibold">Ponto de hoje</h2>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{hr.punchedToday}<span className="text-sm font-normal text-fg-sub"> / {hr.activeEmployees} bateram</span></p>
      </article>
      <article className="card-v2 p-4">
        <h2 className="text-sm font-semibold">Fechamento do mês</h2>
        <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
          {[['DRAFT', 'Rascunho'], ['IN_REVIEW', 'Em revisão'], ['APPROVED', 'Aprovado'], ['CLOSED', 'Fechado']].map(([key, label]) => (
            <div key={key} className="flex justify-between gap-2"><dt className="text-fg-sub">{label}</dt><dd className="font-medium tabular-nums">{closing[key] ?? 0}</dd></div>
          ))}
        </dl>
      </article>
    </section>
  );
}

function ExecPanel({ overview }: Pick<Props, 'overview'>) {
  const data = overview.indicators;
  if (!data) return null;
  const t = data.totals;
  return (
    <section aria-label="Indicadores do mês" className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Horas trabalhadas" value={fmtMinutes(t.worked)} />
        <Stat label="Horas extras (50%+100%)" value={fmtMinutes(t.overtime50 + t.overtime100)} tone={t.overtime50 + t.overtime100 > 0 ? 'warn' : 'default'} />
        <Stat label="Atrasos" value={fmtMinutes(t.late)} />
        <Stat label="Faltas (dias)" value={t.absences} tone={t.absences ? 'bad' : 'default'} />
        <Stat label="Banco de horas (total)" value={fmtMinutes(t.bankBalance, true)} />
      </div>
      <div className="card-v2 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <caption className="sr-only">Indicadores por setor</caption>
          <thead className="border-b border-border bg-bg-sub text-fg-sub"><tr>{['Setor', 'Pessoas', 'Horas', 'Horas extras', 'Atrasos', 'Faltas'].map((label) => <th key={label} scope="col" className="px-4 py-2.5 font-medium">{label}</th>)}</tr></thead>
          <tbody>{data.byDepartment.map((row) => (
            <tr key={row.department} className="border-b border-border last:border-0"><th scope="row" className="px-4 py-2.5 font-medium">{row.department}</th><td className="px-4 py-2.5">{row.employees}</td><td className="px-4 py-2.5">{fmtMinutes(row.worked)}</td><td className="px-4 py-2.5">{fmtMinutes(row.overtime)}</td><td className="px-4 py-2.5">{fmtMinutes(row.late)}</td><td className="px-4 py-2.5">{row.absences}</td></tr>
          ))}
          {data.byDepartment.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-fg-sub">Sem registros no mês.</td></tr>}</tbody>
        </table>
      </div>
    </section>
  );
}

export function TodayView(props: Props) {
  const { overview } = props;
  const caps = overview.capabilities;
  const showEmployee = Boolean(caps.punch || caps['requests.create']);
  const team = overview.team;
  const execOnly = !showEmployee && Boolean(overview.indicators);

  return (
    <div className="space-y-5">
      <PendingBanner overview={overview} onNavigate={props.onNavigate} />
      {showEmployee && <EmployeeToday {...props} />}
      {team && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold"><Users size={18} aria-hidden="true" /> {caps['calendar.read'] === 'team' ? 'Minha equipe hoje' : 'Equipe hoje'} <span className="text-sm font-normal text-fg-sub">· {fmtDate(overview.today)}</span></h2>
          <TeamPanel overview={overview} onOpenDay={props.onOpenDay} onLaunch={props.onLaunch} />
        </div>
      )}
      <HrPanel overview={overview} onLaunch={props.onLaunch} />
      {(execOnly || (overview.indicators && !caps['closing.write'])) && <ExecPanel overview={overview} />}
      {!showEmployee && !team && !overview.indicators && <p className="card-v2 p-6 text-sm text-fg-sub">Use o menu acima para acessar suas áreas.</p>}
    </div>
  );
}
