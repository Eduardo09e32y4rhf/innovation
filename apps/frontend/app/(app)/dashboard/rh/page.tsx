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
            <div className="min-h-screen bg-slate-50 text-slate-900 p-8 relative">
                {/* Notification */}
                {notification && (
                    <div className={`fixed top-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl transition-all duration-300 animate-in slide-in-from-right ${notification.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-100 text-emerald-600'
                        : 'bg-rose-50 border border-rose-100 text-rose-600'
                        }`}>
                        {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="text-xs font-black uppercase tracking-tight">{notification.msg}</span>
                    </div>
                )}

                <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-1 uppercase">
                                Painel <span className="text-blue-600">de RH</span>
                            </h1>
                            <p className="text-slate-500 font-medium tracking-tight">Acompanhe seu desenvolvimento, licenças e documentos</p>
                        </div>
                        <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm">
                            <HeartHandshake className="w-10 h-10 text-blue-600" />
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 bg-white border border-slate-100 rounded-[1.8rem] p-2 shadow-sm">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-100'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden lg:inline">{tab.label}</span>
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
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Plano de Desenvolvimento</h2>
                                        <button
                                            onClick={() => setShowPdiForm(!showPdiForm)}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-blue-100"
                                        >
                                            <Plus className="w-4 h-4" /> Nova Meta
                                        </button>
                                    </div>

                                    {/* PDI Form */}
                                    {showPdiForm && (
                                        <div className="bg-white border-2 border-blue-50 rounded-[2.5rem] p-8 mb-8 shadow-xl animate-in slide-in-from-top">
                                            <div className="flex items-center justify-between mb-8">
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-900 italic">Criar Meta PDI</h3>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Defina seus objetivos trimestrais</p>
                                                </div>
                                                <button onClick={() => setShowPdiForm(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                                                    <X size={20} />
                                                </button>
                                            </div>
                                            <div className="space-y-5">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título da Meta</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ex: Refatoração do AI Engine"
                                                        value={pdiForm.title}
                                                        onChange={e => setPdiForm(p => ({ ...p, title: e.target.value }))}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-slate-900 font-bold focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all placeholder:text-slate-300"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                                                    <input
                                                        type="text"
                                                        placeholder="O que você pretende alcançar?"
                                                        value={pdiForm.description}
                                                        onChange={e => setPdiForm(p => ({ ...p, description: e.target.value }))}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-slate-900 font-bold focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all placeholder:text-slate-300"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trimestre Alvo</label>
                                                    <select
                                                        value={pdiForm.quarter}
                                                        onChange={e => setPdiForm(p => ({ ...p, quarter: e.target.value }))}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-slate-900 font-bold focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all"
                                                    >
                                                        {['Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026'].map(q => (
                                                            <option key={q} value={q}>{q}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={handleCreatePDI}
                                                    className="w-full py-5 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-100 mt-4"
                                                >
                                                    Salvar Meta PDI
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {pdiGoals.length === 0 ? (
                                            <div className="col-span-2 text-center py-20 bg-white border border-slate-100 rounded-[2.5rem] p-8">
                                                <Award className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nenhum objetivo definido ainda</p>
                                            </div>
                                        ) : pdiGoals.map(goal => (
                                            <div key={goal.id} className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2.5rem] p-8 hover:shadow-lg transition-all relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-500 opacity-[0.03] rounded-bl-[4rem]" />
                                                <div className="flex items-start justify-between mb-6">
                                                    <div>
                                                        <h4 className="text-lg font-black text-slate-900 tracking-tight italic">{goal.title}</h4>
                                                        {goal.description && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{goal.description}</p>}
                                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-3 inline-block px-3 py-1 bg-blue-50 rounded-full">{goal.quarter}</span>
                                                    </div>
                                                    {goal.completed && <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500"><CheckCircle size={24} /></div>}
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-end">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Core Progress</span>
                                                        <span className="text-2xl font-black text-slate-900 tracking-tighter">{goal.progress.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="bg-slate-50 border border-slate-100 rounded-full h-3 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-1000"
                                                            style={{ width: `${goal.progress}%` }}
                                                        />
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={0} max={100} step={5}
                                                        defaultValue={goal.progress}
                                                        onMouseUp={e => handleUpdateProgress(goal.id, Number((e.target as HTMLInputElement).value))}
                                                        className="w-full accent-blue-600 mt-2"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Licenças Tab */}
                            {activeTab === 'licencas' && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8">Protocolos de Licença</h2>
                                    {leaves.length === 0 ? (
                                        <div className="text-center py-20 bg-white border border-slate-100 rounded-[2.5rem] p-8">
                                            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sem solicitações ativas</p>
                                        </div>
                                    ) : leaves.map(leave => (
                                        <div key={leave.id} className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2rem] p-8 flex items-center justify-between hover:border-blue-100 transition-all">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                                                    <FileText size={28} />
                                                </div>
                                                <div>
                                                    <p className="text-lg font-black text-slate-900 tracking-tight italic">{leave.reason}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                        {new Date(leave.start_date).toLocaleDateString('pt-BR')} — {new Date(leave.end_date).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${statusColor[leave.status]?.includes('green') ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : statusColor[leave.status]?.includes('yellow') ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                                                {leave.status === 'pending' ? 'Pendente' : leave.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Reviews 360 Tab */}
                            {activeTab === 'reviews' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8">Avaliações 360°</h2>
                                    {reviews.length === 0 ? (
                                        <div className="text-center py-20 bg-white border border-slate-100 rounded-[2.5rem] p-8">
                                            <Star className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sem avaliações processadas</p>
                                        </div>
                                    ) : reviews.map(r => (
                                        <div key={r.id} className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2.5rem] p-8 hover:shadow-lg transition-all relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-600 to-orange-500 opacity-[0.03] rounded-bl-[4rem]" />
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] px-3 py-1 bg-blue-50 rounded-full">{r.relationship}</span>
                                                    <p className="text-slate-600 mt-4 leading-relaxed font-medium italic">&quot;{r.feedback}&quot;</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">{r.period}</p>
                                                </div>
                                                <div className="flex flex-col items-center ml-8 pt-2">
                                                    <span className="text-4xl font-black text-slate-900 tracking-tighter">{r.score}</span>
                                                    <div className="flex gap-0.5 mt-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} size={10} className={`${i < Math.floor(r.score) ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Holerites Tab */}
                            {activeTab === 'holerites' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8">Histórico de Holerites</h2>
                                    {payslips.length === 0 ? (
                                        <div className="text-center py-20 bg-white border border-slate-100 rounded-[2.5rem] p-8">
                                            <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sem documentos disponíveis</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {payslips.map(p => (
                                                <div key={p.id} className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2.5rem] p-8 hover:shadow-lg transition-all group border-l-4 border-l-emerald-500">
                                                    <div className="flex justify-between items-center mb-6">
                                                        <div>
                                                            <p className="text-lg font-black text-slate-900 tracking-tight italic">{p.reference_month}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ref: Protocolo Financeiro</p>
                                                        </div>
                                                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                                                            <Clock size={24} />
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-end border-t border-slate-50 pt-6">
                                                        <div>
                                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deduções: R$ {p.deductions.toFixed(2)}</div>
                                                            <div className="text-[10px] font-bold text-slate-400">Bruto: R$ {p.gross_salary.toFixed(2)}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Líquido Final</span>
                                                            <span className="text-3xl font-black text-emerald-600 tracking-tighter">R$ {p.net_salary.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* Link to Kanban */}
                    <div className="bg-white border-2 border-blue-50 rounded-[3rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-2 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-500" />
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight italic">Gestão de Tickets / Reembolsos</h3>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Protocolos de suporte neural e administrativo</p>
                        </div>
                        <a
                            href="/csc"
                            className="w-full md:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-100 group-hover:scale-105"
                        >
                            <Users size={20} /> Central de Soluções <ChevronRight size={20} />
                        </a>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
