'use client';

import { ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/app/lib/api';
import { Button } from '@/app/components/ui';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { can } from '@/app/lib/schedule-access';
import { hubApi } from '../_lib/hub-api';
import { DAY_TYPE_LABEL, DAY_TYPE_STYLE, STATUS_DOT, STATUS_LABEL, WEEKDAYS, currentMonthKey, errorMessage, fmtMinutes, fmtTime, monthLabel, shiftMonth } from '../_lib/format';
import type { Overview } from '../_lib/types';
import { PunchWidget } from './punch-widget';

export function TimesheetView({ overview, month, setMonth, initialEmployeeId, onOpenDay, onNewRequest, refresh }: {
  overview: Overview; month: string; setMonth: (month: string) => void; initialEmployeeId?: string;
  onOpenDay: (employeeId: string, date: string) => void; onNewRequest: () => void; refresh: () => void;
}) {
  const role = overview.role;
  const myId = overview.me?.employee.id;
  const read = overview.capabilities['calendar.read'];
  const canPick = read === 'team' || read === 'company';
  const [employeeId, setEmployeeId] = useState<string | undefined>(initialEmployeeId ?? myId);
  useEffect(() => { if (!employeeId && myId) setEmployeeId(myId); }, [employeeId, myId]);

  const picker = useQuery(() => hubApi.calendar(month, read === 'company' ? 'company' : 'team'), [month, read], { enabled: canPick });
  const sheet = useQuery(() => hubApi.timesheet(month, employeeId), [month, employeeId], { enabled: Boolean(employeeId) });
  const [downloading, setDownloading] = useState(false);
  const data = sheet.data;
  const self = employeeId === myId;

  async function downloadPdf() {
    if (!employeeId) return;
    setDownloading(true);
    try { await api.timeClosing.downloadCollectivePdf(month, [employeeId]); }
    catch (cause) { toast.error(errorMessage(cause, 'Não foi possível gerar o PDF.')); }
    finally { setDownloading(false); }
  }

  return (
    <div className={`grid gap-5 ${overview.capabilities.punch ? 'xl:grid-cols-[380px_minmax(0,1fr)]' : ''}`}>
      {overview.capabilities.punch && <div className="xl:sticky xl:top-4 xl:self-start"><PunchWidget onPunched={() => { sheet.refetch(); refresh(); }} /></div>}

      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft size={16} /></Button>
            <h2 className="min-w-[150px] text-center text-base font-semibold capitalize">{monthLabel(month)}</h2>
            <Button variant="outline" size="sm" aria-label="Próximo mês" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight size={16} /></Button>
            {month !== currentMonthKey() && <Button variant="ghost" size="sm" onClick={() => setMonth(currentMonthKey())}>Hoje</Button>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canPick && (
              <select aria-label="Funcionário" className="input-v2 text-sm" value={employeeId ?? ''} onChange={(event) => setEmployeeId(event.target.value)}>
                {myId && <option value={myId}>Meu espelho</option>}
                {(picker.data?.employees ?? []).filter((employee) => employee.id !== myId).map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </select>
            )}
            {can(role, 'closing.read') && <Button variant="outline" size="sm" isLoading={downloading} onClick={downloadPdf}><FileDown size={15} aria-hidden="true" /> Folha em PDF</Button>}
            {self && overview.capabilities['requests.create'] && <Button size="sm" onClick={onNewRequest}>Solicitar ajuste</Button>}
          </div>
        </div>

        {sheet.error && <ErrorState message={sheet.error} onRetry={sheet.refetch} />}
        {sheet.loading && !data ? <LoadingState label="Carregando espelho…" /> : data ? (
          <>
            <p className="text-sm"><strong>{data.employee?.name}</strong> <span className="text-fg-sub">· {data.employee?.position ?? ''} {data.employee?.department ? `· ${data.employee.department}` : ''}</span>
              {data.closing && <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs">Fechamento: {({ DRAFT: 'rascunho', IN_REVIEW: 'em revisão', APPROVED: 'aprovado', CLOSED: 'fechado' } as Record<string, string>)[data.closing.status] ?? data.closing.status}</span>}</p>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {([['Trabalhado', fmtMinutes(data.totals.worked)], ['Saldo do mês', fmtMinutes(data.totals.balance, true)], ['Atrasos', fmtMinutes(data.totals.late)], ['HE 50%', fmtMinutes(data.totals.overtime50)], ['HE 100%', fmtMinutes(data.totals.overtime100)], ['Faltas', String(data.totals.absences)], ['Banco de horas', fmtMinutes(data.totals.bankBalance, true)]] as const).map(([label, value]) => (
                <div key={label} className="card-v2 p-3"><dt className="text-xs text-fg-sub">{label}</dt><dd className="mt-0.5 text-base font-semibold tabular-nums">{value}</dd></div>
              ))}
            </dl>
            <div className="card-v2 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">Espelho de ponto do mês</caption>
                <thead className="border-b border-border bg-bg-sub text-xs text-fg-sub"><tr>{['Dia', 'Escala', 'Entrada', 'Intervalo', 'Saída', 'Trabalhado', 'Saldo', 'Situação'].map((label) => <th key={label} scope="col" className="px-3 py-2.5 font-medium">{label}</th>)}</tr></thead>
                <tbody>
                  {data.days.map((day) => (
                    <tr key={day.date} className="cursor-pointer border-b border-border last:border-0 hover:bg-bg-sub" onClick={() => data.employee && onOpenDay(data.employee.id, day.date)}>
                      <th scope="row" className="whitespace-nowrap px-3 py-2 font-medium">{day.date.slice(8, 10)} <span className="font-normal text-fg-sub">{WEEKDAYS[day.dayOfWeek]}</span></th>
                      <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-xs ${DAY_TYPE_STYLE[day.type]}`}>{day.scheduled.entry ? `${day.scheduled.entry}–${day.scheduled.exit}` : day.holiday ?? DAY_TYPE_LABEL[day.type]}</span></td>
                      <td className="px-3 py-2 tabular-nums">{fmtTime(day.entry)}</td>
                      <td className="px-3 py-2 tabular-nums">{day.lunchStart ? `${fmtTime(day.lunchStart)}–${fmtTime(day.lunchReturn)}` : '—'}</td>
                      <td className="px-3 py-2 tabular-nums">{fmtTime(day.exit)}</td>
                      <td className="px-3 py-2 tabular-nums">{fmtMinutes(day.worked)}</td>
                      <td className="px-3 py-2 tabular-nums">{day.balance === null ? '—' : fmtMinutes(day.balance, true)}</td>
                      <td className="px-3 py-2">{day.status ? <span className="inline-flex items-center gap-1.5 text-xs"><span className={`h-2 w-2 rounded-full ${STATUS_DOT[day.status]}`} />{STATUS_LABEL[day.status]}</span> : <span className="text-xs text-fg-sub">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : !employeeId ? <p className="card-v2 p-6 text-sm text-fg-sub">Seu usuário não está vinculado a um funcionário.</p> : null}
      </div>
    </div>
  );
}
