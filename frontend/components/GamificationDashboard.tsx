'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, Rocket, CheckCircle2, Star, Zap, ChevronRight, Target } from 'lucide-react';

interface Mission {
    id: number;
    title: string;
    description?: string;
    xp_reward: number;
    done: boolean;
}

interface GamificationDashboardProps {
    user: {
        name: string;
        points: number;
        level: number;
        xp_in_level: number;
        next_level_xp: number;
    };
    missions: Mission[];
    achievements: { label: string; icon: string; earned: boolean }[];
}

export default function GamificationDashboard({ user, missions, achievements }: GamificationDashboardProps) {
    const xpPercentage = Math.min((user.xp_in_level / user.next_level_xp) * 100, 100);
    const completedMissions = missions.filter(m => m.done).length;
    const missionProgress = missions.length > 0 ? (completedMissions / missions.length) * 100 : 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Progress Card (Level & XP) ─────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-1 relative overflow-hidden bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm group hover:shadow-xl hover:shadow-indigo-100/40 transition-all duration-500"
            >
                {/* Visual Glows */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-50 rounded-full blur-[80px] group-hover:bg-indigo-100/50 transition-all duration-700" />

                <div className="relative z-10 space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
                                <Trophy className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Rank Atual</h3>
                                <p className="text-3xl font-black text-slate-900 tracking-tight italic">Level {user.level}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-1.5 justify-end text-orange-500 font-black">
                                <Flame className="w-4 h-4 fill-orange-500" />
                                <span className="text-sm">7 Dias</span>
                            </div>
                            <p className="text-[9px] text-slate-300 uppercase font-black tracking-widest">Streak Ativa</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-end px-1">
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Evolução Cognitiva</span>
                            <span className="text-[10px] text-indigo-600 font-black">{user.xp_in_level} / {user.next_level_xp} XP</span>
                        </div>
                        <div className="h-4 bg-slate-50 rounded-full overflow-hidden p-1 border border-slate-100 shadow-inner">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${xpPercentage}%` }}
                                transition={{ duration: 1.5, ease: "circOut" }}
                                className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-400 shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50/50 border border-slate-100 rounded-[1.8rem] p-4 text-center group-hover:bg-white transition-colors">
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Total acumulado</p>
                            <p className="text-xl font-black text-slate-900">{user.points.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50/50 border border-slate-100 rounded-[1.8rem] p-4 text-center group-hover:bg-white transition-colors">
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Posição Global</p>
                            <p className="text-xl font-black text-indigo-600">#142</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── Daily Missions Card ────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-1 relative overflow-hidden bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm group hover:shadow-xl hover:shadow-pink-100/40 transition-all duration-500"
            >
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-pink-50 rounded-full blur-[80px] group-hover:bg-pink-100/50 transition-all duration-700" />

                <div className="relative z-10 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shadow-inner group-hover:scale-110 transition-transform">
                                <Rocket size={24} />
                            </div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Missões Diárias</h3>
                        </div>
                        <div className="relative w-14 h-14 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                                <circle cx="20" cy="20" r="18" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                                <motion.circle
                                    cx="20" cy="20" r="18" fill="none" stroke="#e11d48" strokeWidth="4"
                                    strokeDasharray="113.1"
                                    initial={{ strokeDashoffset: 113.1 }}
                                    animate={{ strokeDashoffset: 113.1 * (1 - missionProgress / 100) }}
                                    transition={{ duration: 1.2, ease: "easeInOut" }}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="absolute text-[10px] font-black text-slate-900">{Math.round(missionProgress)}%</span>
                        </div>
                    </div>

                    <div className="space-y-3 flex-1">
                        {missions.slice(0, 3).map((m, i) => (
                            <motion.div
                                key={m.id}
                                whileHover={{ x: 5 }}
                                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${m.done
                                    ? 'bg-emerald-50 border-emerald-100 opacity-60'
                                    : 'bg-slate-50 border-transparent hover:border-slate-200 hover:bg-white'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${m.done ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300'
                                    }`}>
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[11px] font-black uppercase tracking-tight truncate ${m.done ? 'text-emerald-700 line-through' : 'text-slate-900'}`}>
                                        {m.title}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{m.description || 'Tarefa cognitiva'}</p>
                                </div>
                                <div className="text-[10px] font-black text-rose-600 shrink-0">
                                    +{m.xp_reward}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <button className="mt-6 w-full py-4 rounded-2xl bg-white border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-lg transition-all flex items-center justify-center gap-2 group/btn">
                        Histórico de Missões
                        <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
            </motion.div>

            {/* ── Achievements Card ──────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-1 relative overflow-hidden bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm group hover:shadow-xl hover:shadow-blue-100/40 transition-all duration-500"
            >
                <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-50 rounded-full blur-[60px] group-hover:bg-blue-100/50 transition-all duration-700" />

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner group-hover:scale-110 transition-transform">
                                <Target size={24} />
                            </div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Conquistas</h3>
                        </div>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            {achievements.filter(a => a.earned).length} / {achievements.length}
                        </span>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-8">
                        {achievements.slice(0, 8).map((a, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="relative flex flex-col items-center gap-2"
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-500 ${a.earned
                                    ? 'bg-white border-2 border-indigo-100 shadow-lg shadow-indigo-100/30'
                                    : 'bg-slate-50 border border-slate-100 grayscale opacity-20'
                                    }`}>
                                    {a.icon}
                                    {a.earned && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg border-2 border-white"
                                        >
                                            <Star size={10} className="text-white fill-white" />
                                        </motion.div>
                                    )}
                                </div>
                                <span className={`text-[8px] font-black uppercase text-center leading-tight tracking-widest ${a.earned ? 'text-slate-900' : 'text-slate-200'}`}>
                                    {a.label}
                                </span>
                            </motion.div>
                        ))}
                    </div>

                    <div className="p-6 rounded-[2rem] bg-indigo-50 border border-indigo-100 relative group">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm">
                                <Zap className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Próximo Desafio</p>
                                <p className="text-[10px] text-indigo-700/70 font-bold mt-1 leading-relaxed lowercase italic tracking-tight">Complete 5 chats com IA hoje para desbloquear "Comunicador de Elite".</p>
                                <div className="mt-4 h-1.5 bg-white/50 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-600 w-[60%]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
