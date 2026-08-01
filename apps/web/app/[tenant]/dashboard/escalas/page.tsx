'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserCheck, 
  UserMinus, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle2,
  Clock,
  Calendar,
  FileText,
  ArrowRight
} from 'lucide-react';
import { LoadingState, ErrorState } from '@/app/components/platform-ui';

export default function EscalasOverviewPage() {
  const params = useParams();
  const tenant = params.tenant as string;
  const { user } = useAuth();
  
  // Current month (YYYY-MM)
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const today = now.toISOString().split('T')[0];

  // Queries
  const { data: employeesData, loading: loadingEmp, error: errorEmp } = useQuery(
    () => api.employees.list(),
    [tenant]
  );
  const employees = employeesData as any[];

  const { data: timeTracksData, loading: loadingTracks, error: errorTracks } = useQuery(
    () => api.timeTrack.list(currentMonth),
    [tenant, currentMonth]
  );
  const timeTracks = timeTracksData as any[];

  const { data: occurrencesData, loading: loadingOccurrences, error: errorOccurrences } = useQuery(
    () => api.timeOccurrences.list(),
    [tenant]
  );
  const occurrences = occurrencesData as any[];

  const { data: swapsData, loading: loadingSwaps, error: errorSwaps } = useQuery(
    () => api.scheduleSwaps.list('PENDING'),
    [tenant, 'PENDING']
  );
  const swaps = swapsData as any[];

  const { data: closingsData, loading: loadingClosings, error: errorClosings } = useQuery(
    () => api.timeClosing.list(),
    [tenant]
  );
  const closings = closingsData as any[];

  const { data: pendingTracksData, loading: loadingPendingTracks, error: errorPendingTracks } = useQuery(
    () => api.timeTrack.listPending(),
    [tenant]
  );
  const pendingTracks = pendingTracksData as any[];

  const isLoading = loadingEmp || loadingTracks || loadingOccurrences || loadingSwaps || loadingClosings || loadingPendingTracks;
  const isError = errorEmp || errorTracks || errorOccurrences || errorSwaps || errorClosings || errorPendingTracks;

  // Process Stats
  const stats = useMemo(() => {
    if (!employees || !timeTracks || !occurrences || !swaps || !closings) return null;

    const totalEmployees = employees.length;
    
    // Present today: employees with a time track today
    const presentTodayCount = timeTracks.filter((t: any) => t.date?.startsWith(today) || t.entries?.some((e: any) => e.time?.startsWith(today))).length;
    
    // Simplification for absences: total employees - present today
    const absencesCount = Math.max(0, totalEmployees - presentTodayCount);

    const pendingOccurrences = occurrences.filter((o: any) => o.status === 'PENDING').length;
    
    const currentClosing = closings.find((c: any) => c.month === currentMonth);
    const closingStatus = currentClosing ? currentClosing.status : 'Aberta';

    return {
      totalEmployees,
      presentTodayCount,
      absencesCount,
      pendingOccurrences,
      pendingSwaps: swaps.length,
      closingStatus
    };
  }, [employees, timeTracks, occurrences, swaps, closings, today, currentMonth]);

  // Attention List
  const attentionItems = useMemo(() => {
    if (!occurrences || !swaps || !pendingTracks) return [];
    
    let items = [];
    
    // Pending Occurrences
    const pendingOccurrences = occurrences.filter((o: any) => o.status === 'PENDING').map((o: any) => ({
      id: `occ-${o.id}`,
      type: 'occurrence',
      title: 'Ocorrência pendente',
      description: o.reason || 'Tratar ocorrência',
      responsible: o.employeeName || 'Colaborador',
      time: o.date || today,
      icon: <AlertCircle className="w-4 h-4 text-orange-500" />,
      dotColor: 'bg-orange-500',
      link: `/${tenant}/dashboard/escalas/ocorrencias`
    }));
    
    // Pending Swaps
    const pendingSwaps = swaps.map((s: any) => ({
      id: `swap-${s.id}`,
      type: 'swap',
      title: 'Troca de escala',
      description: 'Aguardando aprovação',
      responsible: s.requesterName || 'Colaborador',
      time: s.createdAt?.split('T')[0] || today,
      icon: <RefreshCw className="w-4 h-4 text-blue-500" />,
      dotColor: 'bg-blue-500',
      link: `/${tenant}/dashboard/escalas`
    }));

    // Pending Tracks
    const pendingT = pendingTracks.map((pt: any) => ({
      id: `track-${pt.id}`,
      type: 'track',
      title: 'Ponto pendente',
      description: 'Aprovação manual necessária',
      responsible: pt.employeeName || 'Colaborador',
      time: pt.date || today,
      icon: <Clock className="w-4 h-4 text-[#8A05BE]" />,
      dotColor: 'bg-[#8A05BE]',
      link: `/${tenant}/dashboard/escalas/ocorrencias`
    }));

    items = [...pendingOccurrences, ...pendingSwaps, ...pendingT];
    
    // Sort by time descending
    items.sort((a, b) => b.time.localeCompare(a.time));
    
    return items.slice(0, 8); // Max 8 items
  }, [occurrences, swaps, pendingTracks, tenant, today]);

  if (isLoading) return <LoadingState label="Carregando painel de escalas..." />;
  if (isError) return <ErrorState message="Erro ao carregar os dados das escalas." />;

  // Roles based CTA
  let ctaText = 'Acessar Escalas';
  let ctaLink = `/${tenant}/dashboard/escalas`;
  
  if (user?.role === 'FUNCIONARIO') {
    ctaText = 'Bater ponto';
    ctaLink = `/${tenant}/dashboard/escalas/ponto`;
  } else if (user?.role === 'GESTOR') {
    ctaText = 'Revisar pendências';
    ctaLink = `/${tenant}/dashboard/escalas/ocorrencias`;
  } else if (['ADMIN', 'RH', 'DEV'].includes(user?.role || '')) {
    ctaText = 'Preparar fechamento';
    ctaLink = `/${tenant}/dashboard/escalas/fechamento`;
  }

  // Pipeline states
  const closingStatus = stats?.closingStatus || 'Aberta';
  const pipelineSteps = [
    { key: 'Aberta', label: 'Planejamento' },
    { key: 'DRAFT', label: 'Apuração' },
    { key: 'TREATMENT', label: 'Tratamento' },
    { key: 'IN_REVIEW', label: 'Revisão' },
    { key: 'APPROVED', label: 'Aprovação' },
    { key: 'CLOSED', label: 'Fechamento' }
  ];

  let currentStepIndex = pipelineSteps.findIndex(s => s.key === closingStatus);
  if (currentStepIndex === -1) {
    if (closingStatus === 'Aberta') currentStepIndex = 0;
    else currentStepIndex = 1; // Default fallback
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 lg:pb-8 w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 space-y-6 pt-4">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden bg-[#050505] p-8 border border-neutral-800 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-[#8A05BE]/20 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#8A05BE]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 badge badge-brand bg-[#8A05BE]/10 text-[#8A05BE] border-[#8A05BE]/20 mb-4 px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" />
            <span>Competência Atual • {now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Resumo da competência
          </h1>
          
          <p className="text-neutral-400 max-w-2xl mb-8">
            Acompanhe em tempo real o status da jornada, pendências de colaboradores e o andamento do fechamento deste mês.
          </p>

          <Link href={ctaLink} className="inline-flex items-center btn-nubank">
            {ctaText}
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
      >
        {/* Stats Cards */}
        <motion.div variants={itemVariants} className="card-stat">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">
              <Users className="w-4 h-4 text-neutral-400" />
            </div>
            <span className="card-stat-label">Colaboradores previstos</span>
          </div>
          <div className="card-stat-value">{stats?.totalEmployees}</div>
          <div className="text-xs text-neutral-500 mt-1">Total ativos na escala</div>
        </motion.div>

        <motion.div variants={itemVariants} className="card-stat">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-green-900/20 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-green-500" />
            </div>
            <span className="card-stat-label">Presentes hoje</span>
          </div>
          <div className="card-stat-value">{stats?.presentTodayCount}</div>
          <div className="text-xs text-neutral-500 mt-1">Com registro no dia</div>
        </motion.div>

        <motion.div variants={itemVariants} className="card-stat">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-red-900/20 flex items-center justify-center">
              <UserMinus className="w-4 h-4 text-red-500" />
            </div>
            <span className="card-stat-label">Ausências</span>
          </div>
          <div className="card-stat-value">{stats?.absencesCount}</div>
          <div className="text-xs text-neutral-500 mt-1">Sem registro hoje</div>
        </motion.div>

        <motion.div variants={itemVariants} className="card-stat">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-orange-900/20 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </div>
            <span className="card-stat-label">Ocorrências</span>
          </div>
          <div className="card-stat-value">{stats?.pendingOccurrences}</div>
          <div className="text-xs text-neutral-500 mt-1">Aguardando tratamento</div>
        </motion.div>

        <motion.div variants={itemVariants} className="card-stat">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-900/20 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-blue-500" />
            </div>
            <span className="card-stat-label">Trocas</span>
          </div>
          <div className="card-stat-value">{stats?.pendingSwaps}</div>
          <div className="text-xs text-neutral-500 mt-1">Aguardando aprovação</div>
        </motion.div>

        <motion.div variants={itemVariants} className="card-stat border-[#8A05BE]/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#8A05BE]/5 to-transparent pointer-events-none" />
          <div className="flex items-center space-x-3 mb-3 relative z-10">
            <div className="w-8 h-8 rounded-full bg-[#8A05BE]/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#8A05BE]" />
            </div>
            <span className="card-stat-label">Competência</span>
          </div>
          <div className="card-stat-value relative z-10 text-sm md:text-xl truncate">
            {pipelineSteps[currentStepIndex]?.label || 'Aberta'}
          </div>
          <div className="text-xs text-neutral-500 mt-1 relative z-10">Status do fechamento</div>
        </motion.div>
      </motion.div>

      {/* Competency Pipeline */}
      <div className="card-flat p-6">
        <h3 className="section-title mb-6">Progresso do Fechamento</h3>
        <div className="relative">
          {/* Connector Line */}
          <div className="absolute top-4 left-4 right-4 h-[2px] bg-neutral-800 -z-10" />
          
          <div className="flex justify-between relative">
            {pipelineSteps.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              
              return (
                <div key={step.key} className="flex flex-col items-center min-w-[60px]">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 border-2 ${
                    isCompleted ? 'bg-[#8A05BE] border-[#8A05BE] text-white' :
                    isCurrent ? 'bg-black border-[#8A05BE] text-[#8A05BE]' :
                    'bg-black border-neutral-800 text-neutral-600'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{index + 1}</span>}
                  </div>
                  <span className={`text-xs font-medium text-center ${
                    isCurrent ? 'text-white' : 
                    isCompleted ? 'text-neutral-300' : 
                    'text-neutral-600'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Attention List */}
      <div className="card-flat p-0 overflow-hidden">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
          <h3 className="section-title mb-0">Lista de Atenção</h3>
          <Link href={`/${tenant}/dashboard/escalas/ocorrencias`} className="text-sm text-[#8A05BE] hover:text-[#a51ae0] transition-colors">
            Ver tudo
          </Link>
        </div>
        
        {attentionItems.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-green-500 opacity-50" />
            <p>Nenhuma pendência na lista de atenção.</p>
            <p className="text-sm">Tudo em dia com a competência atual!</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {attentionItems.map((item, index) => (
              <div key={item.id} className="p-4 hover:bg-neutral-900/50 transition-colors flex items-center justify-between group">
                <div className="flex items-center space-x-4">
                  <div className={`w-2 h-2 rounded-full ${item.dotColor}`} />
                  <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">{item.title}</h4>
                    <p className="text-xs text-neutral-400">
                      {item.responsible} • {item.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-neutral-500 hidden sm:block">
                    {new Date(item.time).toLocaleDateString('pt-BR')}
                  </span>
                  <Link 
                    href={item.link} 
                    className="btn-outline text-xs px-3 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Resolver
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
