'use client';

import { useState, useEffect } from 'react';
import {
    Zap, Brain, TrendingUp, Users, Target,
    Sparkles, ArrowUpRight, ArrowDownRight,
    Lightbulb, ShieldCheck, Loader2, Search
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';

export default function InsightsPage() {
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    const runAnalysis = () => {
        setAnalyzing(true);
        setTimeout(() => setAnalyzing(false), 2500);
    };

    if (loading) {
        return (
            <AppLayout title="Inteligência & Insights">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
                        <p className="text-gray-400 font-medium">Sincronizando modelos de IA...</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Inteligência & Insights">
            <div className="min-h-screen bg-black text-white p-4 sm:p-8 relative overflow-hidden">
                {/* Background Decorations */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] -z-10 translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px] -z-10 -translate-x-1/2 translate-y-1/2" />

                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-purple-500/30">
                                    AI Engine v2.0
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
                                Inteligência <span className="text-purple-500">&</span> Insights
                            </h1>
                            <p className="text-gray-400 mt-2 text-lg max-w-2xl">
                                Análise preditiva e recomendações estratégicas baseadas no comportamento organizacional e financeiro.
                            </p>
                        </div>
                        <button
                            onClick={runAnalysis}
                            disabled={analyzing}
                            className="relative group overflow-hidden bg-white border border-slate-200 border-black/5 shadow-sm text-black px-8 py-4 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                            <div className="relative z-10 flex items-center gap-2">
                                {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                {analyzing ? 'Analisando dados...' : 'Gerar Novos Insights'}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-10 transition-opacity" />
                        </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Sentimento Geral', value: '88%', trend: '+4%', icon: HeartIcon, color: 'text-pink-400', bg: 'bg-pink-500/10' },
                            { label: 'Produtividade', value: '94.2%', trend: '+2.1%', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                            { label: 'Risco de Churn (RH)', value: '2.4%', trend: '-15%', icon: ShieldCheck, color: 'text-green-400', bg: 'bg-green-500/10' },
                            { label: 'Eficiência Financeira', value: 'R$ 142k', trend: '+12%', icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl hover:border-white/20 transition-all group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                                        <stat.icon className="w-5 h-5" />
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${stat.trend.startsWith('+') ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                                        {stat.trend}
                                    </span>
                                </div>
                                <div className="text-3xl font-black mb-1 group-hover:scale-105 transition-transform origin-left">{stat.value}</div>
                                <div className="text-gray-500 text-xs font-medium uppercase tracking-wider">{stat.label}</div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Sentiment Analysis Card */}
                        <div className="lg:col-span-2 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Brain className="w-32 h-32" />
                            </div>

                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Brain className="w-5 h-5 text-purple-400" />
                                Análise de Clima e Engajamento
                            </h3>

                            <div className="space-y-6">
                                {[
                                    { label: 'Satisfação da Equipe', pct: 85, color: 'from-purple-500 to-indigo-500' },
                                    { label: 'Equilíbrio Vida/Trabalho', pct: 72, color: 'from-blue-500 to-cyan-500' },
                                    { label: 'Cálculo de Burnout (AI Risk)', pct: 18, color: 'from-orange-500 to-red-500' },
                                ].map((item, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-300 font-medium">{item.label}</span>
                                            <span className="font-mono font-bold">{item.pct}%</span>
                                        </div>
                                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-1000 ease-out`}
                                                style={{ width: `${item.pct}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-10 p-6 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-start gap-4">
                                <div className="bg-purple-500 p-2 rounded-lg">
                                    <Lightbulb className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-purple-200">Insight Prioritário:</p>
                                    <p className="text-xs text-purple-300/80 mt-1 leading-relaxed">
                                        Detectamos uma leve queda no engajamento matinal. Recomendamos revisar o horário de reuniões gerais para otimizar o fluxo criativo da equipe de desenvolvimento.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Recent AI Recommendations */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Target className="w-5 h-5 text-blue-400" />
                                Próximos Passos (AI)
                            </h3>

                            <div className="space-y-4">
                                {[
                                    { title: 'Otimizar Fluxo de Caixa', desc: 'Antecipação de recebíveis sugerida.', priority: 'high' },
                                    { title: 'Treinamento Soft Skills', desc: 'Foco em liderança para o time de RH.', priority: 'medium' },
                                    { title: 'Revisão de Infraestrutura', desc: 'Upgrading workers assíncronos.', priority: 'low' },
                                ].map((rec, i) => (
                                    <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/20 transition-all cursor-pointer group">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-sm group-hover:text-blue-400 transition-colors">{rec.title}</h4>
                                            <div className={`w-2 h-2 rounded-full ${rec.priority === 'high' ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]' : rec.priority === 'medium' ? 'bg-yellow-400' : 'bg-blue-400'}`} />
                                        </div>
                                        <p className="text-[11px] text-gray-500 leading-relaxed">{rec.desc}</p>
                                    </div>
                                ))}
                            </div>

                            <button className="w-full mt-6 py-4 border border-white/10 rounded-2xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                                Ver Relatório Completo
                            </button>
                        </div>
                    </div>

                    {/* Performance Trends Section */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-white">Tendências de Performance</h3>
                                <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">Projeção trimestral 2026</p>
                            </div>
                            <div className="flex gap-2">
                                {['7D', '1M', '3M', '1Y'].map(t => (
                                    <button key={t} className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${t === '1M' ? 'bg-white border border-slate-200 border-black/5 shadow-sm text-black' : 'text-white/40 hover:text-white'}`}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-[200px] flex items-end gap-2 md:gap-4">
                            {[45, 60, 55, 80, 70, 90, 85, 95, 100, 92, 110, 115].map((val, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div
                                        className="w-full bg-gradient-to-t from-purple-600/20 to-purple-500 rounded-t-lg transition-all duration-1000 group-hover:from-purple-500 group-hover:to-purple-300 relative"
                                        style={{ height: `${val}%` }}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white border border-slate-200 border-black/5 shadow-sm text-black text-[9px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            {val}
                                        </div>
                                    </div>
                                    <span className="text-[8px] text-white/20 font-bold hidden md:block">SEM {i + 1}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function HeartIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
    );
}
