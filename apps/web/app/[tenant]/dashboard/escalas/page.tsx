'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Hexagon,
  RefreshCw,
  TrendingDown,
  UserCheck,
  UserMinus,
  Users
} from 'lucide-react';

import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';

/* ═══════════════════════════════════════════════════════════════
   ANIMATION VARIANTS
═══════════════════════════════════════════════════════════════ */
const FADE_UP = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const STAGGER = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

/* ═══════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════ */
export default function PremiumEscalasDashboard() {
  const params = useParams();
  const router = useRouter();
  const tenant = params.tenant as string;
  const { user } = useAuth();
  
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const today = now.toISOString().split('T')[0];

  // Queries
  const { data: employeesData } = useQuery(() => api.employees.list(), [tenant]);
  const employees = employeesData as any[] || [];

  const { data: timeTracksData } = useQuery(() => api.timeTrack.list(currentMonth), [tenant, currentMonth]);
  const timeTracks = timeTracksData as any[] || [];

  const { data: occurrencesData } = useQuery(() => api.timeOccurrences.list(), [tenant]);
  const occurrences = occurrencesData as any[] || [];

  const { data: swapsData } = useQuery(() => api.scheduleSwaps.list('PENDING'), [tenant, 'PENDING']);
  const swaps = swapsData as any[] || [];

  const { data: closingsData } = useQuery(() => api.timeClosing.list(), [tenant]);
  const closings = closingsData as any[] || [];

  const { data: pendingTracksData } = useQuery(() => api.timeTrack.listPending(), [tenant]);
  const pendingTracks = pendingTracksData as any[] || [];

  // Stats
  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    const presentTodayCount = timeTracks.filter((t: any) => t.date?.startsWith(today) || t.entries?.some((e: any) => e.time?.startsWith(today))).length;
    const absencesCount = Math.max(0, totalEmployees - presentTodayCount);
    const pendingOccurrences = occurrences.filter((o: any) => o.status === 'PENDING').length;
    const currentClosing = closings.find((c: any) => c.month === currentMonth);
    const closingStatus = currentClosing ? currentClosing.status : 'Aberta';

    return { totalEmployees, presentTodayCount, absencesCount, pendingOccurrences, pendingSwaps: swaps.length, closingStatus };
  }, [employees, timeTracks, occurrences, swaps, closings, today, currentMonth]);

  // Attention Items
  const attentionItems = useMemo(() => {
    let items = [];
    const pOccurrences = occurrences.filter((o: any) => o.status === 'PENDING').map((o: any) => ({
      id: `occ-${o.id}`, type: 'occurrence', title: 'Ocorrência pendente', description: o.reason || 'Justificativa manual',
      responsible: o.employeeName || 'Colaborador', time: o.date || today, 
      icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/10', link: `/${tenant}/dashboard/escalas/ocorrencias`
    }));
    const pSwaps = swaps.map((s: any) => ({
      id: `swap-${s.id}`, type: 'swap', title: 'Troca de escala', description: 'Aguardando aprovação do gestor',
      responsible: s.requesterName || 'Colaborador', time: s.createdAt?.split('T')[0] || today, 
      icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/10', link: `/${tenant}/dashboard/escalas`
    }));
    const pTracks = pendingTracks.map((pt: any) => ({
      id: `track-${pt.id}`, type: 'track', title: 'Ponto divergente', description: 'Batida fora da geocerca/horário',
      responsible: pt.employeeName || 'Colaborador', time: pt.date || today, 
      icon: Clock, color: 'text-[#8A05BE]', bg: 'bg-[#8A05BE]/10', link: `/${tenant}/dashboard/escalas/ocorrencias`
    }));

    items = [...pOccurrences, ...pSwaps, ...pTracks].sort((a, b) => b.time.localeCompare(a.time));
    return items.slice(0, 5);
  }, [occurrences, swaps, pendingTracks, tenant, today]);

  // Actions
  let ctaText = 'Acessar Escalas';
  let ctaLink = `/${tenant}/dashboard/escalas/calendario`;
  if (user?.role === 'FUNCIONARIO') { ctaText = 'Bater Ponto'; ctaLink = `/${tenant}/dashboard/escalas/ponto`; }
  else if (user?.role === 'GESTOR') { ctaText = 'Aprovar Pendências'; ctaLink = `/${tenant}/dashboard/escalas/ocorrencias`; }
  else if (['ADMIN', 'RH', 'DEV'].includes(user?.role || '')) { ctaText = 'Área de Fechamento'; ctaLink = `/${tenant}/dashboard/escalas/fechamento`; }

  const pipelineSteps = [
    { key: 'Aberta', label: 'Apuração', icon: Clock },
    { key: 'TREATMENT', label: 'Tratamento', icon: AlertCircle },
    { key: 'IN_REVIEW', label: 'Revisão', icon: CheckCircle2 },
    { key: 'CLOSED', label: 'Fechado', icon: FileText }
  ];
  let currentStepIndex = pipelineSteps.findIndex(s => s.key === stats.closingStatus);
  if (currentStepIndex === -1) currentStepIndex = 0;

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-[#8A05BE]/30 p-4 md:p-8 font-sans">
      
      {/* Background Neon Effects */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/10 blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#8A05BE]/10 blur-[150px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <motion.div className="relative z-10 max-w-[1400px] mx-auto space-y-6" initial="hidden" animate="visible" variants={STAGGER}>
        
        {/* HEADER */}
        <motion.header custom={0} variants={FADE_UP} className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-6 items-center rounded-full bg-blue-500/10 px-2.5 text-[11px] font-bold uppercase tracking-widest text-blue-400 ring-1 ring-blue-500/30">
                <Hexagon size={12} className="mr-1.5" />
                Time Tracking
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
              Escalas & Ponto
            </h1>
            <p className="mt-2 text-sm text-white/50 max-w-xl leading-relaxed">
              Visão macro da folha de frequência. Acompanhe assiduidade, justifique ausências e feche a competência de {now.toLocaleDateString('pt-BR', { month: 'long' })}.
            </p>
          </div>
          <button 
            onClick={() => router.push(ctaLink)}
            className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8A05BE] to-purple-700 text-white px-8 py-3.5 text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(138,5,190,0.3)] hover:shadow-[0_0_40px_rgba(138,5,190,0.5)]"
          >
            {ctaText}
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
        </motion.header>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* ASSIDUIDADE CARDS - 8 COLS */}
          <motion.div custom={1} variants={FADE_UP} className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Presentes */}
            <div className="group relative overflow-hidden rounded-[24px] bg-white/[0.02] border border-white/[0.05] p-6 backdrop-blur-xl transition-all hover:bg-white/[0.04] hover:border-white/[0.1]">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative flex flex-col h-full justify-between gap-8">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                    <UserCheck size={20} />
                  </div>
                </div>
                <div>
                  <p className="text-4xl font-black text-white tracking-tighter">{stats.presentTodayCount}</p>
                  <p className="text-sm font-semibold text-white/40 mt-1 uppercase tracking-wider">Presentes Hoje</p>
                </div>
              </div>
            </div>

            {/* Faltas */}
            <div className="group relative overflow-hidden rounded-[24px] bg-white/[0.02] border border-white/[0.05] p-6 backdrop-blur-xl transition-all hover:bg-white/[0.04] hover:border-white/[0.1]">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative flex flex-col h-full justify-between gap-8">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20">
                    <UserMinus size={20} />
                  </div>
                  <TrendingDown size={18} className="text-rose-500/50" />
                </div>
                <div>
                  <p className="text-4xl font-black text-white tracking-tighter">{stats.absencesCount}</p>
                  <p className="text-sm font-semibold text-white/40 mt-1 uppercase tracking-wider">Ausências / Faltas</p>
                </div>
              </div>
            </div>

            {/* Efetivo */}
            <div className="group relative overflow-hidden rounded-[24px] bg-white/[0.02] border border-white/[0.05] p-6 backdrop-blur-xl transition-all hover:bg-white/[0.04] hover:border-white/[0.1]">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative flex flex-col h-full justify-between gap-8">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                    <Users size={20} />
                  </div>
                </div>
                <div>
                  <p className="text-4xl font-black text-white tracking-tighter">{stats.totalEmployees}</p>
                  <p className="text-sm font-semibold text-white/40 mt-1 uppercase tracking-wider">Colaboradores</p>
                </div>
              </div>
            </div>

            {/* PIPELINE DE FECHAMENTO - SPANS 3 COLS */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 group relative overflow-hidden rounded-[24px] bg-white/[0.01] border border-white/[0.05] p-8 backdrop-blur-xl transition-all">
              <h3 className="text-lg font-black text-white mb-6">Pipeline de Fechamento: <span className="text-[#8A05BE]">{currentMonth}</span></h3>
              
              <div className="relative flex justify-between">
                {/* Connector Line */}
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white/5 -translate-y-1/2 z-0" />
                
                {pipelineSteps.map((step, idx) => {
                  const isCompleted = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  const isPending = idx > currentStepIndex;
                  
                  return (
                    <div key={step.key} className="relative z-10 flex flex-col items-center gap-3">
                      <div className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-500 ${
                        isCompleted ? 'bg-[#8A05BE]/20 text-[#d48aff] border border-[#8A05BE]/40 shadow-[0_0_20px_rgba(138,5,190,0.2)]' :
                        isCurrent ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-110' :
                        'bg-black text-white/30 border border-white/5'
                      }`}>
                        <step.icon size={20} />
                      </div>
                      <span className={`text-[11px] font-bold uppercase tracking-widest ${
                        isCurrent ? 'text-white' : isCompleted ? 'text-[#8A05BE]' : 'text-white/30'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* ATENÇÃO & PENDÊNCIAS - 4 COLS */}
          <motion.div custom={2} variants={FADE_UP} className="md:col-span-4 flex flex-col h-full">
            <div className="flex-1 rounded-[24px] bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between border-b border-white/[0.05] p-6 bg-black/20">
                <div className="flex items-center gap-3">
                  <AlertCircle size={18} className="text-orange-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Ação Requerida</h3>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-white/10 text-xs font-bold text-white">
                  {attentionItems.length}
                </div>
              </div>
              
              <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
                {attentionItems.length === 0 ? (
                  <div className="m-auto text-center p-6">
                    <CheckCircle2 size={32} className="mx-auto text-white/20 mb-3" />
                    <p className="text-sm font-bold text-white/40">Nenhuma pendência crítica</p>
                  </div>
                ) : (
                  attentionItems.map((item) => (
                    <Link 
                      key={item.id}
                      href={item.link}
                      className="group flex gap-4 rounded-[16px] p-4 bg-black/30 border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all items-center"
                    >
                      <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl ${item.bg}`}>
                        <item.icon size={16} className={item.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                        <p className="text-[11px] text-white/50 truncate mt-0.5">{item.responsible} • {item.description}</p>
                      </div>
                      <ArrowUpRight size={14} className="shrink-0 text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
                    </Link>
                  ))
                )}
              </div>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}
