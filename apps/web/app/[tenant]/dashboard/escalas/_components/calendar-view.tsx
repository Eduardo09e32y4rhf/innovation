'use client';

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/app/components/ui';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { hubApi } from '../_lib/hub-api';
import { DAY_TYPE_LABEL, DAY_TYPE_STYLE, STATUS_DOT, STATUS_LABEL, WEEKDAYS, currentMonthKey, monthLabel, shiftMonth } from '../_lib/format';
import type { CalendarPayload, DayType, Overview } from '../_lib/types';

const CODE: Record<DayType, string> = {
  TRABALHO: '', COMPENSACAO: 'T', FOLGA: 'F', FERIADO: 'FE', FERIADO_LOCAL: 'FL', FERIAS: 'FÉ', ATESTADO: 'AT', SUSPENSAO: 'SU', AJUSTE_ESCALA: 'AJ', SEM_ESCALA: '–',
};

export type CalendarScope = 'me' | 'team' | 'company';

export function useScopes(overview: Overview) {
  const read = overview.capabilities['calendar.read'];
  const scopes: { id: CalendarScope; label: string }[] = [];
  if (overview.me?.employee && overview.capabilities.punch) scopes.push({ id: 'me', label: 'Eu' });
  if (read === 'team') scopes.push({ id: 'team', label: 'Minha equipe' });
  if (read === 'company') {
    if (overview.me?.employee) scopes.push({ id: 'team', label: 'Minha equipe' });
    scopes.push({ id: 'company', label: 'Empresa' });
  }
  if (!scopes.length && read === 'self') scopes.push({ id: 'me', label: 'Eu' });
  return scopes;
}

function MonthGrid({ data, onOpen }: { data: CalendarPayload; onOpen: (employeeId: string, date: string) => void }) {
  const employee = data.employees[0];
  if (!employee) return <p className="card-v2 p-6 text-sm text-fg-sub">Nenhum dado de escala para este mês.</p>;
  const offset = new Date(`${data.dates[0]}T00:00:00Z`).getUTCDay();
  return (
    <div className="card-v2 p-3 sm:p-4">
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-fg-sub" aria-hidden="true">{WEEKDAYS.map((day) => <div key={day}>{day}</div>)}</div>
      <ol className="mt-1.5 grid grid-cols-7 gap-1.5">
        {Array.from({ length: offset }).map((_, index) => <li key={`pad-${index}`} aria-hidden="true" />)}
        {employee.days.map((day, index) => {
          const date = data.dates[index];
          return (
            <li key={date}>
              <button type="button" onClick={() => onOpen(employee.id, date)}
                aria-label={`${date.split('-').reverse().join('/')}: ${DAY_TYPE_LABEL[day.type]}${day.entry ? ` ${day.entry} às ${day.exit}` : ''}${day.status ? `, ${STATUS_LABEL[day.status]}` : ''}`}
                className={`relative flex min-h-[64px] w-full flex-col items-center justify-start gap-0.5 rounded-lg border p-1 text-xs transition hover:shadow ${DAY_TYPE_STYLE[day.type]} ${date === data.today ? 'ring-2 ring-purple-500' : ''}`}>
                <span className="self-start text-[11px] font-semibold">{date.slice(8, 10)}</span>
                {day.entry ? <span className="text-[10px] leading-tight sm:text-xs">{day.entry}<br />{day.exit}</span> : <span className="text-[10px] leading-tight sm:text-xs">{day.holiday ?? DAY_TYPE_LABEL[day.type]}</span>}
                {day.status && <span className={`absolute right-1 top-1 h-2 w-2 rounded-full ${STATUS_DOT[day.status]}`} title={STATUS_LABEL[day.status]} />}
              </button>
            </li>
          );
        })}
      </ol>
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-sub">
      {(['TRABALHO', 'FOLGA', 'FERIADO', 'FERIAS', 'ATESTADO', 'COMPENSACAO'] as DayType[]).map((type) => <li key={type} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded border ${DAY_TYPE_STYLE[type]}`} />{DAY_TYPE_LABEL[type]}</li>)}
      {(['FALTA', 'ATRASO', 'PENDENTE', 'OK'] as const).map((status) => <li key={status} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[status]}`} />{STATUS_LABEL[status]}</li>)}
    </ul>
  );
}

function TeamGrid({ data, onOpen }: { data: CalendarPayload; onOpen: (employeeId: string, date: string) => void }) {
  if (!data.employees.length) return <p className="card-v2 p-6 text-sm text-fg-sub">Nenhum funcionário neste escopo.</p>;
  return (
    <div className="card-v2 overflow-auto" style={{ maxHeight: '70vh' }}>
      <table className="border-separate border-spacing-0 text-xs">
        <caption className="sr-only">Escala da equipe no mês</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 top-0 z-20 min-w-[170px] border-b border-r border-border bg-bg-elev px-3 py-2 text-left font-medium">Funcionário</th>
            {data.dates.map((date) => {
              const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
              return <th key={date} scope="col" className={`sticky top-0 z-10 min-w-[38px] border-b border-border bg-bg-elev px-1 py-1.5 text-center font-medium ${date === data.today ? 'text-purple-700' : dow === 0 || dow === 6 ? 'text-fg-sub' : ''}`}><div>{date.slice(8, 10)}</div><div className="text-[10px] font-normal">{WEEKDAYS[dow][0]}</div></th>;
            })}
          </tr>
        </thead>
        <tbody>
          {data.employees.map((employee) => (
            <tr key={employee.id}>
              <th scope="row" className="sticky left-0 z-10 border-b border-r border-border bg-bg-elev px-3 py-1.5 text-left font-medium"><span className="block truncate">{employee.name}</span><span className="block truncate text-[10px] font-normal text-fg-sub">{employee.department ?? ''}</span></th>
              {employee.days.map((day, index) => {
                const date = data.dates[index];
                return (
                  <td key={date} className="border-b border-border p-0.5">
                    <button type="button" onClick={() => onOpen(employee.id, date)} title={`${employee.name} · ${date.split('-').reverse().join('/')} · ${DAY_TYPE_LABEL[day.type]}${day.entry ? ` ${day.entry}–${day.exit}` : ''}`}
                      aria-label={`${employee.name}, ${date.split('-').reverse().join('/')}: ${DAY_TYPE_LABEL[day.type]}`}
                      className={`relative flex h-8 w-full items-center justify-center rounded border text-[10px] font-semibold ${DAY_TYPE_STYLE[day.type]}`}>
                      {CODE[day.type] || (day.entry ? day.entry.slice(0, 2) : '')}
                      {day.status && day.status !== 'OK' && <span className={`absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full ${STATUS_DOT[day.status]}`} />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-3"><Legend /></div>
    </div>
  );
}

export function CalendarView({ overview, month, setMonth, onOpenDay, onLaunch, onNewRequest }: {
  overview: Overview; month: string; setMonth: (month: string) => void;
  onOpenDay: (employeeId: string, date: string) => void; onLaunch: (employeeId?: string) => void; onNewRequest: () => void;
}) {
  const scopes = useScopes(overview);
  const [scope, setScope] = useState<CalendarScope>(scopes[0]?.id ?? 'me');
  const [department, setDepartment] = useState('');
  useEffect(() => { if (scopes.length && !scopes.some((item) => item.id === scope)) setScope(scopes[0].id); }, [scopes, scope]);

  const calendar = useQuery(() => hubApi.calendar(month, scope, department || undefined), [month, scope, department], { enabled: scopes.length > 0 });
  const departments = useMemo(() => [...new Set((calendar.data?.employees ?? []).map((employee) => employee.department).filter(Boolean))] as string[], [calendar.data]);
  const canLaunch = Boolean(overview.capabilities['schedule.write']);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft size={16} /></Button>
          <h2 className="min-w-[160px] text-center text-base font-semibold capitalize">{monthLabel(month)}</h2>
          <Button variant="outline" size="sm" aria-label="Próximo mês" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight size={16} /></Button>
          {month !== currentMonthKey() && <Button variant="ghost" size="sm" onClick={() => setMonth(currentMonthKey())}>Hoje</Button>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {scopes.length > 1 && (
            <div className="inline-flex overflow-hidden rounded-lg border border-border" role="group" aria-label="Escopo">
              {scopes.map((item) => <button key={item.label} type="button" aria-pressed={scope === item.id} onClick={() => setScope(item.id)} className={`px-3 py-2 text-sm ${scope === item.id ? 'bg-purple-600 text-white' : 'hover:bg-bg-sub'}`}>{item.label}</button>)}
            </div>
          )}
          {scope === 'company' && departments.length > 1 && (
            <select aria-label="Setor" className="input-v2 text-sm" value={department} onChange={(event) => setDepartment(event.target.value)}>
              <option value="">Todos os setores</option>{departments.map((item) => <option key={item}>{item}</option>)}
            </select>
          )}
          {canLaunch && <Button onClick={() => onLaunch()}><Plus size={16} aria-hidden="true" /> Lançar escala</Button>}
          {overview.capabilities['requests.create'] && scope === 'me' && <Button variant="outline" onClick={onNewRequest}>Nova solicitação</Button>}
        </div>
      </div>

      {calendar.error && <ErrorState message={calendar.error} onRetry={calendar.refetch} />}
      {calendar.loading && !calendar.data ? <LoadingState label="Carregando escala…" /> : calendar.data ? (scope === 'me' ? <MonthGrid data={calendar.data} onOpen={onOpenDay} /> : <TeamGrid data={calendar.data} onOpen={onOpenDay} />) : null}
      <p className="text-xs text-fg-sub">Clique em um dia para ver o detalhe, as batidas e solicitar ajustes.</p>
    </div>
  );
}
