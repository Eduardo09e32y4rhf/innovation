'use client';

import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  Building2,
  ChevronRight,
  Clock,
  CreditCard,
  FileSignature,
  FileText,
  Hexagon,
  RefreshCw,
  Settings2,
  Shield,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
  Zap,
} from 'lucide-react';
import { useQuery } from '@/app/hooks/use-data';
import { api, type PlatformStats } from '@/app/lib/api';

/* ═══════════════════════════════════════════════════════════════
   ANIMATION VARIANTS
═══════════════════════════════════════════════════════════════ */
const FADE_UP = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  }),
};

const STAGGER = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */
const QUICK_LINKS = [
  { id: 'finance', title: 'Financeiro', subtitle: 'Gestão de assinaturas e Asaas', icon: WalletCards, href: '/finance', color: 'from-emerald-500/20 to-emerald-900/20', iconColor: 'text-emerald-400' },
  { id: 'contracts', title: 'Contratos', subtitle: 'Ciclo de vida e renovações', icon: FileSignature, href: '/contracts', color: 'from-blue-500/20 to-blue-900/20', iconColor: 'text-blue-400' },
  { id: 'config', title: 'Configuração', subtitle: 'Planos, limites e auditoria', icon: Settings2, href: '/configuration', color: 'from-violet-500/20 to-violet-900/20', iconColor: 'text-violet-400' },
];

const RECENT_LOGS = [
  { id: 1, text: 'Nova empresa ativada', detail: 'Tech Solutions Ltda assinou Plano Premium', time: 'Agora', icon: Building2, color: 'text-emerald-400' },
  { id: 2, text: 'Pagamento processado', detail: 'Asaas: R$ 499,90 recebidos', time: 'Há 15 min', icon: CreditCard, color: 'text-blue-400' },
  { id: 3, text: 'Contrato gerado', detail: 'Inove SA - Contrato de prestação de serviços', time: 'Há 2h', icon: FileText, color: 'text-violet-400' },
  { id: 4, text: 'Alerta de falha', detail: 'Falha no webhook do Asaas (Tentativa 1)', time: 'Há 5h', icon: Zap, color: 'text-rose-400' },
];

export default function PremiumPlatformDashboard() {
  const params = useParams();
  const router = useRouter();
  const tenant = String(params?.tenant || '');
  const stats = useQuery(() => api.platform.stats(), []);

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-[#8A05BE]/30 p-4 md:p-8 font-sans">
      
      {/* ────────────────────────────────────────────────────────
          BACKGROUND EFFECTS (Neon Glow)
      ──────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#8A05BE]/10 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/10 blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <motion.div 
        className="relative z-10 max-w-[1400px] mx-auto space-y-6"
        initial="hidden"
        animate="visible"
        variants={STAGGER}
      >
        
        {/* ────────────────────────────────────────────────────────
            TOP HEADER
        ──────────────────────────────────────────────────────── */}
        <motion.header custom={0} variants={FADE_UP} className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-6 items-center rounded-full bg-[#8A05BE]/20 px-2.5 text-[11px] font-bold uppercase tracking-widest text-[#d48aff] ring-1 ring-[#8A05BE]/50">
                <Hexagon size={12} className="mr-1.5" />
                Módulo Central
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
              Plataforma
            </h1>
            <p className="mt-2 text-sm text-white/50 max-w-xl leading-relaxed">
              Gestão macro de inquilinos, assinaturas e saúde do sistema. Visão de alto nível do Innovation RH Connect.
            </p>
          </div>
          <button 
            onClick={() => router.push(`/${tenant}/dashboard/platform/companies`)}
            className="group flex items-center justify-center gap-2 rounded-xl bg-white text-black px-6 py-3 text-sm font-bold transition-all hover:bg-neutral-200 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            Nova Empresa
            <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </motion.header>

        {/* ────────────────────────────────────────────────────────
            BENTO GRID LAYOUT
        ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* MAIN STATS - SPANS 8 COLS */}
          <motion.div custom={1} variants={FADE_UP} className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1: Active Companies */}
            <div className="group relative overflow-hidden rounded-[24px] bg-white/[0.02] border border-white/[0.05] p-6 backdrop-blur-xl transition-all hover:bg-white/[0.04] hover:border-white/[0.1]">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative flex flex-col h-full justify-between gap-8">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                    <Building2 size={20} />
                  </div>
                  <TrendingUp size={18} className="text-emerald-500/50" />
                </div>
                <div>
                  <p className="text-4xl font-black text-white tracking-tighter">
                    {stats.loading ? <span className="animate-pulse bg-white/10 rounded h-10 w-20 block" /> : stats.data?.activeCompanies || 0}
                  </p>
                  <p className="text-sm font-semibold text-white/40 mt-1 uppercase tracking-wider">Empresas Ativas</p>
                </div>
              </div>
            </div>

            {/* Card 2: Total Users */}
            <div className="group relative overflow-hidden rounded-[24px] bg-white/[0.02] border border-white/[0.05] p-6 backdrop-blur-xl transition-all hover:bg-white/[0.04] hover:border-white/[0.1]">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative flex flex-col h-full justify-between gap-8">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                    <Users size={20} />
                  </div>
                  <Activity size={18} className="text-blue-500/50" />
                </div>
                <div>
                  <p className="text-4xl font-black text-white tracking-tighter">
                    {stats.loading ? <span className="animate-pulse bg-white/10 rounded h-10 w-20 block" /> : stats.data?.users || 0}
                  </p>
                  <p className="text-sm font-semibold text-white/40 mt-1 uppercase tracking-wider">Usuários Totais</p>
                </div>
              </div>
            </div>

            {/* Card 3: Inadimplentes (Attention) */}
            <div className="group relative overflow-hidden rounded-[24px] bg-white/[0.02] border border-white/[0.05] p-6 backdrop-blur-xl transition-all hover:bg-white/[0.04] hover:border-white/[0.1]">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative flex flex-col h-full justify-between gap-8">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20">
                    <ShieldCheck size={20} />
                  </div>
                </div>
                <div>
                  <p className="text-4xl font-black text-white tracking-tighter">
                    {stats.loading ? <span className="animate-pulse bg-white/10 rounded h-10 w-20 block" /> : stats.data?.pastDueCompanies || 0}
                  </p>
                  <p className="text-sm font-semibold text-white/40 mt-1 uppercase tracking-wider">Inadimplentes</p>
                </div>
              </div>
            </div>

            {/* SPAN CARD: Revenue or General Metrics */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 group relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#8A05BE]/10 to-[#3c0353]/10 border border-[#8A05BE]/20 p-8 backdrop-blur-xl transition-all hover:border-[#8A05BE]/40">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#8A05BE]/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-black text-white mb-2">Visão Geral Operacional</h3>
                  <p className="text-sm text-white/50 max-w-md">
                    O ecossistema está rodando perfeitamente. O faturamento e o volume de acessos apresentam uma curva positiva de crescimento.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="text-center px-6 py-4 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md">
                    <p className="text-xs text-white/40 uppercase font-bold tracking-widest mb-1">Funcionários</p>
                    <p className="text-2xl font-black text-white">{stats.loading ? '-' : stats.data?.employees || 0}</p>
                  </div>
                  <div className="text-center px-6 py-4 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md">
                    <p className="text-xs text-white/40 uppercase font-bold tracking-widest mb-1">Suspensas</p>
                    <p className="text-2xl font-black text-rose-400">{stats.loading ? '-' : stats.data?.suspendedCompanies || 0}</p>
                  </div>
                </div>
              </div>
            </div>

          </motion.div>

          {/* QUICK LINKS - SPANS 4 COLS */}
          <motion.div custom={2} variants={FADE_UP} className="md:col-span-4 flex flex-col gap-4">
            <div className="mb-2 px-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Acesso Rápido</h3>
            </div>
            
            {QUICK_LINKS.map((link) => (
              <button 
                key={link.id}
                onClick={() => router.push(`/${tenant}/dashboard/platform${link.href}`)}
                className="group relative flex items-center gap-4 rounded-[20px] bg-white/[0.02] border border-white/[0.04] p-4 text-left transition-all hover:bg-white/[0.06] hover:border-white/[0.1] hover:-translate-y-0.5 overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${link.color} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/50 border border-white/5 shadow-inner">
                  <link.icon size={20} className={link.iconColor} />
                </div>
                <div className="relative flex-1">
                  <h4 className="text-sm font-bold text-white">{link.title}</h4>
                  <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{link.subtitle}</p>
                </div>
                <ChevronRight size={16} className="relative text-white/20 transition-transform group-hover:translate-x-1 group-hover:text-white" />
              </button>
            ))}
          </motion.div>

          {/* ────────────────────────────────────────────────────────
              BOTTOM SECTION: AUDIT TIMELINE
          ──────────────────────────────────────────────────────── */}
          <motion.div custom={3} variants={FADE_UP} className="md:col-span-12 mt-4">
            <div className="rounded-[24px] bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.05] p-6 bg-black/20">
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-[#8A05BE]" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Feed de Auditoria</h3>
                </div>
                <button 
                  onClick={() => router.push(`/${tenant}/dashboard/platform/audit`)}
                  className="text-xs font-bold text-white/40 hover:text-white transition-colors"
                >
                  Ver log completo
                </button>
              </div>
              
              <div className="p-6">
                <div className="relative border-l border-white/10 ml-4 space-y-8 py-2">
                  {RECENT_LOGS.map((log) => (
                    <div key={log.id} className="relative pl-8 group">
                      {/* Timeline Dot */}
                      <span className="absolute left-[-17px] top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black border border-white/10 ring-4 ring-[#020202] transition-colors group-hover:border-white/30">
                        <log.icon size={14} className={log.color} />
                      </span>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-white">{log.text}</p>
                          <p className="text-xs text-white/50 mt-1">{log.detail}</p>
                        </div>
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md self-start sm:self-auto">
                          {log.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}
