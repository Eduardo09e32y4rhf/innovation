'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertCircle, ArrowRight, CheckCircle2, FileText, RefreshCw,
  UserCheck, UserMinus, Users,
} from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { LoadingState, ErrorState, EmptyState } from '@/app/components/data-states';
import { cn } from '@/app/lib/cn';

const PIPELINE_STEPS = [
  { key: 'OPEN',      label: 'ApuraÃƒÂ§ÃƒÂ£o'   },
  { key: 'DRAFT',     label: 'Rascunho'   },
  { key: 'TREATMENT', label: 'Tratamento' },
  { key: 'IN_REVIEW', label: 'RevisÃƒÂ£o'    },
  { key: 'APPROVED',  label: 'AprovaÃƒÂ§ÃƒÂ£o'  },
  { key: 'CLOSED',    label: 'Fechado'    },
];

export default function EscalasOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const tenant = params.tenant as string;
  const { user } = useAuth();
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const today = now.toISOString().split('T')[0];

  const { data: employeesData, loading: loadEmp, error: errEmp }       = useQuery(() => api.employees.list(), [tenant]);
  const { data: timeTracksData, loading: loadTracks, error: errTracks } = useQuery(() => api.timeTrack.list(currentMonth), [tenant, currentMonth]);
  const { data: occurrencesData, loading: loadOcc, error: errOcc }     = useQuery(() => api.timeOccurrences.list(), [tenant]);
  const { data: swapsData, loading: loadSwaps, error: errSwaps }       = useQuery(() => api.scheduleSwaps.list('PENDING'), [tenant, 'PENDING']);
  const { data: closingsData, loading: loadClosings, error: errClosings } = useQuery(() => api.timeClosing.list(), [tenant]);
  const { data: pendingTracksData, loading: loadPT, error: errPT }     = useQuery(() => api.timeTrack.listPending(), [tenant]);

  const isLoading = loadEmp || loadTracks || loadOcc || loadSwaps || loadClosings || loadPT;
  const isError   = errEmp || errTracks || errOcc || errSwaps || errClosings || errPT;

  const employees     = employeesData ?? [];
  const timeTracks    = timeTracksData ?? [];
  const occurrences   = occurrencesData ?? [];
  const swaps         = swapsData ?? [];
  const closings      = closingsData ?? [];
  const pendingTracks = pendingTracksData ?? [];

  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    const presentTodayCount = timeTracks.filter(
      (t: any) => t.date?.startsWith(today) || (t.entries && t.entries.some((e: any) => e.time?.startsWith(today))),
    ).length;
    const absencesCount = Math.max(0, totalEmployees - presentTodayCount);
    const pendingOccurrences = occurrences.filter((o: any) => o.status === 'PENDING').length;
    const currentClosing = closings.find((c: any) => c.month === currentMonth);
    const closingStatus = currentClosing ? currentClosing.status : 'OPEN';
    return { totalEmployees, presentTodayCount, absencesCount, pendingOccurrences, pendingSwaps: swaps.length, closingStatus };
  }, [employees, timeTracks, occurrences, swaps, closings, today, currentMonth]);

  const attentionItems = useMemo(() => {
    const pOccurrences = occurrences
      .filter((o: any) => o.status === 'PENDING')
      .map((o: any) => ({
        id: `occ-${o.id}`,
        type: 'occurrence',
        title: 'OcorrÃƒÂªncia pendente',
        description: o.reason || 'NÃƒÂ£o informado',
        responsible: o.employeeName || 'NÃƒÂ£o informado',
        time: o.date || today,
        icon: AlertCircle,
        accent: 'warning' as const,
        link: `/${tenant}/dashboard/escalas/ocorrencias`,
      }));
    const pSwaps = swaps.map((s: any) => ({
      id: `swap-${s.id}`,
      type: 'swap',
      title: 'Troca de escala',
      description: 'Aguardando aprovaÃƒÂ§ÃƒÂ£o do gestor',
      responsible: s.requesterName || 'NÃƒÂ£o informado',
      time: s.createdAt?.split('T')[0] || today,
      icon: RefreshCw,
      accent: 'info' as const,
      link: `/${tenant}/dashboard/escalas/trocas`,
    }));
    const pTracks = pendingTracks.map((pt: any) => ({
      id: `track-${pt.id}`,
      type: 'track',
      title: 'Ponto pendente',
      description: 'Requer aprovaÃƒÂ§ÃƒÂ£o',
      responsible: pt.employeeName || 'NÃƒÂ£o informado',
      time: pt.date || today,
      icon: UserCheck,
      accent: 'brand' as const,
      link: `/${tenant}/dashboard/escalas/ponto`,
    }));
    return [...pOccurrences, ...pSwaps, ...pTracks]
      .sort((a, b) => String(b.time).localeCompare(String(a.time)))
      .slice(0, 5);
  }, [occurrences, swaps, pendingTracks, tenant, today]);

  let ctaText = 'Ver CalendÃƒÂ¡rio';
  let ctaLink = `/${tenant}/dashboard/escalas/calendario`;
  if (role === 'FUNCIONARIO') ctaText = 'Bater Ponto', ctaLink = `/${tenant}/dashboard/escalas/ponto`;
  else if (role === 'GESTOR') ctaText = 'Aprovar PendÃƒÂªncias', ctaLink = `/${tenant}/dashboard/escalas/ocorrencias`;
  else if (['ADMIN', 'RH', 'DEV'].includes(role)) ctaText = 'Preparar Fechamento', ctaLink = `/${tenant}/dashboard/escalas/fechamento`;

  let currentStepIndex = PIPELINE_STEPS.findIndex((s) => s.key === stats.closingStatus);
  if (currentStepIndex === -1) currentStepIndex = 0;

  if (isLoading) return <LoadingState label="Carregando visÃƒÂ£o geral..." />;
  if (isError)   return <ErrorState message="Erro ao carregar dados da visÃƒÂ£o geral." />;

  return (
    <div className="w-full px-[var(--page-pad-x)] py-[var(--page-pad-y)] flex flex-col gap-5">
      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Sub-header com CTA Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-v2 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="text-sm font-medium text-fg-mut">
          Acompanhe em tempo real o status da jornada e as pendÃƒÂªncias da competÃƒÂªncia{' '}
          <span className="font-black text-fg">{currentMonth}</span>.
        </p>
        <button
          onClick={() => router.push(ctaLink)}
          className="btn-v2-primary shrink-0"
        >
          {ctaText}
          <ArrowRight size={14} />
        </button>
      </motion.div>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ KPIs Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile delay={0.02} title="Colaboradores"   value={stats.totalEmployees}       icon={Users}      accent="info"    hint="Total ativos na escala" />
        <KpiTile delay={0.06} title="Presentes hoje"  value={stats.presentTodayCount}    icon={UserCheck}  accent="success" hint="Com registro hoje" />
        <KpiTile delay={0.10} title="AusÃƒÂªncias"       value={stats.absencesCount}        icon={UserMinus}  accent="danger"  hint="Sem registro hoje" />
        <KpiTile delay={0.14} title="OcorrÃƒÂªncias"     value={stats.pendingOccurrences}   icon={AlertCircle} accent="warning" hint="Aguardando tratamento" />
        <KpiTile delay={0.18} title="Trocas"          value={stats.pendingSwaps}         icon={RefreshCw}  accent="info"    hint="Aguardando aprovaÃƒÂ§ÃƒÂ£o" />
        <KpiTile delay={0.22} title="CompetÃƒÂªncia"     value={PIPELINE_STEPS[currentStepIndex]?.label || 'Aberta'} icon={FileText} accent="brand" hint="Status do fechamento" small />
      </section>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Pipeline + Lista de atenÃƒÂ§ÃƒÂ£o Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className="card-v2 flex flex-col p-5"
        >
          <h3 className="mb-6 text-sm font-black tracking-tight text-fg">
            Progresso do fechamento
          </h3>

          <div className="relative">
            {/* Linha conectora */}
            <div className="absolute left-6 right-6 top-4 h-0.5 bg-border" aria-hidden />

            <ol className="relative z-10 flex justify-between gap-1 overflow-x-auto no-scrollbar">
              {PIPELINE_STEPS.map((step, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isCurrent   = idx === currentStepIndex;
                return (
                  <li key={step.key} className="flex min-w-[60px] flex-col items-center gap-2 shrink-0">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
                        isCompleted && 'border-brand-600 bg-brand-600 text-white',
                        isCurrent   && 'border-brand-600 bg-bg-elev text-brand-600 shadow-[0_0_0_4px_rgb(var(--brand-500)/0.15)]',
                        !isCompleted && !isCurrent && 'border-border bg-bg-elev text-fg-sub',
                      )}
                    >
                      {isCompleted
                        ? <CheckCircle2 size={16} />
                        : <span className="text-xs font-bold">{idx + 1}</span>}
                    </div>
                    <span className={cn(
                      'text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider',
                      isCompleted && 'text-brand-600',
                      isCurrent   && 'text-fg',
                      !isCompleted && !isCurrent && 'text-fg-sub',
                    )}>
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </motion.div>

        {/* Lista de atenÃƒÂ§ÃƒÂ£o */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-v2 flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
            <h3 className="text-sm font-black tracking-tight text-fg">
              Lista de atenÃƒÂ§ÃƒÂ£o
            </h3>
            <Link
              href={`/${tenant}/dashboard/escalas/ocorrencias`}
              className="text-[11px] font-black text-brand-600 hover:underline"
            >
              Ver tudo Ã¢â€ â€™
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto">
            {attentionItems.length === 0 ? (
              <div className="p-8">
                <EmptyState message="Nenhuma pendÃƒÂªncia crÃƒÂ­tica requer sua atenÃƒÂ§ÃƒÂ£o no momento." />
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {attentionItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li
                      key={item.id}
                      className="group flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-bg-sub/50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-v2-md',
                          item.accent === 'warning' && 'bg-amber-500/12 text-amber-600',
                          item.accent === 'info'    && 'bg-blue-500/12 text-blue-600',
                          item.accent === 'brand'   && 'bg-brand-500/12 text-brand-600',
                        )}>
                          <Icon size={18} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-fg">{item.title}</p>
                          <p className="truncate text-xs text-fg-mut">
                            {item.responsible} Ã¢â‚¬Â¢ {item.description}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={item.link}
                        className="btn-v2-outline shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        Resolver
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </motion.div>
      </section>
    </div>
  );
}

/* Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
   COMPONENTES INTERNOS
   Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â */

function KpiTile({
  title, value, icon: Icon, accent = 'brand', hint, delay = 0, small = false,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ElementType;
  accent?: 'brand' | 'info' | 'success' | 'warning' | 'danger';
  hint?: string;
  delay?: number;
  small?: boolean;
}) {
  const accentMap = {
    brand:   'text-brand-600',
    info:    'text-blue-600',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger:  'text-rose-600',
  } as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="card-v2 flex items-start justify-between gap-3 p-4"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-fg-sub truncate">
          {title}
        </p>
        <p className={cn(
          'mt-2 font-black tracking-tight text-fg tabular-nums truncate',
          small ? 'text-lg' : 'text-3xl',
        )}>
          {value}
        </p>
        {hint && <p className="mt-1 text-[10px] font-medium text-fg-sub truncate">{hint}</p>}
      </div>
      <div className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-v2-md bg-bg-sub',
        accentMap[accent],
      )}>
        <Icon size={16} strokeWidth={2.4} />
      </div>
    </motion.div>
  );
}
