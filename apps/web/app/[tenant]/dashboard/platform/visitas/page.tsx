'use client';

import { Eye, MapPin, MonitorSmartphone, MousePointerClick, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { api, type VisitRow } from '@/app/lib/api';

const PERIODS = [7, 30, 90] as const;
const DEVICE_LABEL: Record<string, string> = { mobile: 'Celular', tablet: 'Tablet', desktop: 'Computador' };
const numberFmt = new Intl.NumberFormat('pt-BR');

function countryName(code: string | null) {
  if (!code) return 'Não identificado';
  try { return new Intl.DisplayNames(['pt-BR'], { type: 'region' }).of(code) ?? code; } catch { return code; }
}

function placeLabel(parts: Array<string | null>) {
  const text = parts.filter(Boolean).join(', ');
  return text || 'Não identificado';
}

function dateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function shortDay(day: string) {
  const [, month, date] = day.split('-');
  return `${date}/${month}`;
}

function Kpi({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="card-v2 p-4">
      <div className="flex items-center gap-2 text-sm text-fg-sub" aria-hidden="true">{icon}<span>{label}</span></div>
      <p className="mt-2 text-2xl font-semibold text-fg">{value}</p>
      {hint && <p className="mt-1 text-xs text-fg-mut">{hint}</p>}
    </div>
  );
}

function Ranking({ title, rows }: { title: string; rows: Array<{ label: string } & VisitRow> }) {
  const max = Math.max(1, ...rows.map((row) => row.views));
  return (
    <section className="card-v2 p-4" aria-label={title}>
      <h2 className="text-sm font-semibold text-fg">{title}</h2>
      {rows.length === 0 ? <p className="mt-3 text-sm text-fg-mut">Sem dados no período.</p> : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.label} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-fg" title={row.label}>{row.label}</span>
                <span className="shrink-0 text-fg-sub">{numberFmt.format(row.views)} <span className="text-fg-mut">· {numberFmt.format(row.visitors)} únicos</span></span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(3, (row.views / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function VisitasPage() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [page, setPage] = useState(1);
  const summary = useQuery(() => api.platform.visits.summary(days), [days], { pollMs: 60_000 });
  const recent = useQuery(() => api.platform.visits.recent(page, 25), [page], { pollMs: 60_000 });

  const data = summary.data;
  const maxDay = Math.max(1, ...(data?.byDay.map((item) => item.views) ?? [1]));
  const totalPages = recent.data ? Math.max(1, Math.ceil(recent.data.total / recent.data.limit)) : 1;

  return (
    <div className="space-y-5 px-3 py-4 sm:px-5 lg:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-fg"><Eye size={20} aria-hidden="true" /> Visitas do site</h1>
          <p className="mt-1 max-w-2xl text-sm text-fg-sub">Acessos à landing page de quem aceitou as estatísticas no aviso de cookies. Sem guardar IP: só data, hora e lugar aproximado. Quem recusou, quem ativou &quot;não rastrear&quot; e os robôs não entram, então o total é menor que o número real de visitantes.</p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Período">
          {PERIODS.map((value) => (
            <button key={value} type="button" className={`btn ${days === value ? 'btn-primary' : 'btn-outline'}`} aria-pressed={days === value} onClick={() => setDays(value)}>{value} dias</button>
          ))}
        </div>
      </header>

      {summary.loading && !data ? <LoadingState label="Carregando visitas…" /> : summary.error && !data ? <ErrorState message={summary.error} onRetry={summary.refetch} /> : data && (
        <>
          {!data.geoReady && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">A base de localização não foi encontrada no servidor: as visitas estão sendo contadas, mas sem o lugar.</p>}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi icon={<MousePointerClick size={16} />} label="Visualizações" value={numberFmt.format(data.totals.views)} hint={`Últimos ${data.period.days} dias`} />
            <Kpi icon={<Users size={16} />} label="Visitantes únicos" value={numberFmt.format(data.totals.visitors)} hint="Contados por dia" />
            <Kpi icon={<Eye size={16} />} label="Hoje" value={numberFmt.format(data.totals.today.views)} hint={`${numberFmt.format(data.totals.today.visitors)} visitantes`} />
            <Kpi icon={<MonitorSmartphone size={16} />} label="Média por dia" value={numberFmt.format(data.totals.avgViewsPerDay)} hint="Visualizações" />
          </div>

          <section className="card-v2 p-4" aria-label="Visualizações por dia">
            <h2 className="text-sm font-semibold text-fg">Visualizações por dia</h2>
            <div className="mt-4 flex h-40 items-end gap-px sm:gap-0.5" role="img" aria-label={`Gráfico de ${data.byDay.length} dias, de ${shortDay(data.period.from)} a ${shortDay(data.period.to)}, com ${numberFmt.format(data.totals.views)} visualizações`}>
              {data.byDay.map((item) => (
                <div key={item.day} className="flex h-full min-w-0 flex-1 items-end" title={`${shortDay(item.day)}: ${item.views} visualizações, ${item.visitors} visitantes`}>
                  <div className={`w-full rounded-t ${item.views ? 'bg-brand' : 'bg-border'}`} style={{ height: `${item.views ? Math.max(4, (item.views / maxDay) * 100) : 2}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-fg-mut" aria-hidden="true"><span>{shortDay(data.period.from)}</span><span>{shortDay(data.period.to)}</span></div>
          </section>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Ranking title="Países" rows={data.countries.map((row) => ({ ...row, label: countryName(row.country) }))} />
            <Ranking title="Estados" rows={data.regions.map((row) => ({ ...row, label: placeLabel([row.region, row.country ? countryName(row.country) : null]) }))} />
            <Ranking title="Cidades" rows={data.cities.map((row) => ({ ...row, label: placeLabel([row.city, row.region]) }))} />
            <Ranking title="Dispositivos" rows={data.devices.map((row) => ({ ...row, label: DEVICE_LABEL[row.device ?? ''] ?? 'Outro' }))} />
            <Ranking title="Navegadores" rows={data.browsers.map((row) => ({ ...row, label: row.browser ?? 'Outro' }))} />
            <Ranking title="De onde vieram" rows={data.referrers.map((row) => ({ ...row, label: row.referrer ?? 'Direto' }))} />
          </div>
        </>
      )}

      <section className="card-v2 p-4" aria-label="Acessos recentes">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg"><MapPin size={16} aria-hidden="true" /> Acessos recentes</h2>
        {recent.loading && !recent.data ? <LoadingState label="Carregando acessos…" /> : recent.error && !recent.data ? <ErrorState message={recent.error} onRetry={recent.refetch} /> : recent.data && (
          recent.data.items.length === 0 ? <p className="mt-3 text-sm text-fg-mut">Nenhum acesso registrado ainda.</p> : (
            <>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs text-fg-mut"><tr><th className="py-2 pr-3 font-medium">Data e hora</th><th className="py-2 pr-3 font-medium">Lugar aproximado</th><th className="py-2 pr-3 font-medium">Dispositivo</th><th className="py-2 pr-3 font-medium">Página</th><th className="py-2 font-medium">Origem</th></tr></thead>
                  <tbody>
                    {recent.data.items.map((item) => (
                      <tr key={item.id} className="border-t border-border">
                        <td className="whitespace-nowrap py-2 pr-3 text-fg">{dateTime(item.createdAt)}</td>
                        <td className="py-2 pr-3 text-fg">{placeLabel([item.city, item.region, item.country ? countryName(item.country) : null])}</td>
                        <td className="py-2 pr-3 text-fg-sub">{DEVICE_LABEL[item.device] ?? item.device}{item.browser ? ` · ${item.browser}` : ''}</td>
                        <td className="py-2 pr-3 text-fg-sub">{item.path}</td>
                        <td className="py-2 text-fg-sub">{item.referrer ?? 'Direto'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-fg-sub">
                <span>{numberFmt.format(recent.data.total)} acessos no total</span>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn btn-outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button>
                  <span aria-live="polite">Página {page} de {totalPages}</span>
                  <button type="button" className="btn btn-outline" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Próxima</button>
                </div>
              </div>
            </>
          )
        )}
      </section>

      <p className="text-xs text-fg-mut">O lugar é uma estimativa feita a partir do endereço de rede e pode errar a cidade (principalmente em celular e VPN). <a className="underline" href="https://db-ip.com" target="_blank" rel="noreferrer">IP Geolocation by DB-IP</a> (CC BY 4.0).</p>
    </div>
  );
}
