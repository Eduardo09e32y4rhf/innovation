'use client';

import AppLayout from '@/components/AppLayout';
import { HelpCircle, MessageCircle, AlertTriangle, FileText, Plus, X, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SupportService } from '@/services/api';

interface Ticket {
    id: number;
    title: string;
    description: string;
    status: string;
    priority?: string;
    created_at?: string;
}

interface SystemStatus {
    api: string;
    database: string;
    ia_service: string;
}

export default function SupportPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [status, setStatus] = useState<SystemStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ title: '', description: '' });
    const [smartReply, setSmartReply] = useState<Record<number, string>>({});

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [t, s] = await Promise.all([
                SupportService.getTickets(),
                SupportService.getSystemStatus(),
            ]);
            setTickets(Array.isArray(t) ? t : []);
            setStatus(s);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const createTicket = async () => {
        if (!form.title || !form.description) return;
        await SupportService.createTicket(form);
        setShowModal(false);
        setForm({ title: '', description: '' });
        loadData();
    };

    const loadSmartReply = async (ticket: Ticket) => {
        const res = await SupportService.getSmartReply(ticket.id, ticket.description);
        setSmartReply(prev => ({ ...prev, [ticket.id]: res.reply }));
    };

    const statusColor = (s: string) => s === 'online' ? 'bg-green-500' : 'bg-red-500';
    const ticketStatusClass = (s: string) => ({
        open: 'bg-blue-500/10 text-blue-400',
        resolved: 'bg-green-500/10 text-green-400',
        in_progress: 'bg-yellow-500/10 text-yellow-400',
    }[s] ?? 'bg-gray-500/10 text-gray-400');

    const kpis = [
        { title: "Tickets Abertos", value: tickets.filter(t => t.status === 'open').length, icon: MessageCircle, color: "text-blue-400" },
        { title: "Em Andamento", value: tickets.filter(t => t.status === 'in_progress').length, icon: HelpCircle, color: "text-yellow-400" },
        { title: "Resolvidos", value: tickets.filter(t => t.status === 'resolved').length, icon: FileText, color: "text-green-400" },
        { title: "Total", value: tickets.length, icon: AlertTriangle, color: "text-purple-400" },
    ];

    return (
        <AppLayout title="Central de Suporte">
            <div className="text-white">
                <main className="p-8 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-600">
                            Central de Suporte
                        </h1>
                        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-medium transition">
                            <Plus className="w-4 h-4" /> Abrir Chamado
                        </button>
                    </div>

                    {/* System Status */}
                    {status && (
                        <div className="mb-6 flex gap-4 p-4 bg-zinc-900 border-zinc-800 rounded-xl">
                            <span className="text-sm text-gray-400 font-medium">Status do Sistema:</span>
                            {Object.entries(status).map(([k, v]) => (
                                <div key={k} className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${statusColor(v as string)}`} />
                                    <span className="text-xs text-gray-300 capitalize">{k.replace('_', ' ')}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        {kpis.map((kpi, i) => (
                            <div key={i} className="glass-panel p-6 rounded-xl flex flex-col items-center text-center">
                                <kpi.icon className={`w-10 h-10 mb-2 ${kpi.color}`} />
                                <p className="text-gray-400 text-sm">{kpi.title}</p>
                                <p className="text-2xl font-bold mt-1">{loading ? '...' : kpi.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="glass-panel rounded-xl p-6">
                        <h3 className="text-lg font-semibold mb-6">Tickets</h3>
                        {loading ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
                        ) : tickets.length === 0 ? (
                            <p className="text-center text-gray-500 py-12">Nenhum ticket aberto. 🎉</p>
                        ) : (
                            <div className="space-y-4">
                                {tickets.map(ticket => (
                                    <div key={ticket.id} className="border-zinc-800 rounded-xl p-4 hover:border-zinc-600 transition">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="font-mono text-xs text-gray-500">#{ticket.id}</span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${ticketStatusClass(ticket.status)}`}>{ticket.status}</span>
                                                </div>
                                                <p className="font-medium text-white">{ticket.title}</p>
                                                <p className="text-sm text-gray-500 mt-1">{ticket.description}</p>
                                            </div>
                                            <button onClick={() => loadSmartReply(ticket)} className="text-xs px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded-lg transition">
                                                ✨ Smart Reply
                                            </button>
                                        </div>
                                        {smartReply[ticket.id] && (
                                            <div className="mt-3 p-3 bg-purple-900/20 border-purple-500/20 rounded-lg text-sm text-purple-200">
                                                <strong>Sugestão IA:</strong> {smartReply[ticket.id]}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {showModal && (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                            <div className="bg-zinc-900 border-zinc-700 rounded-2xl p-6 w-full max-w-md">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold">Abrir Chamado</h3>
                                    <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
                                </div>
                                <div className="space-y-3">
                                    <input className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 text-sm" placeholder="Título do problema" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                                    <textarea className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 text-sm" rows={4} placeholder="Descreva o problema em detalhes..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                    <button onClick={createTicket} className="w-full py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-medium transition">
                                        Enviar Chamado
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </AppLayout>
    );
}
