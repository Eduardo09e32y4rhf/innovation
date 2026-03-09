'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Users, FileText, Clock, Star, Award, Loader2, Plus,
    ChevronRight, HeartHandshake, CheckCircle, AlertCircle, X
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';

interface PDIGoal {
    id: number;
    title: string;
    description?: string;
    quarter: string;
    progress: number;
    completed: boolean;
}

interface LeaveRequest {
    id: number;
    start_date: string;
    end_date: string;
    reason: string;
    status: string;
}

interface Review360 {
    id: number;
    score: number;
    feedback?: string;
    relationship: string;
    period: string;
}

interface Payslip {
    id: number;
    reference_month: string;
    gross_salary: number;
    net_salary: number;
    deductions: number;
}

type Tab = 'pdi' | 'licencas' | 'reviews' | 'holerites';

export default function RhDashboardPage() {
    const [activeTab, setActiveTab] = useState<Tab>('pdi');
    const [pdiGoals, setPdiGoals] = useState<PDIGoal[]>([]);
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [reviews, setReviews] = useState<Review360[]>([]);
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    // New PDI Form
    const [showPdiForm, setShowPdiForm] = useState(false);
    const [pdiForm, setPdiForm] = useState({ title: '', description: '', quarter: 'Q1-2026' });

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const apiFetch = async (path: string, options?: RequestInit) => {
        const token = getToken();
        if (!token) { window.location.href = '/login'; throw new Error('No token'); }
        const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${BASE}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...((options?.headers as Record<string, string>) ?? {}),
            },
        });
        if (res.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized'); }
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
    };

    const showNotif = (type: 'success' | 'error', msg: string) => {
        setNotification({ type, msg });
        setTimeout(() => setNotification(null), 4000);
    };

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [pdi, lv, py] = await Promise.allSettled([
                apiFetch('/api/rh/v2/pdi'),
                apiFetch('/api/rh/leave-requests'),
                apiFetch('/api/rh/v2/payslips/me'),
            ]);
            if (pdi.status === 'fulfilled') setPdiGoals(pdi.value);
            if (lv.status === 'fulfilled') setLeaves(lv.value);
            if (py.status === 'fulfilled') setPayslips(py.value);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    const handleCreatePDI = async () => {
        if (!pdiForm.title.trim()) return;
        try {
            const newGoal = await apiFetch('/api/rh/v2/pdi', {
                method: 'POST',
                body: JSON.stringify(pdiForm),
            });
            setPdiGoals(prev => [...prev, newGoal]);
            setShowPdiForm(false);
            setPdiForm({ title: '', description: '', quarter: 'Q1-2026' });
            showNotif('success', 'Meta PDI criada com sucesso!');
        } catch {
            showNotif('error', 'Erro ao criar meta PDI');
        }
    };

    const handleUpdateProgress = async (goalId: number, progress: number) => {
        try {
            const updated = await apiFetch(`/api/rh/v2/pdi/${goalId}/progress?progress=${progress}`, { method: 'PATCH' });
            setPdiGoals(prev => prev.map(g => g.id === goalId ? updated : g));
            showNotif('success', 'Progresso atualizado!');
        } catch {
            showNotif('error', 'Erro ao atualizar progresso');
        }
    };

    const statusColor: Record<string, string> = {
        pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
        approved: 'text-green-400 bg-green-500/10 border-green-500/30',
        rejected: 'text-red-400 bg-red-500/10 border-red-500/30',
    };

    const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
        { id: 'pdi', label: 'Meu PDI', icon: Award },
        { id: 'licencas', label: 'Licenças', icon: FileText },
        { id: 'reviews', label: 'Avaliações 360°', icon: Star },
        { id: 'holerites', label: 'Holerites', icon: Clock },
    ];

    return (
        <AppLayout title="Painel de RH">
            <div className="min-h-screen bg-gray-950 text-slate-900 p-6">
                {/* Notification */}
                {notification && (
                    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl ${notification.type === 'success'
                        ? 'bg-green-500/20 border border-green-500/40 text-green-300'
                        : 'bg-red-500/20 border border-red-500/40 text-red-300'
                        }`}>
                        {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {notification.msg}
                    </div>
                )}

                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <HeartHandshake className="w-8 h-8 text-blue-600" />
                            <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                Painel de RH
                            </h1>
                        </div>
                        <p className="text-gray-400">Acompanhe seu desenvolvimento, licenças e documentos</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 bg-white border border-gray-800 rounded-xl p-1 mb-6">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : (
                        <>
                            {/* PDI Tab */}
                            {activeTab === 'pdi' && (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="font-bold text-gray-200">Plano de Desenvolvimento Individual</h2>
                                        <button
                                            onClick={() => setShowPdiForm(!showPdiForm)}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-medium transition"
                                        >
                                            <Plus className="w-4 h-4" /> Nova Meta
                                        </button>
                                    </div>

                                    {/* PDI Form */}
                                    {showPdiForm && (
                                        <div className="bg-white/60 border border-blue-500/30 rounded-xl p-5 mb-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-medium text-gray-200">Nova Meta PDI</h3>
                                                <button onClick={() => setShowPdiForm(false)} className="text-gray-500 hover:text-gray-300">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    placeholder="Título da meta"
                                                    value={pdiForm.title}
                                                    onChange={e => setPdiForm(p => ({ ...p, title: e.target.value }))}
                                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Descrição (opcional)"
                                                    value={pdiForm.description}
                                                    onChange={e => setPdiForm(p => ({ ...p, description: e.target.value }))}
                                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                                />
                                                <select
                                                    value={pdiForm.quarter}
                                                    onChange={e => setPdiForm(p => ({ ...p, quarter: e.target.value }))}
                                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500"
                                                >
                                                    {['Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026'].map(q => (
                                                        <option key={q} value={q}>{q}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={handleCreatePDI}
                                                    className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition"
                                                >
                                                    Criar Meta
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {pdiGoals.length === 0 ? (
                                            <p className="text-center text-gray-500 py-8">Nenhuma meta PDI criada. Clique em &quot;Nova Meta&quot;!</p>
                                        ) : pdiGoals.map(goal => (
                                            <div key={goal.id} className="bg-white/60 border border-gray-800 rounded-xl p-5">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <h4 className="font-medium text-gray-200">{goal.title}</h4>
                                                        {goal.description && <p className="text-sm text-gray-500 mt-0.5">{goal.description}</p>}
                                                        <span className="text-xs text-blue-600 mt-1 inline-block">{goal.quarter}</span>
                                                    </div>
                                                    {goal.completed && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />}
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs text-gray-500">
                                                        <span>Progresso</span>
                                                        <span>{goal.progress.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="bg-gray-800 rounded-full h-2">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                                                            style={{ width: `${goal.progress}%` }}
                                                        />
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={0} max={100} step={5}
                                                        defaultValue={goal.progress}
                                                        onMouseUp={e => handleUpdateProgress(goal.id, Number((e.target as HTMLInputElement).value))}
                                                        className="w-full accent-purple-500 mt-1"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Licenças Tab */}
                            {activeTab === 'licencas' && (
                                <div className="space-y-3">
                                    <h2 className="font-bold text-gray-200 mb-4">Minhas Solicitações de Licença</h2>
                                    {leaves.length === 0 ? (
                                        <p className="text-center text-gray-500 py-8">Nenhuma solicitação de licença encontrada.</p>
                                    ) : leaves.map(leave => (
                                        <div key={leave.id} className="bg-white/60 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-200">{leave.reason}</p>
                                                <p className="text-sm text-gray-500 mt-0.5">
                                                    {new Date(leave.start_date).toLocaleDateString('pt-BR')} — {new Date(leave.end_date).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor[leave.status] ?? 'text-gray-400 bg-gray-800 border-gray-700'}`}>
                                                {leave.status === 'pending' ? 'Pendente' : leave.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Reviews 360 Tab */}
                            {activeTab === 'reviews' && (
                                <div>
                                    <h2 className="font-bold text-gray-200 mb-4">Avaliações 360°</h2>
                                    {reviews.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500">
                                            <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                            <p>Nenhuma avaliação recebida ainda.</p>
                                            <p className="text-sm mt-1">As avaliações aparecerão aqui quando você receber feedback da equipe.</p>
                                        </div>
                                    ) : reviews.map(r => (
                                        <div key={r.id} className="bg-white/60 border border-gray-800 rounded-xl p-5 mb-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-xs text-blue-600 uppercase tracking-wider">{r.relationship}</span>
                                                    <p className="text-gray-300 mt-1">{r.feedback}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{r.period}</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-2xl font-black text-yellow-400">{r.score}</span>
                                                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Holerites Tab */}
                            {activeTab === 'holerites' && (
                                <div>
                                    <h2 className="font-bold text-gray-200 mb-4">Meus Holerites</h2>
                                    {payslips.length === 0 ? (
                                        <p className="text-center text-gray-500 py-8">Nenhum holerite disponível.</p>
                                    ) : payslips.map(p => (
                                        <div key={p.id} className="bg-white/60 border border-gray-800 rounded-xl p-5 mb-3">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium text-gray-200">{p.reference_month}</p>
                                                    <p className="text-sm text-gray-500 mt-0.5">Bruto: R$ {p.gross_salary.toFixed(2)} / Líquido: R$ {p.net_salary.toFixed(2)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-green-400 font-bold">R$ {p.net_salary.toFixed(2)}</div>
                                                    <div className="text-xs text-red-400">— R$ {p.deductions.toFixed(2)} descontos</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Link to Kanban */}
                    <div className="mt-8 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-blue-500/20 rounded-xl p-5 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-200">Gestão de Tickets / Reembolsos</h3>
                            <p className="text-sm text-gray-400 mt-0.5">Arraste e organize solicitações no Kanban de RH</p>
                        </div>
                        <a
                            href="/csc"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-medium transition"
                        >
                            <Users className="w-4 h-4" /> Abrir Kanban <ChevronRight className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
