'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Star, ThumbsUp, ThumbsDown, Clock, AlertTriangle, BookOpen, Plus, CheckCircle, Search, Layers, TrendingUp } from 'lucide-react';
import api from '../../services/api';

const QUEUES = ['N1', 'N2', 'DEV', 'BKO', 'RET', 'COB', 'CONT'];
const QUEUE_LABELS: Record<string, string> = {
    N1: 'Triagem', N2: 'Técnico', DEV: 'Engenharia',
    BKO: 'Backoffice', RET: 'Retenção', COB: 'Cobrança', CONT: 'Contabilidade',
};
const QUEUE_COLORS: Record<string, string> = {
    N1: 'blue', N2: 'violet', DEV: 'orange', BKO: 'teal',
    RET: 'red', COB: 'yellow', CONT: 'green',
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
        loadData();
    };

    const escalate = async () => {
        await api.post('/api/support/v2/escalate-breached');
        loadData();
    };

    const slaColor = (status: string) => {
        if (status === 'red') return 'text-red-400 bg-red-500/10';
        if (status === 'yellow') return 'text-yellow-400 bg-yellow-500/10';
        return 'text-green-400 bg-green-500/10';
    };

    const totalTickets = Object.values(queues).reduce((acc: number, q: any) => acc + (q.count || 0), 0);

    return (
        <div className="min-h-screen bg-gray-950 text-white flex">
            <Sidebar />
            <main className="ml-[280px] flex-1 p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold gradient-text">Central de Serviços</h1>
                        <p className="text-gray-400 mt-1">Service Desk com SLA, filas e base de conhecimento</p>
                    </div>
                    <button onClick={escalate} className="bg-red-600/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg hover:bg-red-600/30 transition text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Escalar Vencidos
                    </button>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-gray-900 border border-purple-500/20 rounded-xl p-4">
                        <p className="text-gray-400 text-sm">Total Abertos</p>
                        <p className="text-3xl font-bold text-white">{totalTickets}</p>
                    </div>
                    <div className="bg-gray-900 border border-purple-500/20 rounded-xl p-4">
                        <p className="text-gray-400 text-sm">CSAT Médio</p>
                        <div className="flex items-center gap-2">
                            <p className="text-3xl font-bold text-yellow-400">{csat?.average || '—'}</p>
                            <Star className="w-5 h-5 text-yellow-400" />
                        </div>
                    </div>
                    <div className={`bg-gray-900 border rounded-xl p-4 ${spikes?.is_spike ? 'border-red-500/50' : 'border-purple-500/20'}`}>
                        <p className="text-gray-400 text-sm">Tickets/hora</p>
                        <p className={`text-3xl font-bold ${spikes?.is_spike ? 'text-red-400' : 'text-white'}`}>
                            {spikes?.tickets_last_hour ?? '—'}
                        </p>
                        {spikes?.is_spike && <p className="text-red-400 text-xs mt-1">⚠ SPIKE DETECTADO</p>}
                    </div>
                    <div className="bg-gray-900 border border-purple-500/20 rounded-xl p-4">
                        <p className="text-gray-400 text-sm">Artigos KB</p>
                        <p className="text-3xl font-bold text-white">{kb.length}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {(['queues', 'kb', 'analytics'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab ? 'bg-purple-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'}`}>
                            {tab === 'queues' ? '📋 Filas & SLA' : tab === 'kb' ? '📚 Base de Conhecimento' : '📊 Analytics'}
                        </button>
                    ))}
                </div>

                {/* FILAS */}
                {activeTab === 'queues' && (
                    <div className="grid grid-cols-2 gap-4">
                        {QUEUES.map(queue => {
                            const q = queues[queue] || { count: 0, sla_hours: 0, tickets: [] };
                            return (
                                <div key={queue} className="bg-gray-900 border border-purple-500/20 rounded-xl p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h3 className="font-bold text-white">{queue} — {QUEUE_LABELS[queue]}</h3>
                                            <p className="text-gray-500 text-xs">SLA: {q.sla_hours}h</p>
                                        </div>
                                        <span className="text-2xl font-bold text-purple-400">{q.count}</span>
                                    </div>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {q.tickets?.slice(0, 5).map((t: any) => (
                                            <div key={t.id} className="bg-gray-800 rounded-lg p-2 text-sm flex items-center justify-between">
                                                <span className="text-gray-300 truncate flex-1">{t.title}</span>
                                                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${slaColor(t.sla_status || 'green')}`}>
                                                    {t.sla_breached ? '🔴 VENCIDO' : '🟢 OK'}
                                                </span>
                                            </div>
                                        ))}
                                        {q.count === 0 && <p className="text-gray-600 text-xs text-center py-3">Fila vazia ✓</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* KB */}
                {activeTab === 'kb' && (
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    value={kbSearch}
                                    onChange={e => setKbSearch(e.target.value)}
                                    placeholder="Buscar artigos..."
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                />
                            </div>
                            <button onClick={() => setShowArticleForm(!showArticleForm)}
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-purple-700 transition">
                                <Plus className="w-4 h-4" /> Novo Artigo
                            </button>
                        </div>

                        {showArticleForm && (
                            <div className="bg-gray-900 border border-purple-500/30 rounded-xl p-5 mb-4">
                                <h3 className="font-semibold text-white mb-3">Novo Artigo KB</h3>
                                <input
                                    value={newArticle.title}
                                    onChange={e => setNewArticle(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Título do artigo"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm mb-2 focus:outline-none focus:border-purple-500"
                                />
                                <input
                                    value={newArticle.category}
                                    onChange={e => setNewArticle(prev => ({ ...prev, category: e.target.value }))}
                                    placeholder="Categoria (TI, RH, Financeiro...)"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm mb-2 focus:outline-none focus:border-purple-500"
                                />
                                <textarea
                                    value={newArticle.content}
                                    onChange={e => setNewArticle(prev => ({ ...prev, content: e.target.value }))}
                                    placeholder="Conteúdo..."
                                    rows={4}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm mb-3 focus:outline-none focus:border-purple-500"
                                />
                                <button onClick={createArticle} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition">
                                    Publicar Artigo
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            {filteredKb.map(article => (
                                <div key={article.id} className="bg-gray-900 border border-purple-500/20 rounded-xl p-5 hover:border-purple-500/50 transition">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-semibold text-white">{article.title}</h3>
                                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full ml-2 shrink-0">{article.category || 'Geral'}</span>
                                    </div>
                                    <p className="text-gray-400 text-sm line-clamp-3">{article.content}</p>
                                    <div className="flex items-center gap-3 mt-3 text-gray-500 text-xs">
                                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {article.views || 0} views</span>
                                        <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {article.helpful_votes || 0}</span>
                                    </div>
                                </div>
                            ))}
                            {filteredKb.length === 0 && (
                                <div className="col-span-2 text-center py-12 text-gray-500">
                                    <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p>Nenhum artigo encontrado</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ANALYTICS */}
                {activeTab === 'analytics' && (
                    <div className="grid grid-cols-2 gap-4">
                        {spikes && (
                            <div className={`bg-gray-900 border rounded-xl p-6 ${spikes.is_spike ? 'border-red-500/50' : 'border-purple-500/20'}`}>
                                <div className="flex items-center gap-2 mb-4">
                                    <TrendingUp className="w-5 h-5 text-purple-400" />
                                    <h3 className="font-semibold text-white">Detecção de Spikes</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Tickets na última hora</span>
                                        <span className="font-bold text-white">{spikes.tickets_last_hour}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Média horária (24h)</span>
                                        <span className="font-bold text-white">{spikes.hourly_average_24h}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Ratio de spike</span>
                                        <span className={`font-bold ${spikes.is_spike ? 'text-red-400' : 'text-green-400'}`}>
                                            {spikes.spike_ratio}x {spikes.is_spike ? '⚠' : '✓'}
                                        </span>
                                    </div>
                                    {spikes.top_offenders?.length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-gray-400 text-sm mb-2">Top Ofensores</p>
                                            {spikes.top_offenders.map((o: any, i: number) => (
                                                <div key={i} className="flex justify-between text-sm">
                                                    <span className="text-gray-300">{o.category}</span>
                                                    <span className="text-purple-400 font-bold">{o.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {csat && (
                            <div className="bg-gray-900 border border-purple-500/20 rounded-xl p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Star className="w-5 h-5 text-yellow-400" />
                                    <h3 className="font-semibold text-white">CSAT — Satisfação do Cliente</h3>
                                </div>
                                <div className="text-center mb-4">
                                    <p className="text-6xl font-black text-yellow-400">{csat.average}</p>
                                    <p className="text-gray-500 text-sm">{csat.total} avaliações</p>
                                </div>
                                <div className="space-y-2">
                                    {[5, 4, 3, 2, 1].map(score => {
                                        const count = csat.distribution?.[String(score)] || 0;
                                        const pct = csat.total ? (count / csat.total * 100) : 0;
                                        return (
                                            <div key={score} className="flex items-center gap-2 text-sm">
                                                <span className="text-gray-400 w-4">{score}★</span>
                                                <div className="flex-1 bg-gray-800 rounded-full h-2">
                                                    <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="text-gray-500 w-6 text-right">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
