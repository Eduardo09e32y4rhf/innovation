'use client';

import AppLayout from '@/components/AppLayout';
import {
    BadgeDollarSign, TrendingUp, CreditCard, Wallet,
    ArrowUpRight, ArrowDownRight, Download, Plus, X,
    Upload, ScanLine, Loader2, Filter, Search,
    CheckCircle2, Clock, AlertTriangle, ChevronDown,
    BarChart3, TrendingDown, Sparkles, RefreshCw,
    Receipt, FileText, AlertCircle, Calendar,
    DollarSign, Target, Zap, Eye, EyeOff
} from 'lucide-react';
import { useEffect, useState, useRef, useMemo } from 'react';
import { FinanceService, AIService } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface Transaction {
    id: number;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    status: 'paid' | 'pending' | 'overdue';
    due_date: string;
    category?: string;
    attachment_url?: string;
    ai_metadata?: string;
}

interface Summary {
    balance: number;
    total_income: number;
    total_expenses: number;
    pending_income: number;
    pending_expenses: number;
}

interface Anomaly {
    description: string;
    impact: string;
}

// ─── DUMMY CHART DATA ─────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const CATEGORIES = [
    'Salários', 'Marketing', 'Infraestrutura', 'Software', 'Vendas',
    'Serviços', 'Consultoria', 'Outros'
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
    `R$ ${(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const fmtShort = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
    return fmt(v);
};

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    paid: { label: 'Pago', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', icon: CheckCircle2 },
    pending: { label: 'Pendente', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', icon: Clock },
    overdue: { label: 'Atrasado', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', icon: AlertTriangle },
};

// ─── MINI BAR CHART ───────────────────────────────────────────────────────────
function MiniBarChart({ income, expenses }: { income: number[]; expenses: number[] }) {
    const maxVal = Math.max(...income, ...expenses, 1);
    const now = new Date().getMonth();
    return (
        <div className="flex items-end gap-1 h-24 w-full pt-2">
            {MONTHS.slice(0, now + 1).map((m, i) => (
                <div key={m} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full flex flex-col-reverse gap-0.5">
                        <div
                            className={`w-full rounded-t-sm transition-all duration-700 ${i === now ? 'bg-emerald-400' : 'bg-emerald-400/40'}`}
                            style={{ height: `${((income[i] ?? 0) / maxVal) * 72}px` }}
                            title={`Receita ${m}: ${fmtShort(income[i] ?? 0)}`}
                        />
                        <div
                            className={`w-full rounded-t-sm transition-all duration-700 ${i === now ? 'bg-red-400' : 'bg-red-400/30'}`}
                            style={{ height: `${((expenses[i] ?? 0) / maxVal) * 72}px` }}
                            title={`Despesa ${m}: ${fmtShort(expenses[i] ?? 0)}`}
                        />
                    </div>
                    <span className="text-[8px] text-purple-300/40">{m}</span>
                </div>
            ))}
        </div>
    );
}

// ─── PROGRESS RING ────────────────────────────────────────────────────────────
function ProgressRing({ pct, color, size = 60 }: { pct: number; color: string; size?: number }) {
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const fill = circ - (circ * Math.min(pct, 100)) / 100;
    return (
        <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(139,92,246,0.1)" strokeWidth={4} />
            <circle
                cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke={color} strokeWidth={4}
                strokeDasharray={circ} strokeDashoffset={fill}
                strokeLinecap="round"
                className="transition-all duration-1000"
            />
        </svg>
    );
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
function KpiCard({
    title, value, sub, icon: Icon, color, bg, trend, pct, delay = 0
}: {
    title: string; value: string; sub?: string; icon: React.ElementType;
    color: string; bg: string; trend?: 'up' | 'down' | null; pct?: number; delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className="glass-panel rounded-2xl p-5 relative overflow-hidden group hover:border-purple-500/40 transition-all duration-300"
        >
            {/* Glow */}
            <div className={`absolute -top-4 -right-4 w-24 h-24 rounded-full ${bg} blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className="relative z-10 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-purple-300/50 font-medium uppercase tracking-widest mb-1">{title}</p>
                    <p className={`text-2xl font-black ${color} leading-none mb-1`}>{value}</p>
                    {sub && <p className="text-[11px] text-purple-300/40">{sub}</p>}
                    {trend && (
                        <div className={`flex items-center gap-1 mt-2 ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            <span className="text-[10px] font-bold">{pct?.toFixed(1)}% vs. mês anterior</span>
                        </div>
                    )}
                </div>
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
            </div>
        </motion.div>
    );
}

// ─── TRANSACTION MODAL ────────────────────────────────────────────────────────
function TransactionModal({
    onClose,
    onSave,
}: {
    onClose: () => void;
    onSave: (data: Partial<Transaction>) => Promise<void>;
}) {
    const [form, setForm] = useState({
        description: '', amount: '', type: 'income',
        due_date: new Date().toISOString().split('T')[0],
        category: 'Outros', status: 'pending'
    });
    const [isScanning, setIsScanning] = useState(false);
    const [saving, setSaving] = useState(false);
    const [scanned, setScanned] = useState(false);

    const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsScanning(true);
        try {
            const data = await AIService.parseReceipt(file);
            setForm(prev => ({
                ...prev,
                description: data.supplier || prev.description,
                amount: data.amount?.toString() || prev.amount,
                type: data.category?.toLowerCase().includes('receita') ? 'income' : 'expense',
                due_date: data.date || prev.due_date,
            }));
            setScanned(true);
        } catch {
            // silently fallback
        } finally {
            setIsScanning(false);
        }
    };

    const handleSubmit = async () => {
        if (!form.description || !form.amount) return;
        setSaving(true);
        try {
            await onSave({
                description: form.description,
                amount: parseFloat(form.amount),
                type: form.type as 'income' | 'expense',
                due_date: form.due_date,
                category: form.category,
                status: form.status as 'paid' | 'pending' | 'overdue',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={{ type: 'spring', damping: 20 }}
                className="bg-[#0a0a18] border border-purple-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-purple-500/10"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-white">Nova Transação</h3>
                        <p className="text-[11px] text-purple-300/40 mt-0.5">Registrar entrada ou saída de caixa</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-purple-500/10 text-purple-300/40 hover:text-white transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* OCR Drop Zone */}
                <div className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center mb-4 transition-all cursor-pointer group min-h-[90px]
          ${scanned ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-purple-500/20 hover:border-purple-500/50 bg-purple-500/5 hover:bg-purple-500/10'}`}>
                    {isScanning ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                            <span className="text-xs text-purple-300 font-medium animate-pulse">Gemini Vision extraindo dados...</span>
                        </div>
                    ) : scanned ? (
                        <div className="flex flex-col items-center gap-1">
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                            <span className="text-xs text-emerald-400 font-bold">Dados extraídos pela IA!</span>
                            <span className="text-[10px] text-emerald-400/60">Revise e confirme abaixo</span>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                <ScanLine className="w-4 h-4 text-purple-400" />
                            </div>
                            <span className="text-xs text-purple-300/60 text-center">
                                Arraste um <strong className="text-purple-300">comprovante / nota fiscal</strong>
                            </span>
                            <span className="text-[10px] text-purple-300/30 mt-0.5">A IA preenche o formulário automaticamente</span>
                            <input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleOCR} />
                        </>
                    )}
                </div>

                {/* Type Toggle */}
                <div className="flex gap-2 mb-4">
                    {['income', 'expense'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setForm(f => ({ ...f, type: t }))}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${form.type === t
                                ? t === 'income'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/40'
                                : 'bg-purple-500/5 text-purple-300/40 border border-purple-500/10 hover:border-purple-500/30'}`}
                        >
                            {t === 'income' ? '↑ Dinheiro Entrando' : '↓ Dinheiro Saindo'}
                        </button>
                    ))}
                </div>

                {/* Fields */}
                <div className="space-y-3">
                    <input
                        className="w-full bg-purple-500/5 border border-purple-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-500/60 transition"
                        placeholder="Descrição (ex: Assinatura Notion)"
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    />
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300/40 text-sm font-bold">R$</span>
                            <input
                                className="w-full bg-purple-500/5 border border-purple-500/20 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-500/60 transition"
                                placeholder="0,00"
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.amount}
                                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                            />
                        </div>
                        <input
                            className="bg-purple-500/5 border border-purple-500/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/60 transition"
                            type="date"
                            value={form.due_date}
                            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                        />
                    </div>

                    <div className="flex gap-2">
                        <select
                            className="flex-1 bg-purple-500/5 border border-purple-500/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/60 transition appearance-none"
                            value={form.category}
                            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                        >
                            {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0a0a18]">{c}</option>)}
                        </select>
                        <select
                            className="flex-1 bg-purple-500/5 border border-purple-500/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/60 transition appearance-none"
                            value={form.status}
                            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                        >
                            <option value="pending" className="bg-[#0a0a18]">Pendente</option>
                            <option value="paid" className="bg-[#0a0a18]">Pago</option>
                            <option value="overdue" className="bg-[#0a0a18]">Atrasado</option>
                        </select>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={saving || !form.description || !form.amount}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {saving ? 'Salvando...' : 'Registrar Transação'}
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
    const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [chartView, setChartView] = useState<'month' | 'week'>('month');
    const [refreshing, setRefreshing] = useState(false);
    const [hideValues, setHideValues] = useState(false);
    const now = new Date();

    // Simulated chart data based on summary
    const chartIncome = useMemo(() => {
        const base = summary ? summary.total_income / (now.getMonth() + 1) : 15000;
        return MONTHS.map((_, i) => i <= now.getMonth() ? base * (0.7 + Math.random() * 0.6) : 0);
    }, [summary, now]);

    const chartExpenses = useMemo(() => {
        const base = summary ? summary.total_expenses / (now.getMonth() + 1) : 9000;
        return MONTHS.map((_, i) => i <= now.getMonth() ? base * (0.6 + Math.random() * 0.7) : 0);
    }, [summary, now]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setRefreshing(true);
        try {
            const [s, a, t] = await Promise.all([
                FinanceService.getSummary().catch(() => ({
                    balance: 0, total_income: 0, total_expenses: 0,
                    pending_income: 0, pending_expenses: 0
                })),
                FinanceService.getAnomalies().catch(() => []),
                FinanceService.getTransactions().catch(() => []),
            ]);
            setSummary(s);
            setAnomalies(a);
            setTransactions(t);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleCreate = async (data: Partial<Transaction>) => {
        const tx = await FinanceService.createTransaction({
            description: data.description!,
            amount: data.amount!,
            type: data.type!,
            due_date: data.due_date!,
        });
        setTransactions(prev => [tx, ...prev]);
        setShowModal(false);
        loadData();
    };

    // Filtered transactions
    const filtered = useMemo(() => {
        return transactions.filter(tx => {
            const matchSearch = tx.description.toLowerCase().includes(search.toLowerCase());
            const matchType = filterType === 'all' || tx.type === filterType;
            const matchStatus = filterStatus === 'all' || tx.status === filterStatus;
            return matchSearch && matchType && matchStatus;
        });
    }, [transactions, search, filterType, filterStatus]);

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(t => t.id)));
        }
    };

    const mask = (v: string) => hideValues ? 'R$ ••••••' : v;

    const expenseRatio = summary && summary.total_income > 0
        ? (summary.total_expenses / summary.total_income) * 100
        : 0;

    const kpis = [
        {
            title: 'Saldo Atual',
            value: mask(fmt(summary?.balance ?? 0)),
            sub: 'Caixa disponível',
            icon: Wallet,
            color: (summary?.balance ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400',
            bg: (summary?.balance ?? 0) >= 0 ? 'bg-emerald-400/10' : 'bg-red-400/10',
            trend: 'up' as 'up',
            pct: 12.4,
            delay: 0
        },
        {
            title: 'MRR (Receita)',
            value: mask(fmt(summary?.total_income ?? 0)),
            sub: `${now.toLocaleString('pt-BR', { month: 'long' })} corrente`,
            icon: TrendingUp,
            color: 'text-green-400',
            bg: 'bg-green-400/10',
            trend: 'up' as 'up',
            pct: 8.2,
            delay: 0.05
        },
        {
            title: 'Despesas Pagas',
            value: mask(fmt(summary?.total_expenses ?? 0)),
            sub: `${expenseRatio.toFixed(0)}% da receita`,
            icon: CreditCard,
            color: 'text-red-400',
            bg: 'bg-red-400/10',
            trend: 'down' as 'down',
            pct: 3.1,
            delay: 0.1
        },
        {
            title: 'A Receber',
            value: mask(fmt(summary?.pending_income ?? 0)),
            sub: 'Próximos 7 dias',
            icon: BadgeDollarSign,
            color: 'text-purple-400',
            bg: 'bg-purple-400/10',
            trend: null,
            pct: 0,
            delay: 0.15
        },
    ];

    return (
        <AppLayout title="Gestão Financeira">
            <div className="p-4 sm:p-6 xl:p-8 space-y-6 text-white min-h-screen">

                {/* ── HEADER ── */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-[10px] text-purple-300/40 uppercase tracking-widest font-medium">Módulo Financeiro</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
                            Gestão Financeira
                        </h1>
                        <p className="text-purple-300/40 text-sm mt-0.5">
                            Fluxo de caixa em tempo real · {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setHideValues(v => !v)}
                            className="p-2.5 rounded-xl text-purple-300/40 hover:text-white hover:bg-purple-500/10 border border-purple-500/10 transition-all"
                            title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
                        >
                            {hideValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={loadData}
                            disabled={refreshing}
                            className="p-2.5 rounded-xl text-purple-300/40 hover:text-white hover:bg-purple-500/10 border border-purple-500/10 transition-all"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl text-sm text-purple-300 transition-all">
                            <Download className="w-4 h-4" /> Exportar
                        </button>
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all"
                        >
                            <Plus className="w-4 h-4" /> Nova Transação
                        </button>
                    </div>
                </motion.div>

                {/* ── ANOMALY ALERTS ── */}
                <AnimatePresence>
                    {anomalies.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-yellow-500/5 border border-yellow-500/30 rounded-2xl p-4"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-yellow-400" />
                                <span className="text-yellow-400 font-bold text-sm">Inteligência Financeira · Anomalias Detectadas</span>
                            </div>
                            <div className="space-y-1">
                                {anomalies.map((a, i) => (
                                    <div key={i} className="flex items-start gap-2 text-sm text-yellow-300/70">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-yellow-400/60" />
                                        <span><strong className="text-yellow-300">{a.impact}:</strong> {a.description}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── KPI CARDS ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {kpis.map((k, i) => (
                        <KpiCard key={i} {...k} />
                    ))}
                </div>

                {/* ── CHARTS ROW ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* Fluxo de Caixa */}
                    <div className="lg:col-span-2 glass-panel rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-white text-sm">Fluxo de Caixa</h3>
                                <p className="text-[10px] text-purple-300/40 mt-0.5">Receitas vs. Despesas por período</p>
                            </div>
                            <div className="flex gap-1 bg-purple-500/5 border border-purple-500/10 rounded-lg p-0.5">
                                {(['month', 'week'] as const).map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setChartView(v)}
                                        className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${chartView === v
                                            ? 'bg-purple-500/20 text-purple-300'
                                            : 'text-purple-300/30 hover:text-purple-300/60'}`}
                                    >
                                        {v === 'month' ? 'Mensal' : 'Semanal'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-4 mb-3">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-sm bg-emerald-400" />
                                <span className="text-[10px] text-purple-300/40">Receita</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-sm bg-red-400" />
                                <span className="text-[10px] text-purple-300/40">Despesa</span>
                            </div>
                        </div>
                        {loading ? (
                            <div className="h-24 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-purple-400/40" />
                            </div>
                        ) : (
                            <MiniBarChart income={chartIncome} expenses={chartExpenses} />
                        )}
                    </div>

                    {/* Saúde Financeira */}
                    <div className="glass-panel rounded-2xl p-5 flex flex-col">
                        <div className="mb-4">
                            <h3 className="font-bold text-white text-sm">Saúde Financeira</h3>
                            <p className="text-[10px] text-purple-300/40 mt-0.5">Indicadores do mês</p>
                        </div>
                        <div className="flex-1 space-y-4">
                            {/* Burn Rate */}
                            <div className="flex items-center gap-3">
                                <ProgressRing
                                    pct={expenseRatio}
                                    color={expenseRatio > 80 ? '#f87171' : expenseRatio > 60 ? '#facc15' : '#34d399'}
                                    size={52}
                                />
                                <div>
                                    <p className="text-xs font-bold text-white">{expenseRatio.toFixed(0)}%</p>
                                    <p className="text-[10px] text-purple-300/40">Burn Rate</p>
                                    <p className="text-[9px] text-purple-300/30">Despesas / Receita</p>
                                </div>
                            </div>
                            <div className="w-full h-px bg-purple-500/10" />
                            {[
                                { label: 'Liquidez', value: summary ? (summary.balance / Math.max(summary.total_expenses, 1)).toFixed(1) + 'x' : '—', ok: true },
                                { label: 'Inadimplência', value: transactions.filter(t => t.status === 'overdue').length.toString() + ' itens', ok: transactions.filter(t => t.status === 'overdue').length === 0 },
                                { label: 'A Pagar', value: mask(fmt(summary?.pending_expenses ?? 0)), ok: null },
                            ].map(item => (
                                <div key={item.label} className="flex items-center justify-between">
                                    <span className="text-[11px] text-purple-300/50">{item.label}</span>
                                    <span className={`text-[11px] font-bold ${item.ok === true ? 'text-emerald-400' : item.ok === false ? 'text-red-400' : 'text-yellow-400'}`}>
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-purple-500/10">
                            <div className="flex items-center gap-2 text-purple-300/30">
                                <Zap className="w-3 h-3" />
                                <span className="text-[9px]">Previsão IA · 3 meses disponível</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── TRANSACTIONS TABLE ── */}
                <div className="glass-panel rounded-2xl overflow-hidden">
                    {/* Table Header */}
                    <div className="p-5 border-b border-purple-500/10">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div>
                                <h3 className="font-bold text-white text-sm">Lançamentos</h3>
                                <p className="text-[10px] text-purple-300/40 mt-0.5">{filtered.length} registros encontrados</p>
                            </div>
                            <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:justify-end">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-300/30" />
                                    <input
                                        className="w-full sm:w-48 bg-purple-500/5 border border-purple-500/15 rounded-xl pl-8 pr-3 py-2 text-[12px] text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-500/50 transition"
                                        placeholder="Buscar transações..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>
                                {/* Filters */}
                                <div className="flex gap-1 bg-purple-500/5 border border-purple-500/10 rounded-xl p-0.5">
                                    {(['all', 'income', 'expense'] as const).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setFilterType(t)}
                                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${filterType === t
                                                ? 'bg-purple-500/20 text-purple-300'
                                                : 'text-purple-300/30 hover:text-purple-300/60'}`}
                                        >
                                            {t === 'all' ? 'Todos' : t === 'income' ? '↑ Entrada' : '↓ Saída'}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-1 bg-purple-500/5 border border-purple-500/10 rounded-xl p-0.5">
                                    {(['all', 'paid', 'pending', 'overdue'] as const).map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setFilterStatus(s)}
                                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${filterStatus === s
                                                ? 'bg-purple-500/20 text-purple-300'
                                                : 'text-purple-300/30 hover:text-purple-300/60'}`}
                                        >
                                            {s === 'all' ? 'Status' : statusConfig[s]?.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Bulk actions */}
                        <AnimatePresence>
                            {selectedIds.size > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2.5"
                                >
                                    <span className="text-xs text-purple-300 font-bold">{selectedIds.size} selecionados</span>
                                    <div className="w-px h-4 bg-purple-500/20" />
                                    <button className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Marcar como Pago
                                    </button>
                                    <button className="text-[11px] text-purple-300/50 hover:text-purple-300 font-medium transition-colors flex items-center gap-1">
                                        <Download className="w-3 h-3" /> Exportar
                                    </button>
                                    <button
                                        onClick={() => setSelectedIds(new Set())}
                                        className="ml-auto text-[11px] text-purple-300/30 hover:text-purple-300 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-purple-500/10">
                                    <th className="px-5 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            className="accent-purple-500 cursor-pointer"
                                            checked={selectedIds.size === filtered.length && filtered.length > 0}
                                            onChange={selectAll}
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-[10px] text-purple-300/40 uppercase tracking-widest font-medium">Descrição</th>
                                    <th className="px-4 py-3 text-left text-[10px] text-purple-300/40 uppercase tracking-widest font-medium hidden md:table-cell">Categoria</th>
                                    <th className="px-4 py-3 text-left text-[10px] text-purple-300/40 uppercase tracking-widest font-medium hidden sm:table-cell">Vencimento</th>
                                    <th className="px-4 py-3 text-left text-[10px] text-purple-300/40 uppercase tracking-widest font-medium">Status</th>
                                    <th className="px-4 py-3 text-right text-[10px] text-purple-300/40 uppercase tracking-widest font-medium">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="border-b border-purple-500/5">
                                            {Array.from({ length: 6 }).map((_, j) => (
                                                <td key={j} className="px-4 py-4">
                                                    <div className="h-3 bg-purple-500/10 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center gap-3 opacity-30">
                                                <Receipt className="w-12 h-12" />
                                                <p className="text-sm font-medium">Nenhuma transação encontrada</p>
                                                <p className="text-xs">Ajuste os filtros ou adicione uma nova transação</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((tx, i) => {
                                        const sc = statusConfig[tx.status] ?? statusConfig.pending;
                                        const StatusIcon = sc.icon;
                                        const isSelected = selectedIds.has(tx.id);
                                        return (
                                            <motion.tr
                                                key={tx.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                className={`border-b border-purple-500/5 hover:bg-purple-500/5 transition-colors cursor-pointer group ${isSelected ? 'bg-purple-500/10' : ''}`}
                                                onClick={() => toggleSelect(tx.id)}
                                            >
                                                <td className="px-5 py-4">
                                                    <input
                                                        type="checkbox"
                                                        className="accent-purple-500 cursor-pointer"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelect(tx.id)}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-emerald-400/10' : 'bg-red-400/10'}`}>
                                                            {tx.type === 'income'
                                                                ? <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                                                                : <ArrowDownRight className="w-4 h-4 text-red-400" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-white">{tx.description}</p>
                                                            {tx.attachment_url && (
                                                                <span className="text-[9px] text-blue-400 flex items-center gap-0.5 mt-0.5">
                                                                    <FileText className="w-2.5 h-2.5" /> Comprovante
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 hidden md:table-cell">
                                                    <span className="text-[11px] text-purple-300/50 bg-purple-500/5 px-2 py-1 rounded-lg">
                                                        {tx.category ?? 'Outros'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 hidden sm:table-cell">
                                                    <div className="flex items-center gap-1.5 text-purple-300/40">
                                                        <Calendar className="w-3 h-3" />
                                                        <span className="text-[11px]">
                                                            {tx.due_date ? new Date(tx.due_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${sc.bg} ${sc.color}`}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {sc.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <span className={`text-sm font-black ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {tx.type === 'income' ? '+' : '−'} {mask(fmt(tx.amount))}
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals footer */}
                    {filtered.length > 0 && !loading && (
                        <div className="px-5 py-3 border-t border-purple-500/10 flex flex-wrap gap-4 items-center justify-end">
                            <span className="text-[11px] text-purple-300/40">
                                Entradas: <strong className="text-emerald-400">
                                    {mask(fmt(filtered.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0)))}
                                </strong>
                            </span>
                            <span className="text-[11px] text-purple-300/40">
                                Saídas: <strong className="text-red-400">
                                    {mask(fmt(filtered.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0)))}
                                </strong>
                            </span>
                            <span className="text-[11px] text-purple-300/40">
                                Saldo filtrado: <strong className="text-white">
                                    {mask(fmt(
                                        filtered.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0) -
                                        filtered.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0)
                                    ))}
                                </strong>
                            </span>
                        </div>
                    )}
                </div>

                {/* ── IA PREVIEW CARD ── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass-panel rounded-2xl p-5 border-purple-500/20 relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
                    <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center shrink-0">
                            <Sparkles className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-white text-sm mb-0.5">Previsão de Fluxo de Caixa via IA</h4>
                            <p className="text-[11px] text-purple-300/50">
                                Com base no histórico, a IA pode projetar o caixa dos próximos 3 meses e alertar sobre riscos de saldo negativo.
                            </p>
                        </div>
                        <button
                            onClick={() => FinanceService.getPrediction().catch(() => { })}
                            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-sm font-bold text-purple-300 transition-all shrink-0"
                        >
                            <Target className="w-4 h-4" /> Gerar Previsão
                        </button>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                        {['Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                            <div key={m} className="bg-purple-500/5 rounded-xl p-3 border border-purple-500/10">
                                <p className="text-[10px] text-purple-300/40 mb-1">{m}</p>
                                <p className="text-sm font-black text-purple-300/20">•••••</p>
                                <p className="text-[9px] text-purple-300/20 mt-0.5">Ative para ver</p>
                            </div>
                        ))}
                    </div>
                </motion.div>

            </div>

            {/* ── MODAL ── */}
            <AnimatePresence>
                {showModal && (
                    <TransactionModal
                        onClose={() => setShowModal(false)}
                        onSave={handleCreate}
                    />
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
