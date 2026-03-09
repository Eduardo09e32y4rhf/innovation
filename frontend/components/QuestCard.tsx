'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Zap, Shield, Trophy } from 'lucide-react';

interface QuestCardProps {
    title: string;
    description: string;
    reward_xp: number;
    progress: number;
    type: 'attack' | 'defense' | 'magic';
}

const typeConfig = {
    attack: {
        icon: Sword,
        color: 'from-rose-500 to-orange-500',
        glow: 'shadow-rose-500/20',
        bg: 'bg-rose-500/10',
    },
    defense: {
        icon: Shield,
        color: 'from-emerald-500 to-teal-500',
        glow: 'shadow-emerald-500/20',
        bg: 'bg-emerald-500/10',
    },
    magic: {
        icon: Zap,
        color: 'from-violet-500 to-indigo-500',
        glow: 'shadow-blue-500/20',
        bg: 'bg-blue-500/10',
    }
};

export default function QuestCard({ title, description, reward_xp, progress, type }: QuestCardProps) {
    const config = typeConfig[type];
    const Icon = config.icon;

    const [isCollecting, setIsCollecting] = React.useState(false);
    const [particles, setParticles] = React.useState<{ id: number; x: number; y: number }[]>([]);

    const handleCollect = () => {
        if (progress < 100 || isCollecting) return;

        setIsCollecting(true);
        // Gerar partículas explosivas
        const newParticles = Array.from({ length: 12 }).map((_, i) => ({
            id: Date.now() + i,
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 200,
        }));
        setParticles(newParticles);

        // Resetar após animação
        setTimeout(() => {
            setIsCollecting(false);
            setParticles([]);
        }, 1000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5 }}
            className="group relative overflow-hidden bg-white/[0.03] border border-white/10 rounded-3xl p-5 backdrop-blur-xl transition-all duration-500 hover:border-white/20"
        >
            {/* Visual Effects */}
            <div className={`absolute -top-12 -right-12 w-32 h-32 ${config.bg} rounded-full blur-[60px] group-hover:blur-[80px] transition-all duration-700`} />

            <div className="relative z-10 space-y-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg ${config.glow}`}>
                            <Icon className="w-5 h-5 text-slate-900" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 tracking-wide">{title}</h3>
                            <p className="text-[10px] text-slate-900/40 uppercase font-black tracking-widest">{type} Quest</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-1 rounded-lg">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] font-black text-amber-400">+{reward_xp} XP</span>
                    </div>
                </div>

                <p className="text-xs text-slate-900/60 leading-relaxed min-h-[40px]">
                    {description}
                </p>

                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold text-slate-900/30 uppercase tracking-tighter">Progresso</span>
                        <span className="text-[10px] font-black text-slate-900">{progress}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className={`h-full rounded-full bg-gradient-to-r ${config.color}`}
                        />
                    </div>
                </div>

                <div className="relative">
                    <AnimatePresence>
                        {particles.map((p) => (
                            <motion.div
                                key={p.id}
                                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                animate={{ x: p.x, y: p.y, opacity: 0, scale: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className={`absolute left-1/2 top-1/2 w-2 h-2 rounded-full bg-gradient-to-r ${config.color} z-20 shadow-lg`}
                            />
                        ))}
                    </AnimatePresence>

                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCollect}
                        disabled={progress < 100 || isCollecting}
                        className={`w-full py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${progress >= 100
                            ? `bg-gradient-to-r ${config.color} text-slate-900 shadow-lg ${config.glow}`
                            : 'bg-white/5 text-slate-900/20 border border-white/5 cursor-not-allowed'
                            } ${isCollecting ? 'opacity-50' : ''}`}
                    >
                        {isCollecting ? 'Coletando...' : progress >= 100 ? 'Coletar Recompensa' : 'Em andamento'}
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}
