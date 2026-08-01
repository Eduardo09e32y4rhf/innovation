'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CreditCard,
  FileSignature,
  Settings2,
  Shield,
  ShieldCheck,
  Users,
  WalletCards,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  UserPlus,
  RefreshCw,
} from 'lucide-react';
import { useQuery } from '@/app/hooks/use-data';
import { api, type PlatformStats } from '@/app/lib/api';

/* ═══════════════════════════════════════════════════════════════
   ANIMATION VARIANTS
═══════════════════════════════════════════════════════════════ */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

/* ═══════════════════════════════════════════════════════════════
   STAT ITEMS
═══════════════════════════════════════════════════════════════ */
const STAT_ITEMS: {
  label: string;
  key: keyof PlatformStats;
  icon: typeof Building2;
  color: string;
  dotColor: string;
}[] = [
  { label: 'Empresas', key: 'companies', icon: Building2, color: 'text-violet-500', dotColor: 'bg-violet-500' },
  { label: 'Ativas', key: 'activeCompanies', icon: Activity, color: 'text-emerald-500', dotColor: 'bg-emerald-500' },
  { label: 'Usuários', key: 'users', icon: Users, color: 'text-blue-500', dotColor: 'bg-blue-500' },
  { label: 'Funcionários', key: 'employees', icon: Users, color: 'text-sky-500', dotColor: 'bg-sky-500' },
  { label: 'Suspensas', key: 'suspendedCompanies', icon: Shield, color: 'text-amber-500', dotColor: 'bg-amber-500' },
  { label: 'Inadimplentes', key: 'pastDueCompanies', icon: AlertTriangle, color: 'text-rose-500', dotColor: 'bg-rose-500' },
];

/* ═══════════════════════════════════════════════════════════════
   HERO MINI-CARDS
═══════════════════════════════════════════════════════════════ */
const HERO_METRICS: { label: string; key: keyof PlatformStats; icon: typeof Building2; format?: (v: number) => string }[] = [
  { label: 'Empresas', key: 'companies', icon: Building2 },
  { label: 'Assinaturas Ativas', key: 'activeCompanies', icon: CreditCard },
  { label: 'Usuários totais', key: 'users', icon: Users },
];

/* ═══════════════════════════════════════════════════════════════
   QUICK ACTIONS
═══════════════════════════════════════════════════════════════ */
const QUICK_ACTIONS = [
  {
    title: 'Financeiro',
    description: 'Cobranças, sincronização Asaas, reembolso, inadimplência e extratos operacionais.',
    href: '/finance',
    icon: WalletCards,
    gradient: 'from-[#8A05BE] to-[#6c0494]',
    bullets: ['Cobrança manual e automática', 'Reembolso e cancelamento', 'Eventos e falhas Asaas'],
  },
  {
    title: 'Contratos',
    description: 'Gestão comercial com ciclo de vida, vínculo com empresa e documento operacional.',
    href: '/contracts',
    icon: FileSignature,
    gradient: 'from-slate-700 to-slate-900',
    bullets: ['Criar e editar contrato', 'Resumo de vigência e status', 'Documento e observações'],
  },
  {
    title: 'Configuração',
    description: 'Hub administrativo para empresas, planos, permissões, acessos e auditoria.',
    href: '/configuration',
    icon: Settings2,
    gradient: 'from-zinc-800 to-zinc-950',
    bullets: ['Planos e limites', 'Permissões globais', 'Auditoria e acessos DEV'],
  },
];

/* ═══════════════════════════════════════════════════════════════
   RECENT ACTIVITY (mock — pode ser substituído por endpoint)
═══════════════════════════════════════════════════════════════ */
const RECENT_ACTIVITY = [
  { id: 1, type: 'company_created', text: 'Nova empresa cadastrada', detail: 'Tech Solutions Ltda', time: 'Há 12 min', icon: Building2, dot: 'bg-violet-500' },
  { id: 2, type: 'user_added', text: 'Novo usuário adicionado', detail: 'Maria Silva — Admin', time: 'Há 34 min', icon: UserPlus, dot: 'bg-blue-500' },
  { id: 3, type: 'payment_confirmed', text: 'Pagamento confirmado', detail: 'Plano Premium — R$ 299,90', time: 'Há 1h', icon: CheckCircle2, dot: 'bg-emerald-500' },
  { id: 4, type: 'subscription_cancelled', text: 'Assinatura cancelada', detail: 'Café & Cia ME', time: 'Há 2h', icon: XCircle, dot: 'bg-rose-500' },
  { id: 5, type: 'contract_renewed', text: 'Contrato renovado', detail: 'Delta Engenharia — 12 meses', time: 'Há 3h', icon: RefreshCw, dot: 'bg-amber-500' },
  { id: 6, type: 'company_created', text: 'Nova empresa cadastrada', detail: 'Innovare Consultoria', time: 'Há 5h', icon: Building2, dot: 'bg-violet-500' },
  { id: 7, type: 'payment_confirmed', text: 'Pagamento confirmado', detail: 'Plano Essencial — R$ 149,90', time: 'Há 6h', icon: CheckCircle2, dot: 'bg-emerald-500' },
];

/* ═══════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════ */
export default function PlatformDashboardPage() {
  const params = useParams();
  const tenant = String(params?.tenant || '');
  const stats = useQuery(() => api.platform.stats(), []);

  return (
    <div className="mx-auto w-full space-y-8 pb-12">
      {/* ────────────────────────────────────────────────────────
          HERO BANNER
      ──────────────────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={scaleIn}
        className="relative overflow-hidden rounded-[28px] border border-white/[0.06] bg-[#050505] text-white shadow-[0_30px_90px_-30px_rgba(138,5,190,0.45)]"
      >
        {/* Gradient overlays */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_10%_-10%,rgba(138,5,190,0.30),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_100%_110%,rgba(138,5,190,0.15),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02),transparent_70%)]" />

        {/* Subtle grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative grid gap-8 p-7 sm:p-9 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
          {/* Left: headline */}
          <div className="space-y-5">
            <motion.p
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full bg-[#8A05BE]/15 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#d48aff] ring-1 ring-[#8A05BE]/40 backdrop-blur-sm"
            >
              <Zap size={11} className="text-[#d48aff]" />
              Plataforma central
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl text-[28px] font-black leading-[1.15] tracking-[-0.03em] text-white sm:text-[34px]"
            >
              Console unificado para empresas, contratos e cobranças.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="max-w-xl text-[13px] leading-relaxed text-white/45 sm:text-sm"
            >
              A raiz da Plataforma funciona como hub. Cada bloco leva para um fluxo próprio e evita
              repetir informação de Financeiro, Contratos e Configuração em várias telas ao mesmo tempo.
            </motion.p>
          </div>

          {/* Right: mini metric cards */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1"
          >
            {HERO_METRICS.map((item, i) => (
              <motion.article
                key={item.label}
                custom={i}
                variants={fadeUp}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-md transition-all duration-300 hover:border-[#8A05BE]/40 hover:bg-white/[0.07]"
              >
                {/* Subtle hover glow */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[#8A05BE]/0 transition-all duration-500 group-hover:bg-[#8A05BE]/[0.04]" />

                <div className="relative flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                      {item.label}
                    </span>
                    <p className="mt-1.5 text-xl font-black text-white">
                      {stats.loading ? (
                        <span className="inline-block h-6 w-14 animate-pulse rounded-lg bg-white/10" />
                      ) : (
                        (stats.data?.[item.key] ?? '—').toLocaleString('pt-BR')
                      )}
                    </p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8A05BE]/15 transition-colors duration-300 group-hover:bg-[#8A05BE]/25">
                    <item.icon size={16} className="text-[#d48aff]" />
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ────────────────────────────────────────────────────────
          STATS GRID
      ──────────────────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6"
      >
        {STAT_ITEMS.map(({ label, key, icon: Icon, color, dotColor }, i) => (
          <motion.div
            key={label}
            custom={i}
            variants={fadeUp}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#8A05BE]/20 hover:shadow-[0_12px_40px_rgba(138,5,190,0.08)]"
          >
            {/* Top row: label + icon */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {label}
                </p>
              </div>
              <Icon size={15} strokeWidth={1.8} className={`${color} opacity-60 transition-opacity group-hover:opacity-100`} />
            </div>

            {/* Value */}
            <p className="mt-4 text-[26px] font-black leading-none text-slate-950">
              {stats.loading ? (
                <span className="inline-block h-7 w-12 animate-pulse rounded-lg bg-slate-100" />
              ) : (
                (stats.data?.[key] ?? '—').toLocaleString('pt-BR')
              )}
            </p>
          </motion.div>
        ))}
      </motion.section>

      {/* ────────────────────────────────────────────────────────
          BOTTOM SECTION: Activity + Quick Actions
      ──────────────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        {/* ─── Recent Activity ─── */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={scaleIn}
          className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
                <Clock size={14} className="text-white" />
              </div>
              <h2 className="text-sm font-black text-slate-900">Atividade Recente</h2>
            </div>
            <Link
              href={`/${tenant}/dashboard/platform/audit`}
              className="flex items-center gap-1 text-[11px] font-bold text-[#8A05BE] transition-colors hover:text-[#6c0494]"
            >
              Ver tudo
              <ArrowUpRight size={12} />
            </Link>
          </div>

          {/* Timeline */}
          <div className="max-h-[420px] overflow-y-auto">
            {RECENT_ACTIVITY.map((item, i) => (
              <motion.div
                key={item.id}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="group flex items-start gap-4 border-b border-slate-50 px-6 py-4 transition-colors last:border-b-0 hover:bg-slate-50/50"
              >
                {/* Timeline dot + line */}
                <div className="relative flex flex-col items-center pt-0.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.dot} ring-4 ring-white shadow-sm`} />
                  {i < RECENT_ACTIVITY.length - 1 && (
                    <span className="mt-1 h-full w-px bg-slate-100" />
                  )}
                </div>

                {/* Icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 transition-colors group-hover:bg-slate-200/70">
                  <item.icon size={15} strokeWidth={1.8} className="text-slate-500" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800">{item.text}</p>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                    {item.detail}
                  </p>
                </div>

                {/* Time */}
                <span className="shrink-0 text-[10px] font-semibold text-slate-300">{item.time}</span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ─── Quick Actions ─── */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="flex flex-col gap-4"
        >
          {QUICK_ACTIONS.map((action, i) => (
            <motion.div key={action.title} custom={i} variants={fadeUp}>
              <Link
                href={`/${tenant}/dashboard/platform${action.href}`}
                className="group flex flex-col rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#8A05BE]/25 hover:shadow-[0_16px_50px_-12px_rgba(138,5,190,0.15)]"
              >
                {/* Top: Icon + Arrow */}
                <div className="flex items-start justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${action.gradient} shadow-lg shadow-black/10 transition-transform duration-300 group-hover:scale-105`}>
                    <action.icon size={18} className="text-white" />
                  </span>
                  <ArrowRight
                    size={14}
                    className="mt-1 text-slate-300 transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#8A05BE]"
                  />
                </div>

                {/* Title + Description */}
                <h3 className="mt-4 text-[15px] font-black text-slate-950">{action.title}</h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">{action.description}</p>

                {/* Bullet chips */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {action.bullets.map((bullet) => (
                    <span
                      key={bullet}
                      className="rounded-full border border-slate-100 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500 transition-colors group-hover:border-[#8A05BE]/10 group-hover:text-slate-600"
                    >
                      {bullet}
                    </span>
                  ))}
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.section>
      </div>
    </div>
  );
}
