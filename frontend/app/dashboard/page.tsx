'use client';

import Link from 'next/link';
import {
    LayoutDashboard, MessageSquare, DollarSign, Briefcase,
    FileText, LifeBuoy, Users, Zap, Activity, TrendingUp,
    Trophy, Flame, CheckCircle2, ArrowUpRight,
    Bell, Settings, ChevronRight, Rocket, Brain, BookOpen, Clock, CreditCard, HeartHandshake, LogOut
} from 'lucide-react';
import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { AuthService, DashboardService } from '../../services/api';

// ─── TYPES ────────────────────────────────────────────────────────────────
interface UserProfile {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    role?: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────
function getInitials(name: string) {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function useCountUp(target: number, duration = 1200) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        const start = performance.now();
        const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            setValue(Math.floor(p * target));
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [target, duration]);
    return value;
}

// ─── SPARKLINE ─────────────────────────────────────────────────────────────
function Sparkline({ data, color = '#8b5cf6' }: { data: number[]; color?: string }) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const w = 80, h = 32;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-80">
            <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
            <circle cx={pts.split(' ').at(-1)?.split(',')[0]} cy={pts.split(' ').at(-1)?.split(',')[1]} r="3" fill={color} />
        </svg>
    );
}

// ─── STAT CARD ─────────────────────────────────────────────────────────────
function StatCard({ stat, index }: { stat: any; index: number }) {
    const Icon = stat.icon;
    const count = useCountUp(stat.raw, 1000 + index * 150);
    return (
        <div
            className="group relative bg-white/[0.03] border border-white/8 rounded-2xl p-5 hover:border-[#8b5cf6]/40 hover:bg-white/[0.05] transition-all duration-300 overflow-hidden"
            style={{ animationDelay: `${index * 80}ms` }}
        >
            {/* Glow */}
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-[#8b5cf6]/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
                    <ArrowUpRight className="w-3 h-3" />
                    {stat.change}
                </div>
            </div>

            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{stat.title}</p>
            <p className="text-2xl font-black text-white">
                {stat.prefix}{count.toLocaleString('pt-BR')}{stat.suffix}
            </p>

            <div className="mt-3 flex items-center justify-between">
                <div className="flex-1 h-1 bg-white/5 rounded-full mr-3">
                    <div
                        className={`h-1 rounded-full transition-all duration-1000 ${stat.barColor}`}
                        style={{ width: `${stat.progress}%` }}
                    />
                </div>
                <Sparkline data={stat.sparkline} color={stat.sparkColor} />
            </div>
        </div>
    );
}

// ─── HEAT MAP ──────────────────────────────────────────────────────────────
function ActivityHeatmap() {
    const weeks = 12;
    const days = 7;
    const grid = Array.from({ length: weeks }, (_, w) =>
        Array.from({ length: days }, (_, d) => {
            const r = Math.random();
            if (r < 0.25) return 0;
            if (r < 0.5) return 1;
            if (r < 0.75) return 2;
            if (r < 0.9) return 3;
            return 4;
        })
    );
    const levels = [
        'bg-white/5',
        'bg-[#8b5cf6]/20',
        'bg-[#8b5cf6]/40',
        'bg-[#8b5cf6]/70',
        'bg-[#8b5cf6]',
    ];
    const dayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    return (
        <div className="flex gap-1 items-end">
            <div className="flex flex-col gap-1 mr-1">
                {dayLabels.map((d, i) => (
                    <span key={i} className="text-[9px] text-white/20 leading-none" style={{ height: '10px', lineHeight: '10px' }}>{d}</span>
                ))}
            </div>
            {grid.map((week, w) => (
                <div key={w} className="flex flex-col gap-1">
                    {week.map((day, d) => (
                        <div
                            key={d}
                            className={`w-2.5 h-2.5 rounded-sm ${levels[day]} transition-transform hover:scale-125 cursor-default`}
                            title={`${day} atividades`}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

// ─── XP BAR ────────────────────────────────────────────────────────────────
function XpBar({ xp, maxXp, level }: { xp: number; maxXp: number; level: number }) {
    const pct = Math.min((xp / maxXp) * 100, 100);
    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-white/40 font-medium">Nível {level} → {level + 1}</span>
                <span className="text-[10px] text-[#8b5cf6] font-bold">{xp} / {maxXp} XP</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa] transition-all duration-1000"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}


// ─── MAIN PAGE ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [metrics, setMetrics] = useState<any>(null);
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [missions, setMissions] = useState([
        { id: 1, label: 'Enviar 1ª mensagem ao Chat IA', xp: 50, done: true },
        { id: 2, label: 'Criar uma vaga no ATS', xp: 100, done: false },
        { id: 3, label: 'Revisar Financeiro do mês', xp: 75, done: false },
        { id: 4, label: 'Abrir ticket de suporte', xp: 50, done: true },
        { id: 5, label: 'Explorar módulo de Projetos', xp: 80, done: false },
    ]);

    useEffect(() => {
        const load = async () => {
            try {
                const [u, m, a] = await Promise.all([
                    AuthService.me().catch(() => null),
                    DashboardService.getMetrics().catch(() => null),
                    DashboardService.getRecentActivity().catch(() => null),
                ]);
                if (u) setUser(u);
                if (m) setMetrics(m);
                if (a) setActivities(a.activities || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const toggleMission = (id: number) => {
        setMissions(prev => prev.map(m => m.id === id ? { ...m, done: !m.done } : m));
    };

    const stats = [
        {
            title: 'Receita Mensal', prefix: 'R$ ', suffix: '', raw: metrics?.revenue?.current ?? 0,
            change: `+${metrics?.revenue?.change_percent ?? 0}%`,
            icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10', barColor: 'bg-green-500',
            sparkColor: '#22c55e', sparkline: metrics?.revenue?.chart_data?.map((d: any) => d.value) ?? [0, 0, 0, 0, 0],
            progress: 0,
        },
        {
            title: 'Lucro Líquido', prefix: 'R$ ', suffix: '', raw: metrics?.profit?.current ?? 0,
            change: `+${metrics?.profit?.change_percent ?? 0}%`,
            icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10', barColor: 'bg-blue-500',
            sparkColor: '#3b82f6', sparkline: metrics?.profit?.chart_data?.map((d: any) => d.value) ?? [0, 0, 0, 0, 0],
            progress: 0,
        },
        {
            title: 'Projetos Ativos', prefix: '', suffix: '', raw: metrics?.projects ?? 0,
            change: 'Total de projetos',
            icon: FileText, color: 'text-orange-400', bg: 'bg-orange-500/10', barColor: 'bg-orange-500',
            sparkColor: '#f97316', sparkline: [0, 0, 0, 0, metrics?.projects ?? 0],
            progress: metrics?.projects ? 100 : 0,
        },
        {
            title: 'Candidatos IA', prefix: '', suffix: '', raw: metrics?.candidates ?? 0,
            change: 'Total de aplicações',
            icon: Users, color: 'text-pink-400', bg: 'bg-pink-500/10', barColor: 'bg-pink-500',
            sparkColor: '#ec4899', sparkline: [0, 0, 0, 0, metrics?.candidates ?? 0],
            progress: metrics?.candidates ? 100 : 0,
        },
        {
            title: 'Vagas Ativas', prefix: '', suffix: '', raw: metrics?.active_jobs ?? 0,
            change: 'Vagas publicadas',
            icon: Briefcase, color: 'text-teal-400', bg: 'bg-teal-500/10', barColor: 'bg-teal-500',
            sparkColor: '#14b8a6', sparkline: [0, 0, 0, 0, metrics?.active_jobs ?? 0],
            progress: metrics?.active_jobs ? 100 : 0,
        },
        {
            title: 'Score IA', prefix: '', suffix: '/100', raw: metrics?.ai_score ?? 0,
            change: 'Eficiência média',
            icon: Brain, color: 'text-[#a78bfa]', bg: 'bg-[#8b5cf6]/10', barColor: 'bg-[#8b5cf6]',
            sparkColor: '#a78bfa', sparkline: [0, 0, 0, 0, metrics?.ai_score ?? 0],
            progress: metrics?.ai_score ?? 0,
        },
    ];

    const moduleRanking = [
        { name: 'Chat IA', icon: MessageSquare, uses: activities.filter(a => a.message.includes("CHAT_MESSAGE")).length, color: 'text-[#8b5cf6]', bar: 100 },
        { name: 'ATS / Vagas', icon: Briefcase, uses: metrics?.active_jobs ?? 0, color: 'text-pink-400', bar: 37 },
        { name: 'Financeiro', icon: DollarSign, uses: 0, color: 'text-green-400', bar: 10 },
    ];

    const achievements = [
        { label: 'Pioneiro IA', icon: '🚀', earned: (metrics?.user?.points ?? 0) > 0 },
        { label: '10 Chats', icon: '💬', earned: activities.filter(a => a.message.includes("CHAT_MESSAGE")).length >= 10 },
        { label: 'Analisador', icon: '🧠', earned: (metrics?.ai_score ?? 0) > 50 },
        { label: 'Recrutador', icon: '🎯', earned: (metrics?.active_jobs ?? 0) > 0 },
        { label: 'Financista', icon: '💰', earned: metrics?.revenue?.current > 0 },
        { label: 'Mestre', icon: '👑', earned: (metrics?.user?.level ?? 1) >= 10 },
    ];

    return (
        <AppLayout title="Dashboard — Visão Geral">
            <div className="min-h-screen text-white">

                <div className="p-8 space-y-8">

                    {/* ── WELCOME HERO ─────────────────────────────────────────────── */}
                    <div className="relative bg-gradient-to-r from-[#8b5cf6]/10 via-white/[0.02] to-transparent border border-white/5 rounded-3xl p-6 overflow-hidden">
                        <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-gradient-to-l from-[#8b5cf6]/8 to-transparent" />
                        <div className="relative flex items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                {/* Avatar grande */}
                                <div className="relative shrink-0">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center text-white font-black text-xl shadow-2xl shadow-[#8b5cf6]/30">
                                        {user ? getInitials(user.name) : '?'}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-md px-1.5 py-0.5 text-[9px] font-black text-black">
                                        Nv.{metrics?.user?.level ?? 1}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Flame className="w-4 h-4 text-orange-400" />
                                        <span className="text-xs text-orange-400 font-bold">7 dias seguidos!</span>
                                    </div>
                                    <h1 className="text-2xl font-black text-white leading-tight">
                                        Olá, {user ? user.name.split(' ')[0] : 'Utilizador'} 👋
                                    </h1>
                                    <p className="text-sm text-white/40 mt-1">
                                        Você está no <span className="text-[#a78bfa] font-semibold">Top&nbsp;5%</span> dos utilizadores mais ativos esta semana.
                                    </p>
                                </div>
                            </div>
                            <div className="hidden lg:flex flex-col items-end gap-2 shrink-0">
                                <div className="flex items-center gap-2 text-sm font-medium text-white/60">
                                    <Trophy className="w-4 h-4 text-yellow-400" />
                                    <span>{metrics?.user?.points?.toLocaleString() ?? 0} XP acumulados</span>
                                </div>
                                <div className="w-48">
                                    <XpBar xp={metrics?.user?.xp_in_level ?? 0} maxXp={metrics?.user?.next_level_xp ?? 1000} level={metrics?.user?.level ?? 1} />
                                </div>
                                <div className="flex gap-1.5 mt-1">
                                    {achievements.map((a, i) => (
                                        <div key={i} title={a.label} className={`text-lg transition-all ${a.earned ? 'grayscale-0' : 'grayscale opacity-30'} hover:scale-125`}>
                                            {a.icon}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── STATS GRID ───────────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stats.map((s, i) => <StatCard key={i} stat={s} index={i} />)}
                    </div>

                    {/* ── MID ROW ──────────────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Ranking de Módulos */}
                        <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h2 className="text-sm font-bold text-white">Módulos Mais Usados</h2>
                                    <p className="text-[10px] text-white/30">Seu ranking de uso</p>
                                </div>
                                <Trophy className="w-5 h-5 text-yellow-400" />
                            </div>
                            <div className="space-y-4">
                                {moduleRanking.map((m, i) => {
                                    const Icon = m.icon;
                                    const medal = ['🥇', '🥈', '🥉', '4°', '5°'][i];
                                    return (
                                        <div key={i} className="flex items-center gap-3 group">
                                            <span className="text-sm w-6 text-center">{medal}</span>
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                                <Icon className={`w-4 h-4 ${m.color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-medium text-white/80">{m.name}</span>
                                                    <span className="text-[10px] text-white/30">{m.uses.toLocaleString()}</span>
                                                </div>
                                                <div className="h-1 bg-white/5 rounded-full">
                                                    <div className={`h-1 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa] transition-all duration-1000`} style={{ width: `${m.bar}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Gráfico de Receita */}
                        <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h2 className="text-sm font-bold text-white">Evolução da Receita</h2>
                                    <p className="text-[10px] text-white/30">Últimos 6 meses</p>
                                </div>
                                <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-bold">+12% MoM</span>
                            </div>
                            <div className="flex items-end justify-between gap-3 h-40">
                                {([
                                    { month: 'Set', v: 35 }, { month: 'Out', v: 45 }, { month: 'Nov', v: 55 },
                                    { month: 'Dez', v: 48 }, { month: 'Jan', v: 70 }, { month: 'Fev', v: 90 },
                                ]).map((d, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                                        <span className="text-[10px] text-white/50 group-hover:text-white transition-colors">{d.v}%</span>
                                        <div className="w-full bg-white/5 rounded-lg relative overflow-hidden" style={{ height: '120px' }}>
                                            <div
                                                className="absolute bottom-0 w-full bg-gradient-to-t from-[#8b5cf6] to-[#a78bfa] rounded-lg transition-all duration-1000 hover:opacity-100 opacity-80"
                                                style={{ height: `${d.v}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-white/30">{d.month}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── BOTTOM ROW ───────────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Missões Diárias */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h2 className="text-sm font-bold text-white">Missões Diárias</h2>
                                    <p className="text-[10px] text-white/30">{missions.filter(m => m.done).length}/{missions.length} completas</p>
                                </div>
                                <Rocket className="w-5 h-5 text-[#8b5cf6]" />
                            </div>
                            {/* Progress ring */}
                            <div className="flex justify-center mb-5">
                                <div className="relative w-20 h-20">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                                        <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                                        <circle cx="40" cy="40" r="34" fill="none" stroke="#8b5cf6" strokeWidth="6"
                                            strokeDasharray={`${2 * Math.PI * 34}`}
                                            strokeDashoffset={`${2 * Math.PI * 34 * (1 - missions.filter(m => m.done).length / missions.length)}`}
                                            strokeLinecap="round" className="transition-all duration-1000" />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-lg font-black text-white">{Math.round(missions.filter(m => m.done).length / missions.length * 100)}%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {missions.map(m => (
                                    <button key={m.id} onClick={() => toggleMission(m.id)}
                                        className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded-xl transition-all hover:bg-white/5 ${m.done ? 'opacity-50' : ''}`}>
                                        <CheckCircle2 className={`w-4 h-4 shrink-0 transition-colors ${m.done ? 'text-green-500' : 'text-white/15'}`} />
                                        <span className={`flex-1 text-xs ${m.done ? 'line-through text-white/30' : 'text-white/70'}`}>{m.label}</span>
                                        <span className="text-[10px] font-bold text-[#8b5cf6]">+{m.xp} XP</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Atividade Recente + Heatmap */}
                        <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h2 className="text-sm font-bold text-white">Atividade Recente</h2>
                                    <p className="text-[10px] text-white/30">Feed em tempo real</p>
                                </div>
                                <Activity className="w-5 h-5 text-[#8b5cf6]" />
                            </div>

                            {/* Heatmap */}
                            <div className="mb-5 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                <p className="text-[9px] text-white/20 uppercase tracking-widest mb-2">Mapa de Atividade — últimas 12 semanas</p>
                                <ActivityHeatmap />
                            </div>

                            {/* Feed */}
                            <div className="space-y-3">
                                {loading ? (
                                    [...Array(3)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-3 animate-pulse">
                                            <div className="w-9 h-9 rounded-full bg-white/5" />
                                            <div className="flex-1 space-y-1">
                                                <div className="h-3 bg-white/5 rounded w-3/4" />
                                                <div className="h-2 bg-white/5 rounded w-1/2" />
                                            </div>
                                        </div>
                                    ))
                                ) : activities.length === 0 ? (
                                    [
                                        { name: 'Sistema IA', msg: 'Análise de 12 CVs concluída com 94% de precisão', time: '2m', badge: '🤖' },
                                        { name: 'Financeiro', msg: 'Relatório mensal gerado automaticamente', time: '15m', badge: '💰' },
                                        { name: 'Chat IA', msg: 'Novo contexto de empresa configurado', time: '1h', badge: '💬' },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 group hover:bg-white/[0.02] px-2 py-1.5 rounded-xl transition-all">
                                            <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0">
                                                {item.badge}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-white">{item.name}</p>
                                                <p className="text-[11px] text-white/40 truncate">{item.msg}</p>
                                            </div>
                                            <span className="text-[10px] text-white/20 shrink-0">{item.time}</span>
                                        </div>
                                    ))
                                ) : activities.slice(0, 4).map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 hover:bg-white/[0.02] px-2 py-1.5 rounded-xl transition-all">
                                        <div className="w-9 h-9 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center shrink-0">
                                            <Activity className="w-4 h-4 text-[#8b5cf6]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-white">{item.candidate_name || 'Sistema'}</p>
                                            <p className="text-[11px] text-white/40 truncate">{item.message}</p>
                                        </div>
                                        <span className="text-[10px] text-white/20 shrink-0">
                                            {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── QUICK ACCESS ─────────────────────────────────────────────── */}
                    <div>
                        <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-4">Acesso Rápido</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            {[
                                { label: 'Chat IA', href: '/chat-ia', icon: MessageSquare, color: 'text-[#8b5cf6]', bg: 'bg-[#8b5cf6]/10' },
                                { label: 'Vagas', href: '/ats', icon: Briefcase, color: 'text-pink-400', bg: 'bg-pink-500/10' },
                                { label: 'Financeiro', href: '/finance', icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
                                { label: 'Projetos', href: '/projects', icon: FileText, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                                { label: 'Suporte', href: '/support', icon: LifeBuoy, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                                { label: 'RH', href: '/rh', icon: HeartHandshake, color: 'text-teal-400', bg: 'bg-teal-500/10' },
                            ].map((item, i) => {
                                const Icon = item.icon;
                                return (
                                    <Link key={i} href={item.href}
                                        className="flex flex-col items-center gap-2 p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-[#8b5cf6]/30 hover:bg-white/[0.05] transition-all group">
                                        <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                            <Icon className={`w-5 h-5 ${item.color}`} />
                                        </div>
                                        <span className="text-xs font-medium text-white/60 group-hover:text-white transition-colors">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                </div>

            </div>
        </AppLayout>
    );
}
