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
                className="lg:col-span-1 relative overflow-hidden bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-xl group hover:border-[#8b5cf6]/40 transition-all duration-500"
            >
                {/* Visual Glows */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#8b5cf6]/20 rounded-full blur-[80px] group-hover:bg-[#8b5cf6]/30 transition-all duration-700" />

                <div className="relative z-10 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center shadow-lg shadow-[#8b5cf6]/40">
                                <Trophy className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest">Nível Atual</h3>
                                <p className="text-3xl font-black text-white">Lvl {user.level}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-1.5 justify-end text-orange-400 font-black">
                                <Flame className="w-4 h-4 fill-orange-400" />
                                <span>7 Dias</span>
                            </div>
                            <p className="text-[10px] text-white/30 uppercase font-bold">Streak Ativa</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <span className="text-xs font-bold text-white/80">Progresso do Nível</span>
                            <span className="text-[10px] text-[#a78bfa] font-black">{user.xp_in_level} / {user.next_level_xp} XP</span>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${xpPercentage}%` }}
                                transition={{ duration: 1.5, ease: "circOut" }}
                                className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] via-[#a78bfa] to-[#c4b5fd] shadow-[0_0_15px_rgba(139,92,246,0.5)]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-3 text-center">
                            <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Total XP</p>
                            <p className="text-lg font-black text-white">{user.points.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-3 text-center">
                            <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Rank Global</p>
                            <p className="text-lg font-black text-[#a78bfa]">#142</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── Daily Missions Card ────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-1 relative overflow-hidden bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-xl group hover:border-[#ec4899]/40 transition-all duration-500"
            >
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#ec4899]/10 rounded-full blur-[80px] group-hover:bg-[#ec4899]/20 transition-all duration-700" />

                <div className="relative z-10 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
                                <Rocket className="w-5 h-5 text-pink-400" />
                            </div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Missões Diárias</h3>
                        </div>
                        <div className="relative w-12 h-12 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                                <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                                <motion.circle
                                    cx="20" cy="20" r="18" fill="none" stroke="#ec4899" strokeWidth="3"
                                    strokeDasharray="113.1"
                                    initial={{ strokeDashoffset: 113.1 }}
                                    animate={{ strokeDashoffset: 113.1 * (1 - missionProgress / 100) }}
                                    transition={{ duration: 1.2, ease: "easeInOut" }}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="absolute text-[10px] font-black text-white">{Math.round(missionProgress)}%</span>
                        </div>
                    </div>

                    <div className="space-y-2.5 flex-1">
                        {missions.map((m, i) => (
                            <motion.div
                                key={m.id}
                                whileHover={{ x: 5 }}
                                className={`group/item flex items-center gap-3 p-2.5 rounded-2xl border transition-all ${m.done
                                        ? 'bg-green-500/5 border-green-500/20 opacity-60'
                                        : 'bg-white/5 border-white/5 hover:border-white/20'
                                    }`}
                            >
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${m.done ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/20'
                                    }`}>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-bold truncate ${m.done ? 'text-green-400/80 line-through' : 'text-white/80'}`}>
                                        {m.title}
                                    </p>
                                    <p className="text-[9px] text-white/30 truncate">{m.description || 'Complete esta tarefa para ganhar XP'}</p>
                                </div>
                                <div className="text-[10px] font-black text-pink-400 shrink-0">
                                    +{m.xp_reward} XP
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <button className="mt-4 w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-white/60 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 group/btn">
                        Ver histórico de missões
                        <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
            </motion.div>

            {/* ── Achievements Card ──────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-1 relative overflow-hidden bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-xl group hover:border-[#3b82f6]/40 transition-all duration-500"
            >
                <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#3b82f6]/10 rounded-full blur-[60px] group-hover:bg-[#3b82f6]/20 transition-all duration-700" />

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <Target className="w-5 h-5 text-blue-400" />
                            </div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Conquistas</h3>
                        </div>
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-tighter">
                            {achievements.filter(a => a.earned).length} / {achievements.length} desbloqueadas
                        </span>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <AnimatePresence>
                            {achievements.map((a, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    className="relative flex flex-col items-center gap-2"
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-500 ${a.earned
                                            ? 'bg-gradient-to-br from-white/10 to-white/5 border border-white/20 shadow-lg shadow-black/20 grayscale-0'
                                            : 'bg-white/[0.02] border border-white/5 grayscale opacity-20'
                                        }`}>
                                        {a.icon}
                                        {a.earned && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shadow-lg"
                                            >
                                                <Star className="w-2.5 h-2.5 text-white fill-white" />
                                            </motion.div>
                                        )}
                                    </div>
                                    <span className={`text-[9px] font-bold text-center leading-tight ${a.earned ? 'text-white/60' : 'text-white/10'}`}>
                                        {a.label}
                                    </span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    <div className="mt-8 p-4 rounded-2xl bg-gradient-to-br from-[#3b82f6]/20 to-transparent border border-blue-500/20">
                        <div className="flex items-start gap-3">
                            <Zap className="w-5 h-5 text-blue-400 shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-white">Próximo Desafio</p>
                                <p className="text-[10px] text-white/50 mt-0.5">Complete 5 chats com IA hoje para ganhar a medalha "Comunicador de Elite".</p>
                                <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-[60%]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
