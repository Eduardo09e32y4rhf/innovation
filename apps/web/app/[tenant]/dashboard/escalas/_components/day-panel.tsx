'use client';

import { ExternalLink, MapPin } from 'lucide-react';
import { Button, Drawer } from '@/app/components/ui';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { hubApi } from '../_lib/hub-api';
import { DAY_TYPE_LABEL, DAY_TYPE_STYLE, REQUEST_STATUS_LABEL, fmtDateLong, fmtTime } from '../_lib/format';
import type { Overview, RequestType } from '../_lib/types';

const ORIGIN_LABEL: Record<string, string> = { APP: 'App', AJUSTE: 'Ajuste aprovado', MANUAL: 'Manual' };
const FLAG_LABEL: Record<string, string> = { FORA_DA_CERCA: 'Fora do local', SALTO_DE_POSICAO: 'Posição suspeita', AJUSTE_APROVADO: 'Ajuste aprovado' };
const EVENT_LABEL: Record<string, string> = { ENTRY: 'Entrada', LUNCH_START: 'Saída p/ intervalo', LUNCH_RETURN: 'Volta do intervalo', EXIT: 'Saída' };

export function DayPanel({ target, overview, onClose, onRequest, onOverride }: {
  target: { employeeId: string; date: string } | null;
  overview: Overview;
  onClose: () => void;
  onRequest: (type: RequestType, prefill: Record<string, unknown>) => void;
  onOverride: (employeeId: string, date: string) => void;
}) {
  const detail = useQuery(() => hubApi.day(target!.employeeId, target!.date), [target?.employeeId, target?.date], { enabled: Boolean(target) });
  const data = detail.data;
  const mine = Boolean(target && overview.me?.employee.id === target.employeeId);
  const canWrite = Boolean(overview.capabilities['schedule.write']);
  const today = overview.today;

  return (
    <Drawer isOpen={Boolean(target)} onClose={onClose} title={target ? fmtDateLong(target.date) : ''} description={data?.employee?.name} maxWidth="max-w-lg">
      {detail.loading && !data ? <LoadingState label="Carregando dia…" /> : detail.error ? <ErrorState message={detail.error} onRetry={detail.refetch} /> : !data || !target ? null : (
        <div className="space-y-5">
          <section className={`rounded-xl border p-4 ${DAY_TYPE_STYLE[data.scheduled.type]}`}>
            <p className="text-xs uppercase tracking-wide opacity-70">Escala</p>
            <p className="text-lg font-semibold">{data.scheduled.working ? `${data.scheduled.entry} – ${data.scheduled.exit}` : DAY_TYPE_LABEL[data.scheduled.type]}</p>
            <p className="text-sm opacity-80">{[data.scheduled.scheduleName, data.scheduled.holidayName, data.scheduled.exceptionReason].filter(Boolean).join(' · ')}</p>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Batidas</h3>
            {data.events.length === 0 ? <p className="text-sm text-fg-sub">Nenhuma batida registrada neste dia.</p> : (
              <ul className="space-y-2">
                {data.events.map((event) => (
                  <li key={event.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2"><span className="font-medium">{EVENT_LABEL[event.type] ?? event.type}</span><span className="font-mono font-semibold tabular-nums">{fmtTime(event.occurredAt)}</span></div>
                    <p className="mt-0.5 text-xs text-fg-sub">{ORIGIN_LABEL[event.origin] ?? event.origin}{event.withinFence === true ? ' · dentro do local' : event.withinFence === false ? ` · fora do local (${event.distanceMeters} m)` : ''}</p>
                    {event.address && <p className="mt-1 flex items-start gap-1 text-xs"><MapPin size={12} className="mt-0.5 shrink-0" aria-hidden="true" />{event.address}</p>}
                    {event.latitude != null && event.longitude != null && (
                      <a className="mt-1 inline-flex items-center gap-1 text-xs text-purple-700 underline" target="_blank" rel="noreferrer noopener" href={`https://www.openstreetmap.org/?mlat=${event.latitude}&mlon=${event.longitude}#map=18/${event.latitude}/${event.longitude}`}>Ver no mapa{event.accuracyMeters ? ` (±${Math.round(event.accuracyMeters)} m)` : ''} <ExternalLink size={11} aria-hidden="true" /></a>
                    )}
                    {event.flags.length > 0 && <p className="mt-1 text-xs text-amber-700">{event.flags.map((flag) => FLAG_LABEL[flag] ?? flag).join(' · ')}</p>}
                    {event.justification && <p className="mt-1 text-xs italic">“{event.justification}”</p>}
                    <p className="mt-1 font-mono text-[10px] text-fg-sub">Comprovante {event.receipt}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {data.occurrence && (
            <p role="status" className={`rounded-lg border px-3 py-2 text-sm font-semibold ${data.occurrence === 'Sem ocorrência' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{data.occurrence}</p>
          )}

          <section>
            <h3 className="mb-2 text-sm font-semibold">Como o dia foi calculado</h3>
            <dl className="divide-y divide-border rounded-lg border border-border text-sm">
              {data.explain.map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-3 px-3 py-2"><dt className="text-fg-sub">{row.label}{row.hint && <span className="block text-xs">{row.hint}</span>}</dt><dd className="font-medium tabular-nums">{row.value}</dd></div>
              ))}
            </dl>
          </section>

          {(data.occurrences.length > 0 || data.requests.length > 0) && (
            <section className="space-y-2 text-sm">
              <h3 className="text-sm font-semibold">Registros do dia</h3>
              {data.occurrences.map((item) => <p key={item.id} className="rounded-lg bg-bg-sub p-2.5">{item.type.replace(/_/g, ' ').toLowerCase()} · {item.minutes} min · {item.status === 'APPROVED' ? 'aprovada' : item.status === 'REJECTED' ? 'reprovada' : 'pendente'}{item.reason ? ` — ${item.reason}` : ''}</p>)}
              {data.requests.map((item) => <p key={item.id} className="rounded-lg bg-bg-sub p-2.5">Solicitação {item.type.replace(/_/g, ' ').toLowerCase()} · {REQUEST_STATUS_LABEL[item.status] ?? item.status}</p>)}
            </section>
          )}

          <section className="flex flex-wrap gap-2 border-t border-border pt-4">
            {mine && target.date <= today && <Button variant="outline" onClick={() => onRequest('AJUSTE_BATIDA', { date: target.date })}>Ajustar batida</Button>}
            {mine && target.date <= today && data.scheduled.working && <Button variant="outline" onClick={() => onRequest('JUSTIFICATIVA', { date: target.date })}>Justificar</Button>}
            {mine && target.date >= today && data.scheduled.working && <Button variant="outline" onClick={() => onRequest('TROCA_FOLGA', { offDate: target.date })}>Trocar folga</Button>}
            {mine && target.date >= today && data.scheduled.working && <Button variant="outline" onClick={() => onRequest('TROCA_TURNO', { date: target.date })}>Trocar turno</Button>}
            {canWrite && <Button onClick={() => onOverride(target.employeeId, target.date)}>Alterar este dia</Button>}
          </section>
        </div>
      )}
    </Drawer>
  );
}
