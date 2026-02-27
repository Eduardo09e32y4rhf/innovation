'use client';

import { useState, useEffect } from 'react';
import { Plus, Users, CheckCircle, Target, Award, Trophy, Medal, TrendingUp, Heart } from 'lucide-react';
import api from '../../../services/api';
import AppLayout from '../../../components/AppLayout';

// ─── BADGES CONFIG ────────────────────────────────────────────────────────────
const BADGES = [
    { id: 'pioneer', name: 'Pioneiro', desc: 'Primeiro a completar o onboarding', icon: '🚀', color: 'from-blue-500 to-cyan-500', earned: true },
    { id: 'top_recruiter', name: 'Top Recruta', desc: 'Indicou 5+ candidatos contratados', icon: '🎯', color: 'from-purple-500 to-pink-500', earned: true },
    { id: 'team_player', name: 'Team Player', desc: 'Avaliação 360° acima de 8.5', icon: '🤝', color: 'from-green-500 to-emerald-500', earned: true },
    { id: 'pdi_master', name: 'PDI Master', desc: 'Completou 100% das metas do trimestre', icon: '🏆', color: 'from-yellow-500 to-orange-500', earned: false },
    { id: 'mentor', name: 'Mentor', desc: 'Realizou 10+ mentorias registradas', icon: '🧠', color: 'from-indigo-500 to-purple-500', earned: false },
    { id: 'early_bird', name: 'Pontualidade', desc: '30 dias seguidos sem atraso', icon: '⏰', color: 'from-teal-500 to-green-500', earned: true },
    { id: 'innovator', name: 'Inovador', desc: 'Sugeriu melhoria implementada', icon: '💡', color: 'from-pink-500 to-rose-500', earned: false },
    { id: 'five_star', name: '5 Estrelas', desc: 'CSAT perfeito em 3 atendimentos', icon: '⭐', color: 'from-amber-400 to-yellow-500', earned: true },
];

const RANKING = [
    { name: 'Ana Silva', points: 1250, badges: 7, avatar: 'AS' },
    { name: 'Carlos Santos', points: 980, badges: 5, avatar: 'CS' },
    { name: 'Maria Oliveira', points: 870, badges: 6, avatar: 'MO' },
    { name: 'João Pereira', points: 720, badges: 4, avatar: 'JP' },
    { name: 'Você', points: 650, badges: 5, avatar: 'EU' },
];

const MOODS = [
    { emoji: '😄', label: 'Ótimo', value: 5, color: 'text-green-400 border-green-500/30 hover:bg-green-500/10' },
    { emoji: '🙂', label: 'Bem', value: 4, color: 'text-blue-400 border-blue-500/30 hover:bg-blue-500/10' },
    { emoji: '😐', label: 'Normal', value: 3, color: 'text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10' },
    { emoji: '😕', label: 'Ruim', value: 2, color: 'text-orange-400 border-orange-500/30 hover:bg-orange-500/10' },
    { emoji: '😢', label: 'Péssimo', value: 1, color: 'text-red-400 border-red-500/30 hover:bg-red-500/10' },
];

export default function RHAdvancedPage() {
    const [pdiGoals, setPdiGoals] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'360' | 'pdi' | 'gamification' | 'pulse'>('360');
    const [loading, setLoading] = useState(true);

    // Forms
    const [reviewForm, setReviewForm] = useState({ subject_user_id: '', relationship: 'peer', score: 8, feedback: '', period: 'Q1-2026', skills: {} });
    const [pdiForm, setPdiForm] = useState({ title: '', description: '', quarter: 'Q1-2026' });
    const [showForm, setShowForm] = useState(false);

    // Pulse
    const [selectedMood, setSelectedMood] = useState<number | null>(null);
    const [pulseComment, setPulseComment] = useState('');
    const [pulseSent, setPulseSent] = useState(false);

    const loadData = async () => {
        try {
            const [pdi] = await Promise.all([
                api.get('/rh/pdi').then(r => r.data).catch(() => []),
            ]);
            setPdiGoals(Array.isArray(pdi) ? pdi : []);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    const submitReview = async () => {
        if (!reviewForm.subject_user_id) return;
        await api.post('/rh/performance-reviews', { ...reviewForm, employee_id: Number(reviewForm.subject_user_id) });
        setShowForm(false);
        setReviewForm({ subject_user_id: '', relationship: 'peer', score: 8, feedback: '', period: 'Q1-2026', skills: {} });
    };

    const createPDI = async () => {
        if (!pdiForm.title) return;
        // Mock PDI creation for now as endpoint might differ
        // await api.post('/rh/pdi', pdiForm);
        setPdiGoals(prev => [...prev, { id: Date.now(), ...pdiForm, progress: 0 }]);
        setPdiForm({ title: '', description: '', quarter: 'Q1-2026' });
        setShowForm(false);
    };

    const updateProgress = async (goalId: number, progress: number) => {
        // await api.patch(`/rh/pdi/${goalId}/progress?progress=${progress}`);
        setPdiGoals(prev => prev.map(g => g.id === goalId ? { ...g, progress } : g));
    };

    const submitPulse = () => {
        if (selectedMood === null) return;
        // In a real app, this would POST to the backend
        api.post('/rh/pulse', { score: selectedMood, comment: pulseComment }).catch(() => {});
        setPulseSent(true);
        setTimeout(() => {
            setPulseSent(false);
            setSelectedMood(null);
            setPulseComment('');
        }, 3000);
    };

    const TABS = [
        { key: '360' as const, label: '🔄 Avaliação 360°' },
        { key: 'pdi' as const, label: '🎯 PDI' },
        { key: 'gamification' as const, label: '🏆 Conquistas' },
        { key: 'pulse' as const, label: '💗 Pulso' },
    ];

    return (
        <AppLayout title="RH Avançado">
            <div className="p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">RH Avançado</h1>
                    <p className="text-gray-400 mt-1">Avaliação 360°, PDI, Gamificação e Pesquisa de Pulso</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    {TABS.map(tab => (
                        <button key={tab.key} onClick={() => { setActiveTab(tab.key); setShowForm(false); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.key ? 'bg-purple-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* 360° REVIEWS */}
                {activeTab === '360' && (
                    <div>
                        <div className="flex justify-between mb-4">
                            <div />
                            <button onClick={() => setShowForm(!showForm)}
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-purple-700 transition">
                                <Plus className="w-4 h-4" /> Nova Avaliação
                            </button>
                        </div>
                        {showForm && (
                            <div className="bg-gray-900 border border-purple-500/30 rounded-xl p-5 mb-6">
                                <h3 className="font-semibold mb-4 text-white">Avaliar Colaborador</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <input value={reviewForm.subject_user_id} onChange={e => setReviewForm(p => ({ ...p, subject_user_id: e.target.value }))}
                                        placeholder="ID do colaborador avaliado"
                                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                                    <select value={reviewForm.relationship} onChange={e => setReviewForm(p => ({ ...p, relationship: e.target.value }))}
                                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
                                        <option value="peer">Par</option>
                                        <option value="manager">Gestor</option>
                                        <option value="subordinate">Subordinado</option>
                                    </select>
                                    <div className="col-span-2">
                                        <label className="text-gray-400 text-xs mb-1 block">Nota: {reviewForm.score}/10</label>
                                        <input type="range" min={1} max={10} value={reviewForm.score}
                                            onChange={e => setReviewForm(p => ({ ...p, score: Number(e.target.value) }))}
                                            className="w-full accent-purple-500" />
                                    </div>
                                    <textarea value={reviewForm.feedback} onChange={e => setReviewForm(p => ({ ...p, feedback: e.target.value }))}
                                        placeholder="Feedback (pontos fortes e melhorias)"
                                        rows={3}
                                        className="col-span-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                                </div>
                                <button onClick={submitReview} className="mt-3 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition">
                                    Enviar Avaliação
                                </button>
                            </div>
                        )}
                        <div className="bg-gray-900 border border-purple-500/20 rounded-xl p-8 text-center">
                            <Users className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                            <p className="text-gray-400">Cycle Q1-2026 aguardando avaliações</p>
                            <p className="text-gray-600 text-sm mt-1">Avalie um ID de colaborador acima para ver os resultados</p>
                        </div>
                    </div>
                )}

                {/* PDI */}
                {activeTab === 'pdi' && (
                    <div>
                        <div className="flex justify-between mb-4">
                            <div />
                            <button onClick={() => setShowForm(!showForm)}
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-purple-700 transition">
                                <Plus className="w-4 h-4" /> Nova Meta
                            </button>
                        </div>
                        {showForm && (
                            <div className="bg-gray-900 border border-purple-500/30 rounded-xl p-5 mb-6">
                                <h3 className="font-semibold mb-4 text-white">Nova Meta PDI</h3>
                                <div className="space-y-3">
                                    <input value={pdiForm.title} onChange={e => setPdiForm(p => ({ ...p, title: e.target.value }))}
                                        placeholder="Título da meta (ex: Aprender Python avançado)"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                                    <input value={pdiForm.description} onChange={e => setPdiForm(p => ({ ...p, description: e.target.value }))}
                                        placeholder="Descrição e como medir o progresso"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                                    <select value={pdiForm.quarter} onChange={e => setPdiForm(p => ({ ...p, quarter: e.target.value }))}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
                                        <option>Q1-2026</option><option>Q2-2026</option><option>Q3-2026</option><option>Q4-2026</option>
                                    </select>
                                </div>
                                <button onClick={createPDI} className="mt-3 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition">
                                    Criar Meta
                                </button>
                            </div>
                        )}
                        <div className="space-y-4">
                            {pdiGoals.map(goal => (
                                <div key={goal.id} className="bg-gray-900 border border-purple-500/20 rounded-xl p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-white">{goal.title}</h3>
                                            <p className="text-gray-400 text-sm">{goal.description}</p>
                                            <span className="text-xs text-purple-400 mt-1 block">{goal.quarter}</span>
                                        </div>
                                        {goal.completed && <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 bg-gray-800 rounded-full h-3">
                                            <div className={`h-3 rounded-full transition-all ${goal.completed ? 'bg-green-500' : 'bg-purple-500'}`}
                                                style={{ width: `${goal.progress || 0}%` }} />
                                        </div>
                                        <span className="text-white text-sm font-bold w-10">{goal.progress || 0}%</span>
                                        <input type="range" min={0} max={100} value={goal.progress || 0}
                                            onChange={e => updateProgress(goal.id, Number(e.target.value))}
                                            className="w-24 accent-purple-500" />
                                    </div>
                                </div>
                            ))}
                            {pdiGoals.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p>Nenhuma meta criada ainda</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* GAMIFICATION */}
                {activeTab === 'gamification' && (
                    <div className="space-y-6">
                        {/* Points Summary */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-5 text-center">
                                <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                                <p className="text-3xl font-black text-yellow-400">650</p>
                                <p className="text-xs text-gray-500 mt-1">Pontos Totais</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-5 text-center">
                                <Medal className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                                <p className="text-3xl font-black text-purple-400">{BADGES.filter(b => b.earned).length}/{BADGES.length}</p>
                                <p className="text-xs text-gray-500 mt-1">Badges Conquistados</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-5 text-center">
                                <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                                <p className="text-3xl font-black text-blue-400">#5</p>
                                <p className="text-xs text-gray-500 mt-1">Ranking na Empresa</p>
                            </div>
                        </div>

                        {/* Badges Grid */}
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4">Suas Conquistas</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {BADGES.map(badge => (
                                    <div key={badge.id}
                                        className={`relative rounded-xl p-4 text-center border transition-all duration-300
                                            ${badge.earned
                                                ? `bg-gradient-to-br ${badge.color}/10 border-gray-700 hover:scale-105`
                                                : 'bg-gray-900/50 border-gray-800 opacity-40 grayscale'}`}
                                    >
                                        <span className="text-4xl block mb-2">{badge.icon}</span>
                                        <h4 className="text-sm font-bold text-white">{badge.name}</h4>
                                        <p className="text-[10px] text-gray-500 mt-1">{badge.desc}</p>
                                        {badge.earned && (
                                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                                <CheckCircle className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                        {!badge.earned && (
                                            <span className="text-[9px] text-gray-600 mt-2 block uppercase tracking-wider">Bloqueado</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Ranking */}
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4">Ranking da Empresa</h3>
                            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                                {RANKING.map((person, i) => (
                                    <div key={i} className={`flex items-center gap-4 p-4 border-b border-gray-800/50 last:border-b-0
                                        ${person.name === 'Você' ? 'bg-purple-500/10' : ''}`}>
                                        <span className={`text-lg font-black w-8 ${i < 3 ? 'text-yellow-400' : 'text-gray-600'}`}>
                                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                        </span>
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
                                            {person.avatar}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-medium ${person.name === 'Você' ? 'text-purple-300' : 'text-white'}`}>{person.name}</p>
                                            <p className="text-xs text-gray-500">{person.badges} badges</p>
                                        </div>
                                        <span className="text-sm font-bold text-purple-400">{person.points} pts</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* PULSE SURVEY */}
                {activeTab === 'pulse' && (
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-gray-900 border border-purple-500/20 rounded-2xl p-8 text-center">
                            <Heart className="w-12 h-12 text-pink-400 mx-auto mb-4 animate-pulse" />
                            <h3 className="text-xl font-bold text-white mb-2">Como você está se sentindo hoje?</h3>
                            <p className="text-gray-500 text-sm mb-8">Sua resposta é anônima e nos ajuda a melhorar o ambiente de trabalho.</p>

                            {pulseSent ? (
                                <div className="py-8">
                                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8 text-green-400" />
                                    </div>
                                    <p className="text-green-400 font-bold text-lg">Obrigado pelo seu feedback!</p>
                                    <p className="text-gray-500 text-sm mt-1">Contribuição registrada com sucesso.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-center gap-4 mb-8">
                                        {MOODS.map(mood => (
                                            <button
                                                key={mood.value}
                                                onClick={() => setSelectedMood(mood.value)}
                                                className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-200 ${mood.color}
                                                    ${selectedMood === mood.value ? 'scale-110 ring-2 ring-purple-500 bg-gray-800' : 'bg-gray-800/50'}`}
                                            >
                                                <span className="text-2xl">{mood.emoji}</span>
                                                <span className="text-[9px] mt-0.5 text-gray-400">{mood.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <textarea
                                        value={pulseComment}
                                        onChange={e => setPulseComment(e.target.value)}
                                        placeholder="Quer deixar um comentário? (opcional)"
                                        rows={3}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600 mb-4"
                                    />

                                    <button
                                        onClick={submitPulse}
                                        disabled={selectedMood === null}
                                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-xl font-medium text-sm hover:opacity-90 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        Enviar meu Pulso
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
