'use client';

import AppLayout from '../../components/AppLayout';
import { BadgeDollarSign, TrendingUp, CreditCard, Wallet, ArrowUpRight, ArrowDownRight, Download, Plus, X, Upload, ScanLine } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FinanceService } from '../../services/api';

interface Transaction {
    id: number;
    description: string;
    amount: number;
    type: string;
    status: string;
    due_date: string;
    attachment_url?: string;
}

interface Summary {
    balance: number;
    total_income: number;
    total_expenses: number;
    pending_income: number;
    pending_expenses: number;
}

export default function FinancePage() {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [anomalies, setAnomalies] = useState<{ description: string; impact: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ description: '', amount: '', type: 'income', due_date: '', attachment_url: '', ai_metadata: '' });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [s, a, t] = await Promise.all([
                FinanceService.getSummary(),
                FinanceService.getAnomalies(),
                FinanceService.getTransactions(),
            ]);
            setSummary(s);
            setAnomalies(a);
            setTransactions(t);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleCreate = async () => {
        try {
            const tx = await FinanceService.createTransaction({
                description: form.description,
                amount: parseFloat(form.amount),
                type: form.type,
                due_date: form.due_date,
                attachment_url: form.attachment_url,
                ai_metadata: form.ai_metadata
            });
            setTransactions(prev => [tx, ...prev]);
            setShowModal(false);
            setForm({ description: '', amount: '', type: 'income', due_date: '', attachment_url: '', ai_metadata: '' });
            loadData();
        } catch (e) { console.error(e); }
    };

    const fmt = (v: number) => `R$ ${v?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) ?? '0,00'}`;

    const kpis = summary ? [
        { title: "Receita Total", value: fmt(summary.total_income), icon: BadgeDollarSign, color: "text-green-400" },
        { title: "Despesas Pagas", value: fmt(summary.total_expenses), icon: Wallet, color: "text-red-400" },
        { title: "Saldo Atual", value: fmt(summary.balance), icon: TrendingUp, color: "text-emerald-400" },
        { title: "Receita Pendente", value: fmt(summary.pending_income), icon: CreditCard, color: "text-purple-400" },
    ] : Array(4).fill({ title: "Carregando...", value: "...", icon: BadgeDollarSign, color: "text-gray-400" });

    return (
        <AppLayout title="Gestão Financeira">
            <div className="text-white">
                <main className="p-8 overflow-y-auto">
                    <header className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600">
                                Gestão Financeira
                            </h1>
                            <p className="text-gray-400 mt-1">Fluxo de caixa em tempo real</p>
                        </div>
                        <div className="flex gap-3">
                            <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm border border-gray-700 transition">
                                <Download className="w-4 h-4" /> Exportar
                            </button>
                            <button
                                onClick={() => setShowModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition"
                            >
                                <Plus className="w-4 h-4" /> Nova Transação
                            </button>
                        </div>
                    </header>

                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        {kpis.map((kpi, i) => (
                            <div key={i} className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <kpi.icon className={`w-16 h-16 ${kpi.color}`} />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-gray-400 text-sm font-medium mb-1">{kpi.title}</p>
                                    <h3 className="text-2xl font-bold text-white">{kpi.value}</h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Anomalias da IA */}
                    {anomalies.length > 0 && (
                        <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                            <p className="text-yellow-400 font-semibold mb-2">⚠️ Anomalias Detectadas pela IA</p>
                            {anomalies.map((a, i) => (
                                <div key={i} className="text-sm text-yellow-300/80">
                                    <strong>{a.impact}</strong>: {a.description}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Transactions */}
                    <div className="glass-panel rounded-2xl p-6">
                        <h3 className="text-lg font-semibold mb-4">Transações Registradas</h3>
                        {loading ? (
                            <p className="text-gray-500 text-sm">Carregando...</p>
                        ) : transactions.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-8">Nenhuma transação registrada. Clique em &ldquo;Nova Transação&rdquo; para começar.</p>
                        ) : (
                            <div className="space-y-3">
                                {transactions.map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {tx.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{tx.description}</p>
                                                <p className="text-xs text-gray-500">
                                                    {tx.due_date} · {tx.status}
                                                    {tx.attachment_url && <span className="ml-2 text-blue-400">📎</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-green-400' : 'text-gray-400'}`}>
                                            {tx.type === 'income' ? '+' : '-'} {fmt(tx.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Modal Nova Transação */}
                    {showModal && (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold">Nova Transação</h3>
                                    <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
                                </div>
                                <div className="space-y-3">

                                    {/* Upload Area */}
                                    <div className="border border-zinc-700 border-dashed rounded-lg p-4 flex flex-col items-center justify-center bg-zinc-800/50 hover:bg-zinc-800 transition cursor-pointer group">
                                        <div className="flex gap-2 mb-2 items-center">
                                            <Upload className="w-5 h-5 text-gray-400 group-hover:text-white" />
                                            <ScanLine className="w-5 h-5 text-green-400 group-hover:text-green-300" />
                                        </div>
                                        <span className="text-xs text-gray-400 text-center mb-2">Arraste um comprovante ou <span className="text-green-400 font-medium">Scanear com IA</span></span>
                                        <input
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-gray-300 focus:border-green-500 focus:outline-none"
                                            placeholder="Cole a URL do comprovante (Zero Papel)..."
                                            value={form.attachment_url}
                                            onChange={e => setForm({ ...form, attachment_url: e.target.value })}
                                        />
                                    </div>

                                    <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" placeholder="Descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                    <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" placeholder="Valor (R$)" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                                    <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        <option value="income">Receita</option>
                                        <option value="expense">Despesa</option>
                                    </select>
                                    <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                                    <button onClick={handleCreate} className="w-full py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2">
                                        <Plus className="w-4 h-4" /> Registrar Transação
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
