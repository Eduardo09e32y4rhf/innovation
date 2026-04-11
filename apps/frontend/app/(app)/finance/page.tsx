'use client';

import AppLayout from '@/components/AppLayout';
import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowUpRight, ArrowDownRight, Search, Download, Plus, Landmark,
    FileText, AlertCircle, Calendar, CheckCircle2, Wallet,
    TrendingUp, X, Loader2, RefreshCw, Eye, EyeOff, Filter
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import { FinanceService, DasMeiService } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Transaction {
    id: number;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    status: 'paid' | 'pending' | 'overdue';
    due_date: string;
    category?: string;
    tax_type?: string;
}

interface DasMei {
    id: number;
    competencia: string;
    valor_das: number;
    vencimento: string;
    status: 'pending' | 'paid' | 'overdue';
    link_pgmei: string;
    link_pgmei_pdf: string;
    cnpj?: string | null;
    paid_at?: string | null;
}

interface Summary {
    balance: number;
    total_income: number;
    total_expenses: number;
    pending_income: number;
    pending_expenses: number;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const fmtDate = (d: string) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const INCOME_CATS = ['Vendas', 'Serviços', 'Consultoria', 'Pix Recebido', 'Outros'];
const EXPENSE_CATS = ['Fornecedor', 'Aluguel', 'Contador', 'Internet', 'Energia', 'Folha', 'Imposto', 'Outros'];

// ─── STAT CARD ───────────────────────────────────────────────────────────────
function StatCard({
    title, amount, subtitle, icon: Icon, colorClass, hidden
}: {
    title: string; amount: number; subtitle: string;
    icon: React.ElementType; colorClass: string; hidden?: boolean;
}) {
    return (
        <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-blue-100/40 transition-all group relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colorClass} opacity-[0.03] group-hover:opacity-[0.07] transition-opacity rounded-bl-[4rem]`} />
            <div className="relative z-10">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 shadow-sm ${colorClass.split(' ')[0].replace('from-', 'text-')}`}>
                    <Icon size={24} />
                </div>
                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{title}</h3>
                <p className="text-2xl font-black text-slate-900 tracking-tight">
                    {hidden ? 'R$ ••••••' : fmtBRL(amount)}
                </p>
                <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] font-bold text-slate-500">{subtitle}</span>
                </div>
            </div>
        </div>
    );
}

// ─── NEW TRANSACTION MODAL ────────────────────────────────────────────────────
function NovoLancamentoModal({ onClose, onSave }: {
    onClose: () => void;
    onSave: (d: any) => Promise<void>;
}) {
    const [type, setType] = useState<'income' | 'expense'>('income');
    const [form, setForm] = useState({
        description: '', amount: '',
        due_date: new Date().toISOString().split('T')[0],
        category: 'Vendas', status: 'paid' as const, tax_type: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;

    const handleTypeChange = (t: 'income' | 'expense') => {
        setType(t);
        setForm(f => ({ ...f, category: t === 'income' ? 'Vendas' : 'Fornecedor' }));
    };

    const handleSubmit = async () => {
        if (!form.description.trim() || !form.amount) { setError('Preencha descrição e valor'); return; }
        const amt = parseFloat(form.amount);
        if (isNaN(amt) || amt <= 0) { setError('Valor inválido'); return; }
        setSaving(true);
        setError('');
        try {
            await onSave({ ...form, amount: amt, type });
        } catch (e: any) {
            setError('Erro ao salvar. Verifique a conexão.');
            setSaving(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-50/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={onClose}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2.5rem] w-full max-w-md shadow-2xl p-8"
                onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Novo Lançamento</h3>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="flex gap-2 bg-slate-50 rounded-2xl p-1.5 border-slate-100">
                        {(['income', 'expense'] as const).map(t => (
                            <button key={t} onClick={() => handleTypeChange(t)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === t
                                    ? t === 'income'
                                        ? 'bg-emerald-600 text-slate-900 shadow-lg shadow-emerald-100'
                                        : 'bg-rose-600 text-slate-900 shadow-lg shadow-rose-100'
                                    : 'text-slate-500 hover:text-slate-900'}`}>
                                {t === 'income' ? 'Receita' : 'Despesa'}
                            </button>
                        ))}
                    </div>

                    <div>
                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 block px-1">Descrição</label>
                        <input
                            className="w-full bg-slate-50 border-slate-100 rounded-2xl px-5 py-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition"
                            placeholder="Ex: Pagamento Cliente X"
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 block px-1">Valor</label>
                            <input
                                className="w-full bg-slate-50 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition"
                                type="number" placeholder="0,00"
                                value={form.amount}
                                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 block px-1">Data</label>
                            <input
                                className="w-full bg-slate-50 border-slate-100 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition"
                                type="date" value={form.due_date}
                                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 block px-1">Categoria</label>
                            <select
                                className="w-full bg-slate-50 border-slate-100 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition appearance-none"
                                value={form.category}
                                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                {cats.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 block px-1">Status</label>
                            <select
                                className="w-full bg-slate-50 border-slate-100 rounded-2xl px-5 py-4 text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition appearance-none"
                                value={form.status}
                                onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                                <option value="paid">Liquidado</option>
                                <option value="pending">Pendente</option>
                                <option value="overdue">Vencido</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <p className="text-[10px] font-black text-rose-600 bg-rose-50 p-3 rounded-xl uppercase tracking-widest text-center">{error}</p>
                    )}

                    <button
                        onClick={handleSubmit} disabled={saving}
                        className={`w-full py-5 rounded-[1.8rem] text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center justify-center gap-2 transition-all shadow-xl disabled:opacity-50 ${type === 'income'
                            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-100'
                            : 'bg-rose-600 hover:bg-rose-500 shadow-rose-100'}`}>
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        {saving ? 'Registrando...' : 'Confirmar Lançamento'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function FinancePage() {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [dasMei, setDasMei] = useState<DasMei | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [searchTx, setSearchTx] = useState('');
    const [hidden, setHidden] = useState(false);

    const loadData = useCallback(async () => {
        setRefreshing(true);
        try {
            const [s, t, das] = await Promise.all([
                FinanceService.getSummary(),
                FinanceService.getTransactions(),
                DasMeiService.getAtual().catch(() => null),
            ]);
            setSummary(s);
            setTransactions(t || []);
            setDasMei(das);
        } catch (e) { }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleCreate = async (data: any) => {
        await FinanceService.createTransaction(data);
        setShowModal(false);
        await loadData();
    };

    const filteredTx = transactions.filter(tx =>
        tx.description.toLowerCase().includes(searchTx.toLowerCase())
    ).slice(0, 10);

    const chartData = [
        { name: 'Jan', entradas: 4000, saidas: 2400 },
        { name: 'Fev', entradas: 3000, saidas: 3398 },
        { name: 'Mar', entradas: 2000, saidas: 4800 },
        { name: 'Abr', entradas: 2780, saidas: 3908 },
        { name: 'Mai', entradas: 1890, saidas: 4800 },
        { name: 'Jun', entradas: 6390, saidas: 3800 },
    ];

    return (
        <AppLayout title="Fluxo de Caixa">
            <div className="p-8 space-y-8 animate-in fade-in duration-700">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Financeiro <span className="text-blue-600">Premium</span></h1>
                        <p className="text-slate-500 font-medium">Gestão inteligente de fluxo de caixa e obrigações fiscais.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setHidden(!hidden)}
                            className="w-12 h-12 bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm"
                        >
                            {hidden ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-blue-100 hover:scale-[1.02] transition-all active:scale-95"
                        >
                            <Plus size={18} /> Novo Lançamento
                        </button>
                    </div>
                </div>

                {/* KPI Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        title="Saldo Atual"
                        amount={summary?.balance || 0}
                        subtitle="Disponível em conta"
                        icon={Wallet}
                        colorClass="from-indigo-600 to-blue-500"
                        hidden={hidden}
                    />
                    <StatCard
                        title="Entradas (Mês)"
                        amount={summary?.total_income || 0}
                        subtitle="Receitas líquidas"
                        icon={ArrowDownRight}
                        colorClass="from-emerald-600 to-teal-500"
                        hidden={hidden}
                    />
                    <StatCard
                        title="Saídas (Mês)"
                        amount={summary?.total_expenses || 0}
                        subtitle="Despesas operacionais"
                        icon={ArrowUpRight}
                        colorClass="from-rose-600 to-pink-500"
                        hidden={hidden}
                    />
                </div>

                {/* Chart & DAS Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-10">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <TrendingUp size={24} className="text-blue-600" /> Histórico de Caixa
                            </h2>
                            <div className="flex bg-slate-50 p-1.5 rounded-xl border-slate-100">
                                <button className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase text-blue-600 bg-white border-slate-200 border-black/5 shadow-sm">Mensal</button>
                                <button className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase text-slate-400">Anual</button>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dx={-10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }}
                                    />
                                    <Bar dataKey="entradas" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={20} />
                                    <Bar dataKey="saidas" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-100 relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[5rem] pointer-events-none" />

                        <div>
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-white border-slate-200 border-black/5 shadow-sm/20 rounded-2xl backdrop-blur-md">
                                    <FileText size={24} />
                                </div>
                                <span className="bg-white border-slate-200 border-black/5 shadow-sm/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border-white/20">
                                    {dasMei?.status === 'paid' ? 'Liquidado' : 'Pendente'}
                                </span>
                            </div>
                            <h2 className="text-2xl font-black tracking-tight mb-2">Guia DAS (MEI)</h2>
                            <p className="text-indigo-100 text-xs font-semibold uppercase tracking-widest mb-6 px-1">Comp: 03/2026</p>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-sm font-bold opacity-60">R$</span>
                                <span className="text-4xl font-black tracking-tighter">{fmtBRL(75.60).replace('R$', '').trim()}</span>
                            </div>
                            <p className="text-xs font-bold text-indigo-200">Vencimento: 20/03/2026</p>
                        </div>
                        <div className="space-y-3 mt-10">
                            <button className="w-full bg-white text-blue-600 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-all">Pagar via Pix</button>
                            <button className="w-full bg-indigo-500/50 text-slate-900 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest border border-white/10 hover:bg-indigo-500/70 transition-all">Download PDF</button>

                        </div>
                    </div>
                </div>

                {/* Transactions Table Section */}
                <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Landmark size={24} className="text-blue-600" /> Movimentações Recentes
                        </h2>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por descrição..."
                                className="w-full bg-slate-50 border-slate-100 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-50 transition"
                                value={searchTx}
                                onChange={e => setSearchTx(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="text-left py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Status</th>
                                    <th className="text-left py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                                    <th className="text-left py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                                    <th className="text-right py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredTx.map(tx => (
                                    <tr key={tx.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="py-5 px-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-bold text-slate-400 uppercase">{fmtDate(tx.due_date)}</span>
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block w-max ${tx.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                                    }`}>
                                                    {tx.status === 'paid' ? 'Pago' : 'Pendente'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900">{tx.description}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-4 whitespace-nowrap">
                                            <span className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-xl">{tx.category || 'Geral'}</span>
                                        </td>
                                        <td className="py-5 px-4 text-right whitespace-nowrap">
                                            <span className={`text-sm font-black ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                {tx.type === 'income' ? '+' : '-'} {hidden ? 'R$ •••' : fmtBRL(tx.amount)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-8 flex justify-center">
                        <button className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline px-4 py-2 transition-all">Ver Relatório Completo</button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showModal && <NovoLancamentoModal onClose={() => setShowModal(false)} onSave={handleCreate} />}
            </AnimatePresence>
        </AppLayout>
    );
}
