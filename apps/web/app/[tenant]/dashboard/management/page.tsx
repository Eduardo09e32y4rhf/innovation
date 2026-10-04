'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CalendarDays, HeartPulse, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { ComplianceBadge } from './_components/status-badge';
import { describeDays, formatDate, sstApi, type ComplianceState } from './sst-api';

const CAN_VIEW = ['DEV', 'ADMIN', 'RH', 'GESTOR', 'CEO', 'CONSULTA'];

function Kpi({ label, value, hint, href, tone }: { label: string; value: number | string; hint?: string; href?: string; tone?: 'danger' | 'warn' | 'ok' }) {
  const color = tone === 'danger' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : tone === 'ok' ? 'text-emerald-600' : 'text-fg';
  const body = (
    <div className="card-v2 h-full p-4 transition-shadow hover:shadow-v2-md">
      <p className="text-xs font-semibold text-fg-mut">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${color}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-fg-mut">{hint}</p> : null}
    </div>
  );
  return href ? <Link href={href} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600">{body}</Link> : body;
}

export default function ManagementCentralPage() {
  const params = useParams();
  const tenant = String(params?.tenant ?? '');
  const { user } = useAuth();
  const profile = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const allowed = CAN_VIEW.includes(profile);
  const overview = useQuery(() => sstApi.overview(), [], { enabled: allowed });
  const asoHref = (state?: ComplianceState) => `/${tenant}/dashboard/management/seguranca/aso${state ? `?state=${state}` : ''}`;

  if (!allowed) {
    return (
      <div className="card-v2 p-6 text-sm text-fg-mut">
        Esta área mostra pendências da empresa. Use o menu ao lado para acessar a agenda e os comunicados.
        <div className="mt-3"><Link className="font-medium text-brand-700 underline" href={`/${tenant}/dashboard/management/agenda`}>Ir para a agenda</Link></div>
      </div>
    );
  }
  if (overview.loading && !overview.data) return <LoadingState label="Carregando a central de gestão..." />;
  if (overview.error && !overview.data) return <ErrorState message={overview.error} onRetry={overview.refetch} />;
  const data = overview.data;
  if (!data) return null;
  const { aso } = data;
  const critical = aso.expired + aso.noAso + aso.inapto;

  return (
    <div className="space-y-6">
      <section className="card-v2 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="reg-title">
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${critical ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {critical ? <ShieldAlert size={22} /> : <ShieldCheck size={22} />}
          </div>
          <div>
            <h2 id="reg-title" className="text-base font-semibold text-fg">
              {critical ? `${critical} ${critical === 1 ? 'colaborador irregular' : 'colaboradores irregulares'} em saúde ocupacional` : 'Saúde ocupacional em dia'}
            </h2>
            <p className="mt-0.5 text-sm text-fg-mut">
              {aso.total
                ? `${aso.regularPercent}% dos ${aso.total} colaboradores ativos estão com o ASO regular.`
                : 'Cadastre colaboradores para acompanhar a regularidade do ASO.'}
            </p>
          </div>
        </div>
        <div className="w-full sm:w-56" aria-hidden="true">
          <div className="h-2 overflow-hidden rounded-full bg-bg-sub">
            <div className={`h-full rounded-full ${critical ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${aso.regularPercent}%` }} />
          </div>
          <p className="mt-1 text-right text-xs tabular-nums text-fg-mut">{aso.regularPercent}% regular</p>
        </div>
      </section>

      <section aria-label="Indicadores de ASO" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Sem ASO" value={aso.noAso} hint="Nunca fizeram exame" tone={aso.noAso ? 'danger' : 'ok'} href={asoHref('NO_ASO')} />
        <Kpi label="Vencidos" value={aso.expired} hint="Exame fora da validade" tone={aso.expired ? 'danger' : 'ok'} href={asoHref('EXPIRED')} />
        <Kpi label="Inaptos" value={aso.inapto} hint="Último resultado inapto" tone={aso.inapto ? 'danger' : 'ok'} href={asoHref('INAPTO')} />
        <Kpi label={`A vencer em ${data.windowDays} dias`} value={aso.expiring} hint="Agende com antecedência" tone={aso.expiring ? 'warn' : 'ok'} href={asoHref('EXPIRING')} />
        <Kpi label="Em dia" value={aso.valid} hint="ASO válido" tone="ok" href={asoHref('VALID')} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="card-v2 overflow-hidden" aria-labelledby="queue-title">
          <div className="flex items-center justify-between border-b border-line p-4">
            <div>
              <h2 id="queue-title" className="text-sm font-semibold text-fg">Fila de ação</h2>
              <p className="text-xs text-fg-mut">Os casos mais urgentes primeiro.</p>
            </div>
            <Link href={asoHref()} className="text-xs font-semibold text-brand-700 hover:underline">Ver todos</Link>
          </div>
          {data.queue.length === 0 ? (
            <p className="p-6 text-sm text-fg-mut">Nenhuma pendência. Todos os colaboradores estão com o ASO em dia.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.queue.map((row) => (
                <li key={row.employee.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-fg">{row.employee.name}</p>
                    <p className="truncate text-xs text-fg-mut">{row.employee.position ?? 'Cargo não informado'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-fg-mut">{row.dueDate ? `${formatDate(row.dueDate)} · ${describeDays(row.daysLeft)}` : ''}</span>
                    <ComplianceBadge state={row.state} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-3" aria-label="Atalhos">
          <Link href={asoHref()} className="card-v2 flex items-center gap-3 p-4 transition-shadow hover:shadow-v2-md">
            <HeartPulse className="text-brand-600" size={20} />
            <div>
              <p className="text-sm font-semibold text-fg">ASO e exames</p>
              <p className="text-xs text-fg-mut">{aso.open} {aso.open === 1 ? 'exame em aberto' : 'exames em aberto'}</p>
            </div>
          </Link>
          <Link href={`/${tenant}/dashboard/management/agenda`} className="card-v2 flex items-center gap-3 p-4 transition-shadow hover:shadow-v2-md">
            <CalendarDays className="text-brand-600" size={20} />
            <div>
              <p className="text-sm font-semibold text-fg">Agenda</p>
              <p className="text-xs text-fg-mut">{data.agendaNext7Days} {data.agendaNext7Days === 1 ? 'compromisso' : 'compromissos'} nos próximos 7 dias</p>
            </div>
          </Link>
        </aside>
      </div>
    </div>
  );
}
