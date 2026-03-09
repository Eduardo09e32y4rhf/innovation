'use client';

import Link from 'next/link';
import {
    LayoutDashboard, MessageSquare, DollarSign, Briefcase, Sparkles,
    FileText, LifeBuoy, Users, Zap, Activity, TrendingUp,
    Trophy, Flame, CheckCircle2, ArrowUpRight,
    Bell, Settings, ChevronRight, Rocket, Brain, BookOpen, Clock, CreditCard, HeartHandshake, LogOut, Eye, EyeOff
} from 'lucide-react';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { AuthService, DashboardService } from '@/services/api';
import GamificationDashboard from '@/components/GamificationDashboard';
import AIKeyManager from '@/components/AIKeyManager';
import { motion } from 'framer-motion';

// ─── TYPES ────────────────────────────────────────────────────────────────
interface UserProfile {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    role?: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────
function fmtBRL(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

// ─── STAT CARD ─────────────────────────────────────────────────────────────
function StatCard({ stat, index, hidden }: { stat: any; index: number; hidden: boolean }) {
    const Icon = stat.icon;
    return (
        <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-indigo-100/40 transition-all group relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.colorClass} opacity-[0.03] group-hover:opacity-[0.07] transition-opacity rounded-bl-[4rem]`} />
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 shadow-sm ${stat.colorClass.split(' ')[0].replace('from-', 'text-')}`}>
                        <Icon size={24} />
                    </div>
                    <div className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full ${stat.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                        <ArrowUpRight size={12} />
                        {stat.change}
                    </div>
                </div>

                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{stat.title}</h3>
                <p className="text-2xl font-black text-slate-900 tracking-tight">
                    {hidden ? '••••••' : (stat.prefix || '') + stat.value + (stat.suffix || '')}
                </p>

                <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-slate-50 rounded-full overflow-hidden">
                        <div
                            className={`h-full bg-gradient-to-r ${stat.colorClass} transition-all duration-1000`}
                            style={{ width: `${stat.progress}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-black text-slate-400">{stat.progress}%</span>
                </div>
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
    const [hidden, setHidden] = useState(false);

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
            } finally {
                setLoading(false);
            }
        };
        load();
        const interval = setInterval(load, 30000); // Auto-refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const stats = [
        {
            title: 'Receita Mensal', prefix: 'R$ ', value: metrics?.revenue?.current?.toLocaleString('pt-BR') || '0',
            change: `+${metrics?.revenue?.change_percent || 0}%`,
            icon: DollarSign, colorClass: 'from-emerald-600 to-teal-500',
            progress: 84, positive: true
        },
        {
            title: 'Projetos Ativos', value: metrics?.projects || 0,
            change: 'Em execução',
            icon: FileText, colorClass: 'from-indigo-600 to-blue-500',
            progress: 62, positive: true
        },
        {
            title: 'Candidatos IA', value: metrics?.candidates || 0,
            change: 'Novos talentos',
            icon: Users, colorClass: 'from-amber-600 to-orange-500',
            progress: 45, positive: true
        },
        {
            title: 'Vagas Ativas', value: metrics?.active_jobs || 0,
            change: 'Em triagem',
            icon: Briefcase, colorClass: 'from-rose-600 to-pink-500',
            progress: 78, positive: false
        },
        {
            title: 'Score IA', value: metrics?.ai_score || 0, suffix: '/100',
            change: 'Eficácia média',
            icon: Brain, colorClass: 'from-purple-600 to-indigo-500',
            progress: metrics?.ai_score || 0, positive: true
        },
        {
            title: 'Lucro Líquido', prefix: 'R$ ', value: metrics?.profit?.current?.toLocaleString('pt-BR') || '0',
            change: `+${metrics?.profit?.change_percent || 0}%`,
            icon: TrendingUp, colorClass: 'from-cyan-600 to-blue-500',
            progress: 92, positive: true
        }
    ];

    return (
        <AppLayout title="Cockpit ERP — General">
            <div className="p-8 space-y-10 animate-in fade-in duration-700">

                {/* ── HEADER ────────────────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-1 uppercase">
                            Bem-vindo, <span className="text-indigo-600">{user?.name?.split(' ')[0] || 'Inovador'}</span>
                        </h1>
                        <p className="text-slate-9000 font-medium tracking-tight">Seu ecossistema cognitivo está operando em <span className="text-emerald-600 font-black italic">Alta Performance.</span></p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => setHidden(!hidden)} className="w-12 h-12 bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm">
                            {hidden ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                        <div className="flex flex-col items-end mr-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nível de Acesso</span>
                            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full mt-1">Enterprise Elite</span>
                        </div>
                    </div>
                </div>

                {/* ── STATS GRID ───────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stats.map((s, i) => <StatCard key={i} stat={s} index={i} hidden={hidden} />)}
                </div>

                {/* ── MID ROW ──────────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                    {/* Activity Feed */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                                <Activity size={24} className="text-indigo-600" /> Atividade em Tempo Real
                            </h2>
                            <button className="text-[10px] font-black uppercase text-indigo-600 tracking-widest hover:underline">Ver Log Completo</button>
                        </div>

                        <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-2">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="h-20 bg-slate-50 rounded-3xl animate-pulse mb-3" />
                                ))
                            ) : activities.length === 0 ? (
                                <div className="text-center py-20 grayscale opacity-40">
                                    <Activity size={48} className="mx-auto mb-4 text-slate-700" />
                                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Aguardando telemetria neural...</p>
                                </div>
                            ) : (
                                activities.slice(0, 6).map((item, i) => (
                                    <div key={i} className="flex items-center gap-5 p-5 rounded-2xl bg-white border-slate-200 border-black/5 shadow-sm border-transparent hover:border-slate-100 hover:bg-slate-50/50 transition-all group">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner shrink-0 group-hover:scale-110 transition-transform">
                                            {item.candidate_name ? <Users size={20} /> : <Zap size={20} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                                                    {item.candidate_name || 'Agente de Sistema'}
                                                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </p>
                                            </div>
                                            <p className="text-xs text-slate-9000 font-medium line-clamp-1">{item.message}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-700 group-hover:bg-indigo-600 group-hover:text-slate-900 transition-all cursor-pointer">
                                            <ChevronRight size={18} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Quick Shortcuts & AI Management */}
                    <div className="lg:col-span-4 space-y-10">
                        {/* IA Manager */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                                <Sparkles size={24} className="text-indigo-600" /> Inteligência Ativa
                            </h2>
                            <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-slate-900 shadow-xl shadow-indigo-100 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[5rem] pointer-events-none" />

                                <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white border-slate-200 border-black/5 shadow-sm/20 rounded-2xl backdrop-blur-md">
                                            <Brain size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black tracking-tight">InnovationIA</h3>
                                            <p className="text-[10px] uppercase font-black tracking-widest opacity-60">Status: Disponível</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium leading-relaxed italic opacity-90">"Como posso otimizar sua gestão financeira hoje? Notei 3 faturas pendentes que vencem amanhã."</p>
                                    </div>
                                    <Link href="/chat-ia" className="w-full bg-white border-slate-200 border-black/5 shadow-sm text-indigo-600 py-4 rounded-[1.5rem] font-black text-center text-[10px] uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-all">Iniciar Diálogo</Link>
                                </div>
                            </div>
                        </div>

                        {/* Top Features - Dynamic Short-term analytics */}
                        {metrics?.most_frequented && metrics.most_frequented.length > 0 && (
                            <div className="space-y-6">
                                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Módulos Frequentados (IA Insight)</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    {metrics.most_frequented.map((feat: any, i: number) => {
                                        const iconMap: any = {
                                            'finance': DollarSign,
                                            'application': Users,
                                            'job': Briefcase,
                                            'project': Rocket,
                                            'chat': MessageSquare,
                                            'task': Clock
                                        };
                                        const colorMap: any = {
                                            'finance': { color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                            'application': { color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                            'job': { color: 'text-rose-600', bg: 'bg-rose-50' },
                                            'project': { color: 'text-amber-600', bg: 'bg-amber-50' },
                                            'chat': { color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                            'task': { color: 'text-blue-600', bg: 'bg-blue-50' }
                                        };
                                        const Icon = iconMap[feat.module] || Zap;
                                        const col = colorMap[feat.module] || { color: 'text-slate-600', bg: 'bg-slate-50' };

                                        return (
                                            <div key={i} className="flex flex-col items-center gap-3 p-6 bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2rem] hover:border-indigo-100 shadow-sm transition-all group">
                                                <div className={`w-12 h-12 rounded-2xl ${col.bg} flex items-center justify-center ${col.color} shadow-inner`}>
                                                    <Icon size={20} />
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest block">{feat.module === 'application' ? 'Talentos' : feat.module.charAt(0).toUpperCase() + feat.module.slice(1)}</span>
                                                    <span className="text-[9px] font-bold text-slate-400">{feat.count} ações</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Standard Navigation Shortcuts */}
                        <div className="space-y-6">
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Acesso Rápido</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Finanças', icon: DollarSign, href: '/finance', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                    { label: 'Talentos', icon: Users, href: '/rh', color: 'text-indigo-600', bg: 'bg-indigo-50' }
                                ].map((link, i) => {
                                    const Icon = link.icon || Rocket;
                                    return (
                                        <Link key={i} href={link.href} className="flex flex-col items-center gap-3 p-6 bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2rem] hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-100/30 transition-all group">
                                            <div className={`w-12 h-12 rounded-2xl ${link.bg} flex items-center justify-center ${link.color} shadow-inner group-hover:scale-110 transition-transform`}>
                                                <Icon size={20} />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{link.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── ADMIN: AI KEY MANAGEMENT ───────────────────────────────────── */}
                {user?.role === 'admin' && (
                    <div className="pt-8 border-t border-slate-100">
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                            <Settings size={24} className="text-slate-400" /> Infraestrutura & Chaves
                        </h2>
                        <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2.5rem] p-4 shadow-sm overflow-hidden">
                            <AIKeyManager />
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
