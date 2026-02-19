'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Star, Users, TrendingUp, Target, Clock, Plus, CheckCircle, ChevronRight, Award } from 'lucide-react';
import api from '../../services/api';

export default function RHAdvancedPage() {
    const [reviews, setReviews] = useState<any>(null);
    const [pdiGoals, setPdiGoals] = useState<any[]>([]);
    const [timeBalance, setTimeBalance] = useState<any>(null);
    const [payslips, setPayslips] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'360' | 'pdi' | 'timebank' | 'payslips'>('360');
    const [loading, setLoading] = useState(true);

    // Forms
    const [reviewForm, setReviewForm] = useState({ subject_user_id: '', relationship: 'peer', score: 8, feedback: '', period: 'Q1-2026', skills: {} });
    const [pdiForm, setPdiForm] = useState({ title: '', description: '', quarter: 'Q1-2026' });
    const [timeBankForm, setTimeBankForm] = useState({ type: 'credit', hours: 0, reason: '' });
    const [showForm, setShowForm] = useState(false);

    const loadData = async () => {
        try {
            const [pdi, time, slips] = await Promise.all([
                api.get('/api/rh/v2/pdi').then(r => r.data).catch(() => []),
                api.get('/api/rh/v2/time-bank/balance').then(r => r.data).catch(() => null),
                api.get('/api/rh/v2/payslips/me').then(r => r.data).catch(() => []),
            ]);
            setPdiGoals(Array.isArray(pdi) ? pdi : []);
            setTimeBalance(time);
            setPayslips(Array.isArray(slips) ? slips : []);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    const submitReview = async () => {
        if (!reviewForm.subject_user_id) return;
        await api.post('/api/rh/v2/reviews-360', { ...reviewForm, subject_user_id: Number(reviewForm.subject_user_id) });
        setShowForm(false);
        setReviewForm({ subject_user_id: '', relationship: 'peer', score: 8, feedback: '', period: 'Q1-2026', skills: {} });
    };

    const createPDI = async () => {
        if (!pdiForm.title) return;
        await api.post('/api/rh/v2/pdi', pdiForm);
        setPdiForm({ title: '', description: '', quarter: 'Q1-2026' });
        setShowForm(false);
        loadData();
    };

    const addTimeBank = async () => {
        await api.post('/api/rh/v2/time-bank', timeBankForm);
        setTimeBankForm({ type: 'credit', hours: 0, reason: '' });
        setShowForm(false);
        loadData();
    };

    const updateProgress = async (goalId: number, progress: number) => {
        await api.patch(`/api/rh/v2/pdi/${goalId}/progress?progress=${progress}`);
        loadData();
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white flex">
            <Sidebar />
            <main className="ml-[280px] flex-1 p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold gradient-text">RH Avançado</h1>
                    <p className="text-gray-400 mt-1">Avaliação 360°, PDI, Banco de Horas e Holerites</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {(['360', 'pdi', 'timebank', 'payslips'] as const).map(tab => (
                        <button key={tab} onClick={() => { setActiveTab(tab); setShowForm(false); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab ? 'bg-purple-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'}`}>
                            {tab === '360' ? '🔄 Avaliação 360°' : tab === 'pdi' ? '🎯 PDI' : tab === 'timebank' ? '⏱ Banco de Horas' : '💰 Holerites'}
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

                {/* TIME BANK */}
                {activeTab === 'timebank' && (
                    <div>
                        {timeBalance && (
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 text-center">
                                    <p className="text-green-400 text-sm mb-1">Créditos</p>
                                    <p className="text-3xl font-black text-green-400">{timeBalance.total_credit_hours}h</p>
                                </div>
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center">
                                    <p className="text-red-400 text-sm mb-1">Débitos</p>
                                    <p className="text-3xl font-black text-red-400">{timeBalance.total_debit_hours}h</p>
                                </div>
                                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-5 text-center">
                                    <p className="text-purple-300 text-sm mb-1">Saldo</p>
                                    <p className={`text-3xl font-black ${timeBalance.balance_hours >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                                        {timeBalance.balance_hours >= 0 ? '+' : ''}{timeBalance.balance_hours}h
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between mb-4">
                            <div />
                            <button onClick={() => setShowForm(!showForm)}
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-purple-700 transition">
                                <Plus className="w-4 h-4" /> Lançar Horas
                            </button>
                        </div>
                        {showForm && (
                            <div className="bg-gray-900 border border-purple-500/30 rounded-xl p-5 mb-4">
                                <div className="grid grid-cols-3 gap-3">
                                    <select value={timeBankForm.type} onChange={e => setTimeBankForm(p => ({ ...p, type: e.target.value }))}
                                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
                                        <option value="credit">Crédito (+)</option>
                                        <option value="debit">Débito (-)</option>
                                    </select>
                                    <input type="number" value={timeBankForm.hours} onChange={e => setTimeBankForm(p => ({ ...p, hours: Number(e.target.value) }))}
                                        placeholder="Horas"
                                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                                    <input value={timeBankForm.reason} onChange={e => setTimeBankForm(p => ({ ...p, reason: e.target.value }))}
                                        placeholder="Motivo"
                                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                                </div>
                                <button onClick={addTimeBank} className="mt-3 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition">
                                    Lançar
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* PAYSLIPS */}
                {activeTab === 'payslips' && (
                    <div>
                        <div className="space-y-3">
                            {payslips.map(slip => (
                                <div key={slip.id} className="bg-gray-900 border border-purple-500/20 rounded-xl p-5 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-white">{slip.reference_month}</h3>
                                        <p className="text-gray-400 text-sm">
                                            Bruto: <span className="text-white">R$ {Number(slip.gross_salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            {' • '} Líquido: <span className="text-green-400">R$ {Number(slip.net_salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </p>
                                    </div>
                                    {slip.file_url && (
                                        <a href={slip.file_url} target="_blank" rel="noreferrer"
                                            className="bg-purple-600/20 text-purple-300 border border-purple-500/30 px-4 py-2 rounded-lg text-sm hover:bg-purple-600/30 transition">
                                            Baixar PDF
                                        </a>
                                    )}
                                </div>
                            ))}
                            {payslips.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p>Nenhum holerite disponível</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
