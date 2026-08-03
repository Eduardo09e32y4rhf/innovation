'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  RefreshCw,
  UserCheck,
  UserMinus,
  Users
} from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { LoadingState, ErrorState, EmptyState } from '@/app/components/data-states';

const PIPELINE_STEPS = [
  { key: 'OPEN', label: 'Apuração' },
  { key: 'DRAFT', label: 'Rascunho' },
  { key: 'TREATMENT', label: 'Tratamento' },
  { key: 'IN_REVIEW', label: 'Revisão' },
  { key: 'APPROVED', label: 'Aprovação' },
  { key: 'CLOSED', label: 'Fechado' }
];

export default function EscalasOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const tenant = params.tenant as string;
  const { user } = useAuth();
  
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const today = now.toISOString().split('T')[0];

  // Queries
  const { data: employeesData, loading: loadEmp, error: errEmp } = useQuery(() => api.employees.list(), [tenant]);
  const { data: timeTracksData, loading: loadTracks, error: errTracks } = useQuery(() => api.timeTrack.list(currentMonth), [tenant, currentMonth]);
  const { data: occurrencesData, loading: loadOcc, error: errOcc } = useQuery(() => api.timeOccurrences.list(), [tenant]);
  const { data: swapsData, loading: loadSwaps, error: errSwaps } = useQuery(() => api.scheduleSwaps.list('PENDING'), [tenant, 'PENDING']);
  const { data: closingsData, loading: loadClosings, error: errClosings } = useQuery(() => api.timeClosing.list(), [tenant]);
  const { data: pendingTracksData, loading: loadPT, error: errPT } = useQuery(() => api.timeTrack.listPending(), [tenant]);

  const isLoading = loadEmp || loadTracks || loadOcc || loadSwaps || loadClosings || loadPT;
  const isError = errEmp || errTracks || errOcc || errSwaps || errClosings || errPT;

  const employees = employeesData || [];
  const timeTracks = timeTracksData || [];
  const occurrences = occurrencesData || [];
  const swaps = swapsData || [];
  const closings = closingsData || [];
  const pendingTracks = pendingTracksData || [];

  // Stats
  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    const presentTodayCount = timeTracks.filter((t: any) => t.date?.startsWith(today) || (t.entries && t.entries.some((e: any) => e.time?.startsWith(today)))).length;
    const absencesCount = Math.max(0, totalEmployees - presentTodayCount);
    const pendingOccurrences = occurrences.filter((o: any) => o.status === 'PENDING').length;
    const currentClosing = closings.find((c: any) => c.month === currentMonth);
    const closingStatus = currentClosing ? currentClosing.status : 'OPEN';

    return { totalEmployees, presentTodayCount, absencesCount, pendingOccurrences, pendingSwaps: swaps.length, closingStatus };
  }, [employees, timeTracks, occurrences, swaps, closings, today, currentMonth]);

  // Attention Items
  const attentionItems = useMemo(() => {
    let items = [];
    const pOccurrences = occurrences.filter((o: any) => o.status === 'PENDING').map((o: any) => ({
      id: `occ-${o.id}`, type: 'occurrence', title: 'Ocorrência pendente', description: o.reason || 'Não informado',
      responsible: o.employeeName || 'Não informado', time: o.date || today, 
      icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', link: `/${tenant}/dashboard/escalas/ocorrencias`
    }));
    const pSwaps = swaps.map((s: any) => ({
      id: `swap-${s.id}`, type: 'swap', title: 'Troca de escala', description: 'Aguardando aprovação do gestor',
      responsible: s.requesterName || 'Não informado', time: s.createdAt?.split('T')[0] || today, 
      icon: RefreshCw, color: 'text-sky-600', bg: 'bg-sky-50', link: `/${tenant}/dashboard/escalas/trocas`
    }));
    const pTracks = pendingTracks.map((pt: any) => ({
      id: `track-${pt.id}`, type: 'track', title: 'Ponto pendente', description: 'Requer aprovação',
      responsible: pt.employeeName || 'Não informado', time: pt.date || today, 
      icon: UserCheck, color: 'text-[#8A05BE]', bg: 'bg-[#8A05BE]/10', link: `/${tenant}/dashboard/escalas/ponto`
    }));

    items = [...pOccurrences, ...pSwaps, ...pTracks].sort((a, b) => b.time.localeCompare(a.time));
    return items.slice(0, 5);
  }, [occurrences, swaps, pendingTracks, tenant, today]);

  // Actions
  let ctaText = 'Ver Calendário';
  let ctaLink = `/${tenant}/dashboard/escalas/calendario`;
  if (user?.role === 'FUNCIONARIO') { ctaText = 'Bater Ponto'; ctaLink = `/${tenant}/dashboard/escalas/ponto`; }
  else if (user?.role === 'GESTOR') { ctaText = 'Aprovar Pendências'; ctaLink = `/${tenant}/dashboard/escalas/ocorrencias`; }
  else if (['ADMIN', 'RH', 'DEV'].includes(user?.role || '')) { ctaText = 'Preparar Fechamento'; ctaLink = `/${tenant}/dashboard/escalas/fechamento`; }

  let currentStepIndex = PIPELINE_STEPS.findIndex(s => s.key === stats.closingStatus);
  if (currentStepIndex === -1) currentStepIndex = 0;

  if (isLoading) return <LoadingState label="Carregando visão geral..." />;
  if (isError) return <ErrorState message="Erro ao carregar dados da visão geral." />;

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <p className="text-slate-500">Acompanhe em tempo real o status da jornada e as pendências da competência {currentMonth}.</p>
        <button 
          onClick={() => router.push(ctaLink)}
          className="btn-nubank flex items-center"
        >
          {ctaText}
          <ArrowRight size={14} className="ml-2" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Card 1: Colaboradores */}
        <div className="card-stat">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <span className="card-stat-label">Colaboradores</span>
          </div>
          <div className="card-stat-value">{stats.totalEmployees}</div>
          <div className="card-stat-detail">Total ativos na escala</div>
        </div>

        {/* Card 2: Presentes Hoje */}
        <div className="card-stat">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="card-stat-label">Presentes hoje</span>
          </div>
          <div className="card-stat-value">{stats.presentTodayCount}</div>
          <div className="card-stat-detail">Com registro hoje</div>
        </div>

        {/* Card 3: Ausências */}
        <div className="card-stat">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <UserMinus className="w-4 h-4 text-red-600" />
            </div>
            <span className="card-stat-label">Ausências</span>
          </div>
          <div className="card-stat-value">{stats.absencesCount}</div>
          <div className="card-stat-detail">Sem registro hoje</div>
        </div>

        {/* Card 4: Ocorrências */}
        <div className="card-stat">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-orange-600" />
            </div>
            <span className="card-stat-label">Ocorrências</span>
          </div>
          <div className="card-stat-value">{stats.pendingOccurrences}</div>
          <div className="card-stat-detail">Aguardando tratamento</div>
        </div>

        {/* Card 5: Trocas */}
        <div className="card-stat">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-sky-600" />
            </div>
            <span className="card-stat-label">Trocas</span>
          </div>
          <div className="card-stat-value">{stats.pendingSwaps}</div>
          <div className="card-stat-detail">Aguardando aprovação</div>
        </div>

        {/* Card 6: Competência */}
        <div className="card-stat">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[#8A05BE]/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#8A05BE]" />
            </div>
            <span className="card-stat-label">Competência</span>
          </div>
          <div className="card-stat-value text-base xl:text-lg truncate pt-1">{PIPELINE_STEPS[currentStepIndex]?.label || 'Aberta'}</div>
          <div className="card-stat-detail">Status do fechamento</div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PIPELINE DE FECHAMENTO */}
        <div className="card-flat p-6">
          <h3 className="section-title mb-6">Progresso do Fechamento</h3>
          
          <div className="relative mt-4 mb-4">
            {/* Connector Line */}
            <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 z-0" />
            
            <div className="relative z-10 flex justify-between">
              {PIPELINE_STEPS.map((step, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                
                return (
                  <div key={step.key} className="flex flex-col items-center min-w-[60px] gap-2">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full border-2 transition-all ${
                      isCompleted ? 'bg-[#8A05BE] border-[#8A05BE] text-white' :
                      isCurrent ? 'bg-white border-[#8A05BE] text-[#8A05BE] shadow-[0_0_0_4px_rgba(138,5,190,0.1)]' :
                      'bg-white border-slate-300 text-slate-400'
                    }`}>
                      {isCompleted ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{idx + 1}</span>}
                    </div>
                    <span className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider ${
                      isCompleted ? 'text-[#8A05BE] font-bold' :
                      isCurrent ? 'text-slate-900 font-bold' :
                      'text-slate-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* LISTA DE ATENÇÃO */}
        <div className="card-flat overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 className="section-title">Lista de Atenção</h3>
            <Link href={`/${tenant}/dashboard/escalas/ocorrencias`} className="text-xs font-bold text-[#8A05BE] hover:underline">
              Ver tudo
            </Link>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {attentionItems.length === 0 ? (
              <div className="p-8 h-full flex flex-col items-center justify-center">
                <EmptyState message="Nenhuma pendência crítica requer sua atenção no momento." />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {attentionItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${item.bg}`}>
                        <item.icon size={18} className={item.color} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{item.title}</p>
                        <p className="text-xs text-slate-500 truncate">{item.responsible} • {item.description}</p>
                      </div>
                    </div>
                    <Link href={item.link} className="btn-outline opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      Resolver
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
