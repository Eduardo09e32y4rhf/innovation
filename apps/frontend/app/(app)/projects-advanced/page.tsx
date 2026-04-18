'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Zap, ShoppingCart, CheckCircle, XCircle, Clock, Plus, ChevronRight, Filter } from 'lucide-react';
import api from '@/services/api';

export default function ProjectsAdvancedPage() {
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [pending, setPending] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'workflows' | 'purchases'>('workflows');
    const [showWfForm, setShowWfForm] = useState(false);
    const [showPurchForm, setShowPurchForm] = useState(false);

    const [wfForm, setWfForm] = useState({
        name: '', trigger_event: 'task_moved_to_done', action_type: 'send_email',
        action_config: { to: '', subject: '', body: '' }
    });
    const [purchForm, setPurchForm] = useState({ description: '', amount: 0, category: 'equipment' });

    const loadData = async () => {
        const [wf, p, pending] = await Promise.all([
            api.get('/api/projects/v2/workflows').catch(() => []),
            api.get('/api/projects/v2/purchases').catch(() => []),
            api.get('/api/projects/v2/purchases/pending').catch(() => []),
        ]);
        setWorkflows(Array.isArray(wf) ? wf : []);
        setPurchases(Array.isArray(p) ? p : []);
        setPending(Array.isArray(pending) ? pending : []);
    };

    useEffect(() => { loadData(); }, []);

    const createWorkflow = async () => {
        if (!wfForm.name) return;
        await api.post('/api/projects/v2/workflows', wfForm);
        setShowWfForm(false);
        loadData();
    };

    const toggleWorkflow = async (id: number) => {
        await api.patch(`/api/projects/v2/workflows/${id}/toggle`);
        loadData();
    };

    const createPurchase = async () => {
        if (!purchForm.description || !purchForm.amount) return;
        await api.post('/api/projects/v2/purchases', purchForm);
        setShowPurchForm(false);
        loadData();
    };

    const approvePurchase = async (id: number, approve: boolean) => {
        await api.patch(`/api/projects/v2/purchases/${id}/approve`, { approve, note: approve ? 'Aprovado pelo gestor' : 'Reprovado' });
        loadData();
    };

    const statusColor = (status: string) => ({
        pending: 'text-yellow-400 bg-yellow-500/10',
        approved: 'text-green-400 bg-green-500/10',
        rejected: 'text-red-400 bg-red-500/10',
    }[status] || 'text-gray-400 bg-gray-500/10');

    const TRIGGER_LABELS: Record<string, string> = {
        task_moved_to_done: 'Tarefa movida para Concluído',
        ticket_created: 'Ticket criado',
        task_overdue: 'Tarefa atrasada',
        project_created: 'Projeto criado',
    };

    const ACTION_LABELS: Record<string, string> = {
        send_email: '📧 Enviar e-mail',
        create_ticket: '🎫 Criar ticket',
        notify: '🔔 Notificação interna',
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex">
            <Sidebar />
            <main className="ml-[280px] flex-1 p-12">
                <div className="mb-12">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Projetos <span className="text-blue-600">Avançado</span></h1>
                    <p className="text-slate-500 font-medium mt-1">Automação de Fluxos e Aprovações de Compra</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {(['workflows', 'purchases'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab ? 'bg-blue-500 text-white' : 'bg-white text-gray-400 hover:text-slate-900'}`}>
                            {tab === 'workflows' ? '⚡ Automação de Fluxos' : `🛒 Aprovações (${pending.length} pendentes)`}
                        </button>
                    ))}
                </div>

                {/* WORKFLOWS */}
                {activeTab === 'workflows' && (
                    <div>
                        <div className="flex justify-end mb-4">
                            <button onClick={() => setShowWfForm(!showWfForm)}
                                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-600 transition">
                                <Plus className="w-4 h-4" /> Novo Fluxo
                            </button>
                        </div>

                        {showWfForm && (
                            <div className="bg-white border border-blue-500/30 rounded-xl p-5 mb-6">
                                <h3 className="font-semibold text-slate-900 mb-4">Criar Automação</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <input value={wfForm.name} onChange={e => setWfForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Nome do fluxo"
                                        className="col-span-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-500" />
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Gatilho (Quando...)</label>
                                        <select value={wfForm.trigger_event} onChange={e => setWfForm(p => ({ ...p, trigger_event: e.target.value }))}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-500">

                                            <option value="task_moved_to_done">Tarefa movida para Concluído</option>
                                            <option value="ticket_created">Ticket criado</option>
                                            <option value="task_overdue">Tarefa atrasada</option>
                                            <option value="project_created">Projeto criado</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-xs mb-1 block">Ação (Então...)</label>
                                        <select value={wfForm.action_type} onChange={e => setWfForm(p => ({ ...p, action_type: e.target.value }))}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-500">

                                            <option value="send_email">Enviar E-mail</option>
                                            <option value="create_ticket">Criar Ticket</option>
                                            <option value="notify">Notificação Interna</option>
                                        </select>
                                    </div>
                                    <input value={wfForm.action_config.to} onChange={e => setWfForm(p => ({ ...p, action_config: { ...p.action_config, to: e.target.value } }))}
                                        placeholder="Para (email ou usuário)"
                                        className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-blue-500 shadow-sm" />
                                    <input value={wfForm.action_config.subject} onChange={e => setWfForm(p => ({ ...p, action_config: { ...p.action_config, subject: e.target.value } }))}
                                        placeholder="Assunto"
                                        className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-blue-500 shadow-sm" />

                                </div>
                                <button onClick={createWorkflow} className="mt-3 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition">
                                    Criar Fluxo
                                </button>
                            </div>
                        )}

                        <div className="space-y-3">
                            {workflows.map(wf => (
                                <div key={wf.id} className={`bg-white border rounded-xl p-5 transition ${wf.is_active ? 'border-blue-500/30' : 'border-gray-700/50 opacity-60'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Zap className={`w-5 h-5 ${wf.is_active ? 'text-blue-600' : 'text-gray-600'}`} />
                                            <div>
                                                <p className="text-slate-900 font-medium">{wf.name}</p>
                                                <p className="text-gray-500 text-xs">
                                                    {TRIGGER_LABELS[wf.trigger_event] || wf.trigger_event} → {ACTION_LABELS[wf.action_type] || wf.action_type}
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={() => toggleWorkflow(wf.id)}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${wf.is_active ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                                            {wf.is_active ? 'Ativo' : 'Pausado'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {workflows.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p>Nenhum fluxo de automação criado</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* PURCHASES */}
                {activeTab === 'purchases' && (
                    <div>
                        <div className="flex justify-end mb-4">
                            <button onClick={() => setShowPurchForm(!showPurchForm)}
                                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-600 transition">
                                <Plus className="w-4 h-4" /> Nova Solicitação
                            </button>
                        </div>

                        {showPurchForm && (
                            <div className="bg-white border border-blue-500/30 rounded-xl p-5 mb-6">
                                <h3 className="font-semibold text-slate-900 mb-4">Solicitar Compra / Reembolso</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <input value={purchForm.description} onChange={e => setPurchForm(p => ({ ...p, description: e.target.value }))}
                                        placeholder="Descrição"
                                        className="col-span-2 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-blue-500 shadow-sm" />
                                    <input type="number" value={purchForm.amount} onChange={e => setPurchForm(p => ({ ...p, amount: Number(e.target.value) }))}
                                        placeholder="Valor (R$)"
                                        className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-blue-500 shadow-sm" />
                                    <select value={purchForm.category} onChange={e => setPurchForm(p => ({ ...p, category: e.target.value }))}
                                        className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-blue-500 shadow-sm appearance-none cursor-pointer">

                                        <option value="equipment">Equipamentos</option>
                                        <option value="software">Software</option>
                                        <option value="travel">Viagem</option>
                                        <option value="training">Treinamento</option>
                                        <option value="other">Outros</option>
                                    </select>
                                </div>
                                <button onClick={createPurchase} className="mt-3 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition">
                                    Enviar Solicitação
                                </button>
                            </div>
                        )}

                        {pending.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Aguardando Aprovação ({pending.length})
                                </h3>
                                <div className="space-y-2">
                                    {pending.map(req => (
                                        <div key={req.id} className="bg-yellow-500/5 border-yellow-500/30 rounded-xl p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-slate-900 text-sm font-medium">{req.description}</p>
                                                <p className="text-yellow-400 text-sm font-bold">R$ {Number(req.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                <p className="text-gray-500 text-xs">{req.category}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => approvePurchase(req.id, true)}
                                                    className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1.5 rounded-lg text-xs hover:bg-green-500/30 transition flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" /> Aprovar
                                                </button>
                                                <button onClick={() => approvePurchase(req.id, false)}
                                                    className="bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1.5 rounded-lg text-xs hover:bg-red-500/30 transition flex items-center gap-1">
                                                    <XCircle className="w-3 h-3" /> Recusar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            {purchases.filter(r => r.status !== 'pending').map(req => (
                                <div key={req.id} className="bg-white border border-blue-500/10 rounded-xl p-4 flex items-center justify-between">

                                    <div>
                                        <p className="text-slate-900 text-sm">{req.description}</p>
                                        <p className="text-gray-400 text-sm">R$ {Number(req.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • {req.category}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(req.status)}`}>
                                        {req.status === 'approved' ? '✓ Aprovado' : '✗ Reprovado'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
