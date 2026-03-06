'use client';

import AppLayout from '@/components/AppLayout';
import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowUpRight, ArrowDownRight, Search, Download, Plus, Landmark,
    FileText, AlertCircle, Calendar, CheckCircle2, Copy, Wallet,
    TrendingUp, X, Loader2, RefreshCw, AlertTriangle, Clock,
    ArrowUpCircle, ArrowDownCircle, Eye, EyeOff
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import { FinanceService } from '@/services/api';
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
    title, amount, subtitle, icon: Icon, color, bg, hidden
}: {
    title: string; amount: number; subtitle: string;
    icon: React.ElementType; color: string; bg: string; hidden?: boolean;
}) {
    return (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="absolute -right-6 -top-6 opacity-10 transition-transform group-hover:scale-110">
                <Icon size={120} className={color} />
            </div>
            <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${bg}`}>
                    <Icon size={22} className={color} />
                </div>
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{title}</h3>
                <p className="text-2xl font-black text-white tracking-tight">
                    {hidden ? 'R$ ••••••' : fmtBRL(amount)}
                </p>
                <p className="text-xs text-slate-500 mt-2 font-medium">{subtitle}</p>
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}>
            <motion.div initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 20 }}
                transition={{ type: 'spring', damping: 22 }}
                className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-800">
                    <h3 className="text-lg font-black text-white">Novo Lançamento</h3>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {/* Tipo */}
                    <div className="flex gap-2 bg-slate-950 rounded-2xl p-1 border border-slate-800">
                        {(['income', 'expense'] as const).map(t => (
                            <button key={t} onClick={() => handleTypeChange(t)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${type === t
                                    ? t === 'income'
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900'
                                        : 'bg-rose-600 text-white shadow-lg shadow-rose-900'
                                    : 'text-slate-400 hover:text-slate-200'}`}>
                                {t === 'income' ? <><ArrowDownRight size={16} /> Entrada</> : <><ArrowUpRight size={16} /> Saída</>}
                            </button>
                        ))}
                    </div>

                    {/* Descrição */}
                    <div>
                        <label className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5 block">Descrição *</label>
                        <input
                            className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                            placeholder="Ex: Pix Recebido - Cliente, Aluguel..."
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            autoFocus
                        />
                    </div>

                    {/* Valor + Data */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5 block">Valor *</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">R$</span>
                                <input
                                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-9 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                                    placeholder="0,00" type="number" min="0.01" step="0.01"
                                    value={form.amount}
                                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5 block">Data</label>
                            <input
                                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                                type="date" value={form.due_date}
                                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Categoria + Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5 block">Categoria</label>
                            <select
                                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                                value={form.category}
                                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                {cats.map(c => <option key={c} value={c} className="bg-slate-950">{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5 block">Status</label>
                            <select
                                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                                value={form.status}
                                onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                                <option value="paid" className="bg-slate-950">Liquidado</option>
                                <option value="pending" className="bg-slate-950">Pendente</option>
                                <option value="overdue" className="bg-slate-950">Vencido</option>
                            </select>
                        </div>
                    </div>

                    {type === 'expense' && (
                        <div>
                            <label className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5 block">Imposto (opcional)</label>
                            <input
                                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                                placeholder="DAS, INSS, FGTS, ISS..."
                                value={form.tax_type}
                                onChange={e => setForm(f => ({ ...f, tax_type: e.target.value }))}
                            />
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 bg-rose-900/40 border border-rose-500/30 rounded-xl px-4 py-2.5 text-sm text-rose-300">
                            <AlertCircle size={15} className="shrink-0" /> {error}
                        </div>
                    )}

                    <button
                        onClick={handleSubmit} disabled={saving}
                        className={`w-full py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${type === 'income'
                            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900'
                            : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900'}`}>
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {saving ? 'Salvando...' : type === 'income' ? 'Confirmar Entrada' : 'Confirmar Saída'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── URGENCY STATUS CONFIG ────────────────────────────────────────────────────
const urgencyOf = (tx: Transaction): 'critica' | 'alta' | 'normal' => {
    if (tx.status === 'overdue') return 'critica';
    const d = new Date(tx.due_date + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((d.getTime() - today.getTime()) / 86_400_000);
    if (diff <= 1) return 'alta';
    return 'normal';
};

const urgencyLabel = (tx: Transaction): string => {
    if (tx.status === 'overdue') return 'Atrasado';
    const d = new Date(tx.due_date + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((d.getTime() - today.getTime()) / 86_400_000);
    if (diff === 0) return 'Vence Hoje';
    if (diff < 0) return 'Atrasado';
    if (diff <= 3) return `Vence em ${diff}d`;
    return 'A Vencer';
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function FinancePage() {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [searchTx, setSearchTx] = useState('');
    const [hidden, setHidden] = useState(false);

    const now = new Date();
    const monthName = now.toLocaleString('pt-BR', { month: 'long' });
    const year = now.getFullYear();

    // ── Data loading ───────────────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        setRefreshing(true);
        try {
            const [s, t] = await Promise.all([
                FinanceService.getSummary().catch(() => ({
                    balance: 0, total_income: 0, total_expenses: 0,
                    pending_income: 0, pending_expenses: 0
                })),
                FinanceService.getTransactions().catch(() => []),
            ]);
            setSummary(s);
            setTransactions(Array.isArray(t) ? t : []);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleCreate = async (data: any) => {
        await FinanceService.createTransaction(data);
        setShowModal(false);
        await loadData();
    };

    // ── Derived data ───────────────────────────────────────────────────────────
    const incomeList = transactions.filter(t => t.type === 'income');
    const expenseList = transactions.filter(t => t.type === 'expense');
    const pendingExpenses = expenseList.filter(t => t.status !== 'paid')
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 5);

    const filteredTx = transactions.filter(tx =>
        tx.description.toLowerCase().includes(searchTx.toLowerCase()) ||
        (tx.category ?? '').toLowerCase().includes(searchTx.toLowerCase())
    ).slice(0, 12);

    // Build monthly chart (last 6 months)
    const chartData = (() => {
        const months: { name: string; entradas: number; saidas: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mn = MONTHS_PT[d.getMonth()];
            const mo = d.getMonth();
            const yr = d.getFullYear();
            const inc = transactions
                .filter(t => t.type === 'income' && new Date(t.due_date).getMonth() === mo && new Date(t.due_date).getFullYear() === yr)
                .reduce((a, b) => a + b.amount, 0);
            const exp = transactions
                .filter(t => t.type === 'expense' && new Date(t.due_date).getMonth() === mo && new Date(t.due_date).getFullYear() === yr)
                .reduce((a, b) => a + b.amount, 0);
            months.push({ name: mn, entradas: parseFloat(inc.toFixed(2)), saidas: parseFloat(exp.toFixed(2)) });
        }
        return months;
    })();

    // Das MEI - calculate next due date (20th of current month)
    const dasDue = new Date(now.getFullYear(), now.getMonth(), 20);
    const dasDiff = Math.ceil((dasDue.getTime() - now.getTime()) / 86_400_000);
    const dasOverdue = dasDiff < 0;

    const mask = (v: string) => hidden ? 'R$ ••••••' : v;

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <AppLayout title="Financeiro">
            <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">

                {/* ── HEADER ────────────────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <Landmark className="text-indigo-400" size={28} />
                            Financeiro
                        </h1>
                        <p className="text-slate-500 text-sm font-medium mt-1.5">
                            Visão completa do caixa · {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {year}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button onClick={() => setHidden(v => !v)}
                            className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:border-slate-600 transition-all"
                            title={hidden ? 'Mostrar valores' : 'Ocultar valores'}>
                            {hidden ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                        <button onClick={loadData} disabled={refreshing}
                            className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:border-slate-600 transition-all">
                            <RefreshCw size={17} className={refreshing ? 'animate-spin text-indigo-400' : ''} />
                        </button>
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex-1 md:flex-none justify-center flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-900 transition-all">
                            <Plus size={17} /> Novo Lançamento
                        </button>
                    </div>
                </div>

                {/* ── KPI CARDS ─────────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    {loading ? (
                        [0, 1, 2].map(i => (
                            <div key={i} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-36 animate-pulse" />
                        ))
                    ) : (
                        <>
                            <StatCard
                                title="Saldo em Caixa"
                                amount={summary?.balance ?? 0}
                                subtitle={`A receber: ${mask(fmtBRL(summary?.pending_income ?? 0))}`}
                                icon={Wallet}
                                color={(summary?.balance ?? 0) >= 0 ? 'text-indigo-400' : 'text-rose-400'}
                                bg={(summary?.balance ?? 0) >= 0 ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-rose-500/10 border border-rose-500/20'}
                                hidden={hidden}
                            />
                            <StatCard
                                title={`Entradas (${monthName})`}
                                amount={summary?.total_income ?? 0}
                                subtitle={`${incomeList.length} lançamentos de receita`}
                                icon={ArrowDownRight}
                                color="text-emerald-400"
                                bg="bg-emerald-500/10 border border-emerald-500/20"
                                hidden={hidden}
                            />
                            <StatCard
                                title={`Saídas (${monthName})`}
                                amount={summary?.total_expenses ?? 0}
                                subtitle={`A pagar: ${mask(fmtBRL(summary?.pending_expenses ?? 0))}`}
                                icon={ArrowUpRight}
                                color="text-rose-400"
                                bg="bg-rose-500/10 border border-rose-500/20"
                                hidden={hidden}
                            />
                        </>
                    )}
                </div>

                {/* ── CHART + DAS MEI ───────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">

                    {/* Bar Chart */}
                    <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <TrendingUp className="text-indigo-400" size={18} />
                                Entradas vs Saídas — Últimos 6 meses
                            </h2>
                        </div>
                        {loading ? (
                            <div className="h-[220px] flex items-center justify-center">
                                <Loader2 size={24} className="animate-spin text-slate-600" />
                            </div>
                        ) : (
                            <div className="h-[220px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false}
                                            tick={{ fill: '#475569', fontSize: 11 }} />
                                        <YAxis axisLine={false} tickLine={false}
                                            tick={{ fill: '#475569', fontSize: 11 }}
                                            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val)} />
                                        <Tooltip
                                            cursor={{ fill: '#1e293b', opacity: 0.6 }}
                                            contentStyle={{
                                                backgroundColor: '#0f172a',
                                                border: '1px solid #1e293b',
                                                borderRadius: '12px',
                                                color: '#fff',
                                                fontSize: '12px'
                                            }}
                                            formatter={(value: number) => [fmtBRL(value), '']}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
                                        <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[5, 5, 0, 0]} barSize={18} />
                                        <Bar dataKey="saidas" name="Saídas" fill="#f43f5e" radius={[5, 5, 0, 0]} barSize={18} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* DAS MEI Card */}
                    <div className="bg-gradient-to-b from-indigo-950/80 to-slate-900 border border-indigo-500/25 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/10 rounded-bl-[90px] pointer-events-none" />
                        <div>
                            <div className="flex justify-between items-start mb-3">
                                <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-500/30">
                                    <FileText size={22} />
                                </div>
                                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full flex items-center gap-1 border ${dasOverdue
                                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                    : dasDiff <= 5
                                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                                    <AlertCircle size={12} />
                                    {dasOverdue ? 'Vencido' : dasDiff <= 5 ? 'Urgente' : 'Em Dia'}
                                </span>
                            </div>
                            <h2 className="text-lg font-bold text-white mt-3">Guia DAS (MEI)</h2>
                            <p className="text-slate-400 text-sm">Competência: {monthName}/{year}</p>
                            <p className="text-3xl font-black text-white tracking-tighter mt-3 mb-1">R$ 75,60</p>
                            <p className={`text-xs font-bold mb-5 ${dasOverdue ? 'text-rose-400' : 'text-slate-400'}`}>
                                Vence: {dasDue.toLocaleDateString('pt-BR')}
                                {!dasOverdue && dasDiff >= 0 && ` · ${dasDiff}d restantes`}
                                {dasOverdue && ' · ATRASADO'}
                            </p>
                        </div>
                        <div className="space-y-2.5">
                            <button className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-900">
                                Pagar via Pix
                            </button>
                            <button className="w-full flex items-center justify-center gap-2 py-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-2xl font-bold text-sm transition-all">
                                <Copy size={15} /> Copiar Código de Barras
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── CONTAS A PAGAR + EXTRATO ──────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                    {/* Radar de contas a pagar */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <Calendar className="text-amber-400" size={18} /> Contas a Pagar
                            </h2>
                            <span className="text-xs text-slate-500 font-medium">{pendingExpenses.length} pendentes</span>
                        </div>

                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-16 bg-slate-800 rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : pendingExpenses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <CheckCircle2 size={36} className="text-emerald-400 mb-3 opacity-60" />
                                <p className="text-sm font-bold text-slate-300">Tudo em dia!</p>
                                <p className="text-xs text-slate-500 mt-1">Nenhuma conta pendente no momento.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingExpenses.map(tx => {
                                    const urg = urgencyOf(tx);
                                    const label = urgencyLabel(tx);
                                    return (
                                        <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-slate-700 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-1.5 h-10 rounded-full ${urg === 'critica' ? 'bg-rose-500' : urg === 'alta' ? 'bg-amber-400' : 'bg-slate-600'}`} />
                                                <div>
                                                    <p className="font-bold text-slate-200 text-sm leading-tight">{tx.description}</p>
                                                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                                                        Vence: {fmtDate(tx.due_date)} {tx.category ? `· ${tx.category}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-3">
                                                <p className="font-black text-white text-sm">{mask(fmtBRL(tx.amount))}</p>
                                                <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${urg === 'critica' ? 'text-rose-400' : urg === 'alta' ? 'text-amber-400' : 'text-slate-500'}`}>
                                                    {label}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <button
                            onClick={() => setShowModal(true)}
                            className="w-full mt-4 py-3 border border-dashed border-slate-700 text-slate-500 hover:text-white hover:border-slate-500 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                            <Plus size={15} /> Agendar Novo Pagamento
                        </button>
                    </div>

                    {/* Extrato / Movimentações */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-base font-bold text-white">Últimas Movimentações</h2>
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-1.5 flex items-center gap-1">
                                <Search size={14} className="text-slate-500 ml-0.5" />
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    className="bg-transparent border-none outline-none text-xs w-24 text-white placeholder-slate-600"
                                    value={searchTx}
                                    onChange={e => setSearchTx(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 space-y-1 overflow-y-auto max-h-80 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="h-14 bg-slate-800 rounded-xl animate-pulse mb-2" />
                                ))
                            ) : filteredTx.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <FileText size={32} className="text-slate-600 mb-2" />
                                    <p className="text-sm text-slate-500">
                                        {searchTx ? 'Nenhum resultado.' : 'Nenhuma movimentação ainda.'}
                                    </p>
                                    {!searchTx && (
                                        <button onClick={() => setShowModal(true)}
                                            className="mt-3 text-xs text-indigo-400 font-bold hover:text-indigo-300">
                                            + Adicionar primeiro lançamento
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredTx.map(tx => (
                                    <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-slate-800/60 rounded-xl transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                {tx.type === 'income'
                                                    ? <ArrowDownRight size={15} />
                                                    : <ArrowUpRight size={15} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-200 leading-tight">{tx.description}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {fmtDate(tx.due_date)}
                                                    {tx.category ? ` · ${tx.category}` : ''}
                                                    {' · '}
                                                    <span className={`font-semibold ${tx.status === 'paid' ? 'text-emerald-500' : tx.status === 'overdue' ? 'text-rose-400' : 'text-amber-400'}`}>
                                                        {tx.status === 'paid' ? 'Liquidado' : tx.status === 'overdue' ? 'Vencido' : 'Pendente'}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                        <p className={`font-black text-sm shrink-0 ml-3 ${tx.type === 'income' ? 'text-emerald-400' : 'text-slate-300'}`}>
                                            {tx.type === 'income' ? '+' : '−'} {mask(fmtBRL(tx.amount))}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Summary footer */}
                        {filteredTx.length > 0 && !loading && (
                            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                                <span>
                                    Entradas: <strong className="text-emerald-400">{mask(fmtBRL(filteredTx.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0)))}</strong>
                                    {' '}· Saídas: <strong className="text-rose-400">{mask(fmtBRL(filteredTx.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0)))}</strong>
                                </span>
                                <button className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 rounded-xl font-bold transition-all">
                                    <Download size={13} /> Exportar
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* ── MODAL ──────────────────────────────────────────────────────── */}
            <AnimatePresence>
                {showModal && (
                    <NovoLancamentoModal onClose={() => setShowModal(false)} onSave={handleCreate} />
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
