'use client';

import { CalendarPlus, Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { Button, PageHeader } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { can, visibleViews, type HubView } from '@/app/lib/schedule-access';
import { ApprovalsView } from './_components/approvals-view';
import { CalendarView } from './_components/calendar-view';
import { ClosingView } from './_components/closing-view';
import { DayPanel } from './_components/day-panel';
import { LaunchDialog, OverrideDialog } from './_components/launch-dialogs';
import { ModelsView } from './_components/models-view';
import { ReportsView } from './_components/reports-view';
import { RequestWizard } from './_components/request-wizard';
import { RequestsView } from './_components/requests-view';
import { TimesheetView } from './_components/timesheet-view';
import { TodayView } from './_components/today-view';
import { hubApi } from './_lib/hub-api';
import { currentMonthKey } from './_lib/format';
import type { RequestType } from './_lib/types';

const SUBTITLE: Record<string, string> = {
  FUNCIONARIO: 'Bata o ponto, veja sua escala e peça trocas e ajustes.',
  GESTOR: 'Acompanhe sua equipe, aprove pedidos e ajuste escalas.',
  RH: 'Gerencie escalas, ponto, aprovações e fechamento da empresa.',
  ADMIN: 'Gerencie escalas, ponto, aprovações e fechamento da empresa.',
  DEV: 'Gerencie escalas, ponto, aprovações e fechamento da empresa.',
  CEO: 'Indicadores de jornada, horas extras e absenteísmo.',
  CONTABIL: 'Fechamentos e totais do período para a folha.',
  CONSULTA: 'Consulta de escalas e indicadores.',
};

function Hub() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const views = useMemo(() => visibleViews(role), [role]);

  const requested = params.get('view') as HubView | null;
  const view = views.find((item) => item.id === requested)?.id ?? views[0]?.id ?? 'hoje';
  const monthParam = params.get('month');
  const [month, setMonth] = useState(/^\d{4}-\d{2}$/.test(monthParam ?? '') ? monthParam! : currentMonthKey());

  const overview = useQuery(() => hubApi.overview(), [user?.id, user?.companyId], { enabled: Boolean(user) && views.length > 0, pollMs: 120000 });
  const [dayTarget, setDayTarget] = useState<{ employeeId: string; date: string } | null>(null);
  const [wizard, setWizard] = useState<{ open: boolean; initial: { type?: RequestType; prefill?: Record<string, unknown> } | null }>({ open: false, initial: null });
  const [launch, setLaunch] = useState<{ open: boolean; employeeId?: string }>({ open: false });
  const [override, setOverride] = useState<{ employeeId: string; date: string } | null>(null);

  const go = useCallback((next: HubView) => {
    const search = new URLSearchParams(params.toString());
    search.set('view', next);
    router.replace(`?${search.toString()}`, { scroll: false });
  }, [params, router]);

  const refresh = useCallback(() => { overview.refetch(); }, [overview]);
  const data = overview.data;

  if (loading) return <LoadingState label="Carregando Central de Escalas…" />;
  if (!user) return null;
  if (views.length === 0) return <div className="p-6"><EmptyState message="Seu perfil não tem acesso à Central de Escalas." /></div>;

  const canRequest = can(role, 'requests.create');
  const canLaunch = can(role, 'schedule.write');
  const badge = (id: HubView) => id === 'aprovacoes' ? data?.pending?.total : id === 'solicitacoes' ? data?.me?.pendingRequests : undefined;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Central de Escalas"
        subtitle={SUBTITLE[role] ?? 'Escalas, ponto e solicitações em um só lugar.'}
        actions={
          <div className="flex flex-wrap gap-2">
            {canRequest && <Button onClick={() => setWizard({ open: true, initial: null })}><CalendarPlus size={16} aria-hidden="true" /> Nova solicitação</Button>}
            {canLaunch && <Button variant="outline" onClick={() => setLaunch({ open: true })}><Plus size={16} aria-hidden="true" /> Lançar escala</Button>}
          </div>
        }
      />

      <nav aria-label="Seções da Central de Escalas" className="-mx-1 overflow-x-auto px-1">
        <ul className="flex min-w-max gap-1 border-b border-border">
          {views.map((item) => {
            const count = badge(item.id);
            return (
              <li key={item.id}>
                <button type="button" onClick={() => go(item.id)} aria-current={view === item.id ? 'page' : undefined}
                  className={`flex min-h-11 items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition ${view === item.id ? 'border-purple-600 text-purple-700' : 'border-transparent text-fg-sub hover:text-fg'}`}>
                  {item.label}
                  {count ? <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">{count}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {overview.error && !data && <ErrorState message={overview.error} onRetry={overview.refetch} />}
      {overview.loading && !data ? <LoadingState label="Carregando…" /> : data ? (
        <main>
          {view === 'hoje' && <TodayView overview={data} onNavigate={go} onOpenDay={(employeeId, date) => setDayTarget({ employeeId, date })} onNewRequest={() => setWizard({ open: true, initial: null })} onLaunch={(employeeId) => setLaunch({ open: true, employeeId })} refresh={refresh} />}
          {view === 'calendario' && <CalendarView overview={data} month={month} setMonth={setMonth} onOpenDay={(employeeId, date) => setDayTarget({ employeeId, date })} onLaunch={(employeeId) => setLaunch({ open: true, employeeId })} onNewRequest={() => setWizard({ open: true, initial: null })} />}
          {view === 'ponto' && <TimesheetView overview={data} month={month} setMonth={setMonth} initialEmployeeId={params.get('employeeId') ?? undefined} onOpenDay={(employeeId, date) => setDayTarget({ employeeId, date })} onNewRequest={() => setWizard({ open: true, initial: { type: 'AJUSTE_BATIDA' } })} refresh={refresh} />}
          {view === 'solicitacoes' && <RequestsView onNew={() => setWizard({ open: true, initial: null })} />}
          {view === 'aprovacoes' && <ApprovalsView onChanged={refresh} />}
          {view === 'modelos' && <ModelsView overview={data} onLaunch={() => setLaunch({ open: true })} />}
          {view === 'fechamento' && <ClosingView overview={data} month={month} setMonth={setMonth} />}
          {view === 'relatorios' && <ReportsView month={month} setMonth={setMonth} />}
        </main>
      ) : null}

      {data && (
        <>
          <DayPanel target={dayTarget} overview={data} onClose={() => setDayTarget(null)}
            onRequest={(type, prefill) => { setDayTarget(null); setWizard({ open: true, initial: { type, prefill } }); }}
            onOverride={(employeeId, date) => { setDayTarget(null); setOverride({ employeeId, date }); }} />
          <OverrideDialog target={override} onClose={() => setOverride(null)} onDone={refresh} />
        </>
      )}
      <RequestWizard isOpen={wizard.open} initial={wizard.initial} onClose={() => setWizard({ open: false, initial: null })} onCreated={() => { refresh(); go('solicitacoes'); }} />
      <LaunchDialog isOpen={launch.open} employeeId={launch.employeeId} onClose={() => setLaunch({ open: false })} onDone={refresh} />
    </div>
  );
}

export default function EscalasPage() {
  return (
    <Suspense fallback={<LoadingState label="Carregando Central de Escalas…" />}>
      <Hub />
    </Suspense>
  );
}
