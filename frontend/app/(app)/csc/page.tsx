'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Star, ThumbsUp, ThumbsDown, Clock, AlertTriangle, BookOpen, Plus, CheckCircle, Search, Layers, TrendingUp, ChevronRight, Filter, HelpCircle, ShieldAlert } from 'lucide-react';
import api from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';

const QUEUES = ['N1', 'N2', 'DEV', 'BKO', 'RET', 'COB', 'CONT'];
const QUEUE_LABELS: Record<string, string> = {
    N1: 'Triagem', N2: 'Técnico', DEV: 'Engenharia',
    BKO: 'Backoffice', RET: 'Retenção', COB: 'Cobrança', CONT: 'Contabilismo',
};

export default function CSCPage() {
    const [queues, setQueues] = useState<any>({});
    const [kb, setKb] = useState<any[]>([]);
    const [spikes, setSpikes] = useState<any>(null);
    const [csat, setCsat] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [kbSearch, setKbSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'queues' | 'kb' | 'analytics'>('queues');
    const [newArticle, setNewArticle] = useState({ title: '', content: '', category: '' });
    const [showArticleForm, setShowArticleForm] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [q, k, s, c] = await Promise.all([
                api.get('/api/support/v2/queues').then(r => r.data).catch(() => ({})),
                api.get('/api/support/v2/kb').then(r => r.data).catch(() => []),
                api.get('/api/support/v2/analytics/spikes').then(r => r.data).catch(() => null),
                api.get('/api/support/v2/csat/summary').then(r => r.data).catch(() => null),
            ]);
            setQueues(q);
            setKb(Array.isArray(k) ? k : []);
            setSpikes(s);
            setCsat(c);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    const filteredKb = kb.filter(a =>
        a.title?.toLowerCase().includes(kbSearch.toLowerCase()) ||
        a.category?.toLowerCase().includes(kbSearch.toLowerCase())
    );

    const createArticle = async () => {
        if (!newArticle.title || !newArticle.content) return;
        await api.post('/api/support/v2/kb', newArticle);
        setNewArticle({ title: '', content: '', category: '' });
        setShowArticleForm(false);
        await loadData();
    };

    const escalate = async () => {
        await api.post('/api/support/v2/escalate-breached');
        await loadData();
    };

    const totalTickets = Object.values(queues).reduce((acc: number, q: any) => acc + (q.count || 0), 0);

    return (
        <AppLayout title="Central de Serviços Compartilhados">
            <div className="p-8 space-y-10 animate-in fade-in duration-700">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Service <span className="text-indigo-600">Desk</span></h1>
                        <p className="text-slate-500 font-medium tracking-tight">Gestão de chamados, base de conhecimento e análise de SLA.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={escalate}
                            className="bg-rose-50 text-rose-600 border-rose-100 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-rose-100 transition-all shadow-sm"
                        >
                            <ShieldAlert size={18} /> Escalar Vencidos
                        </button>
                    </div>
                </div>

                {/* Dashboard KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                            <Layers size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Abertos</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">{totalTickets}</p>
                        </div>
                    </div>
                    <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner">
                            <Star size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">CSAT Médio</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">{csat?.average || '—'}</p>
                        </div>
                    </div>
                    <div className={`bg-white border-slate-200 border-black/5 shadow-sm border p-6 rounded-[2rem] shadow-sm flex items-center gap-5 ${spikes?.is_spike ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100'}`}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${spikes?.is_spike ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Tickets/Hr</p>
                            <p className={`text-2xl font-black tracking-tight ${spikes?.is_spike ? 'text-rose-600' : 'text-slate-900'}`}>{spikes?.tickets_last_hour ?? '0'}</p>
                        </div>
                    </div>
                    <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Artigos KB</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">{kb.length}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 p-2 rounded-[2.2rem] shadow-sm flex gap-2">
                    {[
                        { id: 'queues', label: 'Filas & SLA', icon: Layers },
                        { id: 'kb', label: 'Base de Conhecimento', icon: BookOpen },
                        { id: 'analytics', label: 'Analytics Suporte', icon: TrendingUp }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100'
                                        : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                            >
                                <Icon size={16} />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2.5rem] p-8 shadow-sm min-h-[500px]">
                    <AnimatePresence mode="wait">
                        {activeTab === 'queues' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="queues" className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {QUEUES.map(queue => {
                                    const q = queues[queue] || { count: 0, sla_hours: 0, tickets: [] };
                                    return (
                                        <div key={queue} className="p-6 rounded-[2.2rem] bg-slate-50/50 border-slate-100 hover:border-indigo-100 hover:bg-white border-slate-200 border-black/5 shadow-sm transition-all group">
                                            <div className="flex items-center justify-between mb-6">
                                                <div>
                                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{queue} — {QUEUE_LABELS[queue]}</h3>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">SLA Objetivo: {q.sla_hours}h</p>
                                                </div>
                                                <div className="w-12 h-12 rounded-2xl bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 flex items-center justify-center shadow-sm">
                                                    <span className="text-lg font-black text-indigo-600">{q.count}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {q.tickets?.slice(0, 4).map((t: any) => (
                                                    <div key={t.id} className="flex items-center justify-between p-3 bg-white border-slate-200 border-black/5 shadow-sm border-slate-50 rounded-xl group-hover:border-slate-100 transition-all">
                                                        <span className="text-[11px] font-bold text-slate-600 truncate flex-1 tracking-tight pr-4">{t.title}</span>
                                                        <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${t.sla_breached ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                            }`}>
                                                            {t.sla_breached ? 'Vencido' : 'No Prazo'}
                                                        </span>
                                                    </div>
                                                ))}
                                                {q.count === 0 && (
                                                    <div className="text-center py-6">
                                                        <CheckCircle size={24} className="mx-auto mb-2 text-emerald-200" />
                                                        <p className="text-[10px] font-black uppercase text-slate-700 tracking-widest">Fila em conformidade</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        )}

                        {activeTab === 'kb' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="kb" className="space-y-8">
                                <div className="flex flex-col md:flex-row items-center gap-4">
                                    <div className="relative flex-1 w-full">
                                        <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar na inteligência coletiva..."
                                            className="w-full bg-slate-50 border-transparent rounded-[1.8rem] px-14 py-4 text-sm font-medium focus:bg-white border-slate-200 border-black/5 shadow-sm focus:border-indigo-100 outline-none transition-all"
                                            value={kbSearch}
                                            onChange={e => setKbSearch(e.target.value)}
                                        />
                                    </div>
                                    <button onClick={() => setShowArticleForm(true)} className="w-full md:w-auto bg-indigo-600 text-white px-8 py-4 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                                        <Plus size={18} /> Novo Artigo
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {filteredKb.map(article => (
                                        <div key={article.id} className="p-8 rounded-[2.5rem] bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 hover:border-indigo-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100/20 transition-all cursor-pointer group">
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border-indigo-100">{article.category || 'Geral'}</span>
                                            </div>
                                            <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight mb-3">{article.title}</h3>
                                            <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed mb-6">{article.content}</p>
                                            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                                <div className="flex items-center gap-4 text-[9px] font-black text-slate-700 uppercase tracking-widest">
                                                    <span className="flex items-center gap-1"><BookOpen size={12} /> {article.views || 0}</span>
                                                    <span className="flex items-center gap-1"><ThumbsUp size={12} /> {article.helpful_votes || 0}</span>
                                                </div>
                                                <ChevronRight size={18} className="text-slate-800 group-hover:text-indigo-600" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'analytics' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="analytics" className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="bg-slate-50 border-slate-100 p-8 rounded-[2.5rem]">
                                    <div className="flex items-center gap-3 mb-8">
                                        <TrendingUp size={24} className="text-indigo-600" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Padrão de Volume (Neural)</h3>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-end h-32 gap-2">
                                            {[30, 45, 25, 60, 80, 50, 40].map((h, i) => (
                                                <div key={i} className="flex-1 bg-indigo-100 rounded-t-xl relative group">
                                                    <div className="absolute bottom-0 w-full bg-indigo-600 rounded-t-xl transition-all duration-1000" style={{ height: `${h}%` }} />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between border-t border-slate-200 pt-4">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Ratio de Spike</p>
                                                <p className="text-xl font-black text-slate-900">{spikes?.spike_ratio || '1.0'}x</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Média 24h</p>
                                                <p className="text-xl font-black text-slate-900">{spikes?.hourly_average_24h || '0'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 p-8 rounded-[2.5rem] shadow-sm">
                                    <div className="flex items-center gap-3 mb-8">
                                        <Star size={24} className="text-amber-500" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Satisfação CSAT</h3>
                                    </div>
                                    <div className="flex items-center gap-10">
                                        <div className="text-center">
                                            <p className="text-7xl font-black text-slate-900 tracking-tighter">{csat?.average || '0'}</p>
                                            <div className="flex justify-center mt-2 group gap-0.5">
                                                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} className={i <= (csat?.average || 0) ? 'text-amber-500 fill-amber-500' : 'text-slate-800'} />)}
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            {[5, 4, 3, 2, 1].map(score => {
                                                const count = csat?.distribution?.[String(score)] || 0;
                                                const pct = csat?.total ? (count / csat.total * 100) : 0;
                                                return (
                                                    <div key={score} className="flex items-center gap-4 text-[10px] font-black text-slate-400">
                                                        <span className="w-4">{score}★</span>
                                                        <div className="flex-1 bg-slate-50 h-2 rounded-full overflow-hidden">
                                                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className="w-6 text-right">{count}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Article Modal */}
            <AnimatePresence>
                {showArticleForm && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-50/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowArticleForm(false)}>
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-xl p-10 rounded-[2.8rem] shadow-2xl relative" onClick={e => e.stopPropagation()}>

                            <div className="flex justify-between items-center mb-10">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Novo Conhecimento</h2>
                                <button onClick={() => setShowArticleForm(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:bg-slate-100 transition-all" aria-label="Fechar modal"><X size={20} /></button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Título do Artigo</label>
                                    <input type="text" className="w-full bg-slate-50 border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-50 outline-none" placeholder="Ex: Como configurar VPN corporativa" value={newArticle.title} onChange={e => setNewArticle({ ...newArticle, title: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Categoria</label>
                                    <input type="text" className="w-full bg-slate-50 border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-50 outline-none" placeholder="Ex: TI / Suporte" value={newArticle.category} onChange={e => setNewArticle({ ...newArticle, category: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Conteúdo Estruturado</label>
                                    <textarea rows={6} className="w-full bg-slate-50 border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-50 outline-none resize-none" placeholder="Detalhe o procedimento..." value={newArticle.content} onChange={e => setNewArticle({ ...newArticle, content: e.target.value })} />
                                </div>

                                <button onClick={createArticle} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[1.8rem] shadow-xl shadow-indigo-100 uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-95 transition-all mt-4">
                                    Publicar na Inteligência
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
