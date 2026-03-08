'use client';

import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Briefcase, DollarSign, Clock as ClockIcon,
    MessageSquare, Settings, Bell, Search, Menu, X, Bot, Sparkles,
    Users, ArrowUpRight, ArrowDownRight, TrendingUp, ChevronDown,
    MoreHorizontal, Calendar, CheckCircle2, FileText, UploadCloud,
    User, Landmark, Receipt, Building2, ShieldCheck, Download,
    CreditCard, Plus, Lock, AlignLeft, CalendarDays, UserPlus,
    BarChart3, LifeBuoy, Zap, Activity, Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AuthService, DashboardService, FinanceService,
    RHService, DasMeiService, CompanyService
} from '@/services/api';

// ============================================================================
// HELPERS & TYPES
// ============================================================================
const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

interface UserProfile {
    id: number;
    name: string;
    email: string;
    cargo?: string;
    acesso?: string;
    avatar?: string;
}

// ============================================================================
// COMPONENTES DAS TELAS
// ============================================================================

// --- TELA 1: VISÃO GERAL (DASHBOARD COMPLETO) ---
const TabDashboard = ({ metrics, activity }: { metrics: any; activity: any[] }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-7xl mx-auto"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">ERP Cockpit</h2>
                    <p className="text-slate-500 text-sm mt-1">Sua central de comando unificada e sincronizada.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <select className="flex-1 md:flex-none bg-white border border-slate-200 border-black/5 shadow-sm border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2 outline-none focus:ring-2 ring-indigo-500 shadow-sm">
                        <option>Março 2026</option>
                        <option>Fevereiro 2026</option>
                    </select>
                    <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-200 flex items-center gap-2">
                        <Download size={16} /> Exportar BI
                    </button>
                </div>
            </div>

            {/* KPIs Globais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { title: 'Receita Operacional', value: formatCurrency(metrics?.revenue?.current || 142500), trend: `+${metrics?.revenue?.change_percent || 12.5}%`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { title: 'Custos e Despesas', value: formatCurrency(metrics?.revenue?.current * 0.6 || 84300), trend: '-2.4%', icon: TrendingUp, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { title: 'Vagas Ativas', value: `${metrics?.active_jobs || 12} posições`, trend: 'Alta urgência', icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { title: 'Time Ativo', value: metrics?.employees_count || '48', trend: '2 de Férias', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' }
                ].map((s, i) => (
                    <div key={i} className="bg-white border border-slate-200 border-black/5 shadow-sm border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex justify-between items-start mb-3">
                            <div className={`p-2 rounded-lg ${s.bg} ${s.color}`}>
                                <s.icon size={18} />
                            </div>
                            <p className={`text-xs font-bold ${s.trend.includes('+') ? 'text-emerald-600' : s.trend.includes('-') ? 'text-blue-600' : 'text-slate-500'}`}>
                                {s.trend}
                            </p>
                        </div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{s.title}</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{s.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico Financeiro */}
                <div className="lg:col-span-2 bg-white border border-slate-200 border-black/5 shadow-sm border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Activity size={18} className="text-indigo-600" /> Fluxo de Caixa Mensal
                        </h3>
                        <div className="flex gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-indigo-500 rounded-full"></div> Receitas</span>
                            <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-slate-200 rounded-full"></div> Despesas</span>
                        </div>
                    </div>
                    <div className="flex-1 flex items-end gap-2 md:gap-3 px-2 min-h-[220px]">
                        {[40, 60, 45, 90, 65, 80, 55, 75, 60, 85, 70, 95].map((h, i) => (
                            <div key={i} className="flex-1 flex gap-1 items-end group relative h-full">
                                <div className="w-full bg-slate-100 hover:bg-slate-200 rounded-t-lg transition-all" style={{ height: `${h}%` }}></div>
                                <div className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-t-lg transition-all shadow-[0_-4px_12px_rgba(99,102,241,0.2)]" style={{ height: `${h * 0.7}%` }}></div>

                                {/* Tooltip */}
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none shadow-xl">
                                    Sem {i + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Agenda do Dia (Mocked but Premium) */}
                <div className="bg-white border border-slate-200 border-black/5 shadow-sm border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <CalendarDays size={18} className="text-indigo-600" /> Agenda de Hoje
                        </h3>
                        <button className="text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-50 overflow-y-auto max-h-[350px]">
                        {[
                            { time: '09:00', title: 'Entrevista: Tiago Mendes', type: 'Recrutamento', color: 'indigo' },
                            { time: '11:00', title: 'Daily Innovation.ia', type: 'Tech', color: 'emerald' },
                            { time: '14:30', title: 'Fechamento de Caixa', type: 'Financeiro', color: 'amber' },
                            { time: '16:00', title: 'Demo Veo Video Gen', type: 'IA / R&D', color: 'purple' },
                        ].map((item, idx) => (
                            <div key={idx} className="p-4 hover:bg-slate-50 transition-colors flex gap-4 items-center group">
                                <span className="text-xs font-black text-slate-400 w-12 shrink-0">{item.time}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">{item.title}</p>
                                    <span className={`inline-block mt-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-${item.color}-50 text-${item.color}-600 border border-${item.color}-100`}>
                                        {item.type}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-slate-50/30 border-t border-slate-50 mt-auto">
                        <button className="w-full text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">Ver Calendário Completo</button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// --- TELA 2: CONTAS E EXTRATOS ---
const TabFinanceiro = ({ summary, transactions, dasMei }: { summary: any; transactions: any[]; dasMei: any }) => (
    <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6 max-w-7xl mx-auto"
    >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
            <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tesouraria & Caixa</h2>
                <p className="text-slate-500 text-sm mt-1">Gestão financeira unificada com Open Finance.</p>
            </div>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-200 flex items-center gap-2">
                <Plus size={16} /> Novo Lançamento
            </button>
        </div>

        {/* Painel de Integrações */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-4 transition-all hover:bg-emerald-50">
                <div className="p-3 bg-white border border-slate-200 border-black/5 shadow-sm text-emerald-600 rounded-xl shadow-sm"><Landmark size={20} /></div>
                <div>
                    <p className="text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest">Open Finance</p>
                    <p className="text-sm font-black text-slate-900">Banco Itaú PJ <span className="text-emerald-600 text-[10px] ml-1 px-1.5 py-0.5 bg-emerald-100 rounded">ON</span></p>
                </div>
            </div>
            <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex items-center gap-4 transition-all hover:bg-indigo-50">
                <div className="p-3 bg-white border border-slate-200 border-black/5 shadow-sm text-indigo-600 rounded-xl shadow-sm"><Building2 size={20} /></div>
                <div>
                    <p className="text-[10px] font-bold text-indigo-700/60 uppercase tracking-widest">Governo / e-CAC</p>
                    <p className="text-sm font-black text-slate-900">Sefaz/Receita <span className="text-indigo-600 text-[10px] ml-1 px-1.5 py-0.5 bg-indigo-100 rounded">SYNC</span></p>
                </div>
            </div>
            <div className="bg-white border border-slate-200 border-black/5 shadow-sm border border-slate-200 border-dashed p-4 rounded-2xl flex justify-center items-center cursor-pointer hover:bg-slate-50 transition-all">
                <p className="text-sm font-black text-indigo-600 flex items-center gap-2"><Plus size={16} /> Vincular Outra Conta</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
                {/* DAS / Impostos */}
                <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all"></div>
                    <div className="relative z-10">
                        <span className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest mb-4 inline-block shadow-lg shadow-rose-900/40">
                            Vence em 2 dias
                        </span>
                        <h3 className="text-xl font-bold mb-1">Guia DAS (MEI)</h3>
                        <p className="text-slate-400 text-xs mb-6">Competência: Fevereiro / 2026</p>
                        <p className="text-4xl font-black mb-8 tracking-tighter">R$ 75,60</p>
                        <button className="w-full bg-white border border-slate-200 border-black/5 shadow-sm text-slate-900 py-3.5 rounded-xl text-sm font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl">
                            Gerar Boleto / Pix
                        </button>
                    </div>
                </div>

                {/* Contas a Pagar */}
                <div className="bg-white border border-slate-200 border-black/5 shadow-sm border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <ClockIcon size={16} className="text-slate-400" /> Próximos Vencimentos
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {transactions.filter(t => t.type === 'expense' && t.status !== 'paid').slice(0, 3).map((t, idx) => (
                            <div key={idx} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                <div>
                                    <p className="text-sm font-bold text-slate-900">{t.description}</p>
                                    <p className="text-[10px] font-bold text-rose-500 mt-0.5">
                                        {new Date(t.due_date).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-900">{formatCurrency(t.amount)}</p>
                                    <button className="text-[10px] text-indigo-600 font-bold hover:underline mt-1 uppercase tracking-wider">Agendar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Extrato Principal */}
            <div className="lg:col-span-2 bg-white border border-slate-200 border-black/5 shadow-sm border border-slate-100 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="font-bold text-slate-900">Movimentação Consolidada</h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input type="text" placeholder="Filtrar por nome ou valor..." className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 ring-indigo-500 shadow-sm" />
                    </div>
                </div>
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase font-black tracking-widest text-slate-400">
                            <tr>
                                <th className="px-6 py-4">Status / Data</th>
                                <th className="px-6 py-4">Lançamento</th>
                                <th className="px-6 py-4">Categoria</th>
                                <th className="px-6 py-4 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {transactions.slice(0, 10).map((tx, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${tx.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                            <span className="text-[10px] font-bold text-slate-500">{new Date(tx.due_date).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}>
                                                {tx.type === 'income' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                                            </div>
                                            <span className="text-sm font-bold text-slate-900">{tx.description}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider">{tx.category || 'Geral'}</span>
                                    </td>
                                    <td className={`px-6 py-4 text-sm font-black text-right ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                        {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </motion.div>
);

// --- TELA 3: RELÓGIO DE PONTO ---
const TabPonto = () => {
    const [pontoStatus, setPontoStatus] = useState<'pendente' | 'trabalhando'>('pendente');
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto mt-10 md:mt-20 px-4"
        >
            <div className="bg-white border border-slate-200 border-black/5 shadow-sm border border-slate-100 rounded-[3rem] p-8 md:p-12 shadow-2xl text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                <div className="flex justify-center mb-8">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[2rem] shadow-inner">
                        <ClockIcon size={48} className={pontoStatus === 'trabalhando' ? 'animate-pulse' : ''} />
                    </div>
                </div>

                <div className="text-7xl md:text-8xl font-black text-slate-900 tracking-tighter mb-4 flex justify-center items-center font-mono">
                    {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>

                <p className="text-slate-400 font-bold uppercase tracking-[0.3em] mb-12 text-xs">
                    {time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>

                <AnimatePresence mode="wait">
                    {pontoStatus === 'pendente' ? (
                        <motion.button
                            key="btn-in"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            onClick={() => setPontoStatus('trabalhando')}
                            className="w-full py-6 bg-slate-900 hover:bg-black text-white font-black text-xl rounded-2xl transition-all shadow-2xl flex justify-center items-center gap-3 group"
                        >
                            <CheckCircle2 size={24} className="group-hover:scale-125 transition-transform" />
                            Bater Ponto — Entrada
                        </motion.button>
                    ) : (
                        <motion.div
                            key="active-status"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-6"
                        >
                            <div className="inline-block px-6 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                <p className="text-sm font-black text-emerald-700 flex items-center justify-center gap-3">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
                                    Em Jornada desde as 08:34
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all border border-slate-200">
                                    Intervalo
                                </button>
                                <button onClick={() => setPontoStatus('pendente')} className="py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-rose-100">
                                    Finalizar Dia
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="mt-12 pt-8 border-t border-slate-50 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <ShieldCheck size={14} className="text-indigo-400" /> Assinatura Digital Ativa
                    </div>
                    <p className="text-[10px] text-slate-300">IP: 172.19.0.1 • GPS: Sincronizado</p>
                </div>
            </div>
        </motion.div>
    );
};

// --- TELA 4: CONFIGURAÇÕES & PERFIL ---
const TabConfig = ({ user, company }: { user: UserProfile | null; company: any }) => {
    const [sub, setSub] = useState<'profile' | 'company' | 'billing'>('profile');

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto h-full"
        >
            <div className="w-full lg:w-64 space-y-1">
                <h3 className="text-xl font-black text-slate-900 mb-6 px-4">Preferências</h3>
                <button onClick={() => setSub('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${sub === 'profile' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <User size={18} /> Meu Perfil
                </button>
                <button onClick={() => setSub('company')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${sub === 'company' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <Building2 size={18} /> Dados da Empresa
                </button>
                <button onClick={() => setSub('billing')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${sub === 'billing' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <CreditCard size={18} /> Assinatura ERP
                </button>
            </div>

            <div className="flex-1 bg-white border border-slate-200 border-black/5 shadow-sm border border-slate-100 rounded-3xl shadow-sm p-8">
                {sub === 'profile' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-6 mb-8">
                            <div className="w-20 h-20 bg-indigo-100 rounded-[2rem] flex items-center justify-center font-black text-2xl text-indigo-700 shadow-inner">
                                {user?.name?.[0] || 'U'}
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-slate-900">{user?.name}</h4>
                                <p className="text-sm text-slate-500">{user?.email}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Telefone</label>
                                <input type="text" defaultValue="+55 11 99999-9999" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Senha</label>
                                <button className="w-full bg-slate-900 text-white rounded-xl px-4 py-2.5 text-sm font-bold">Alterar Senha</button>
                            </div>
                        </div>
                    </div>
                )}

                {sub === 'company' && (
                    <div className="space-y-6">
                        <h4 className="text-lg font-black text-slate-900 border-b border-slate-50 pb-4">Institucional</h4>
                        <div className="grid grid-cols-1 gap-4 max-w-lg">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Razão Social</label>
                                <input type="text" defaultValue={company?.name || 'Inovação Tecnológica Ltda'} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">CNPJ</label>
                                <input type="text" defaultValue={company?.cnpj || '54.694.364/0001-48'} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm" />
                            </div>
                            <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-black shadow-lg shadow-indigo-100 w-fit mt-4">Salvar Alterações</button>
                        </div>
                    </div>
                )}

                {sub === 'billing' && (
                    <div className="space-y-6">
                        <div className="p-6 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl text-white shadow-xl">
                            <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase mb-4 inline-block tracking-widest">Plano Enterprise</span>
                            <h4 className="text-2xl font-black mb-1">Innovation Force</h4>
                            <p className="opacity-80 text-xs mb-6">Próxima renovação em 10 de Abril, 2026</p>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-3xl font-black">R$ 99,90</span>
                                <span className="text-sm opacity-60">/mês</span>
                            </div>
                            <button className="bg-white border border-slate-200 border-black/5 shadow-sm text-indigo-700 px-6 py-2.5 rounded-xl font-bold text-sm shadow-xl">Gerenciar Assinatura</button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// --- TELA 5: ASSISTENTE IA ---
const TabAssistente = () => (
    <div className="h-full flex flex-col items-center justify-center py-20">
        <div className="relative mb-10">
            <div className="absolute inset-0 bg-indigo-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
            <div className="relative w-24 h-24 bg-white border border-slate-200 border-black/5 shadow-sm border border-indigo-100 rounded-[2.5rem] flex items-center justify-center text-indigo-600 shadow-2xl">
                <Bot size={48} />
            </div>
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">INNOVATIONT Inteligência Artificial</h2>
        <p className="max-w-md text-center mt-3 text-slate-500 font-medium">Sua copiloto para gestão corporativa. Conectada ao Gemini Pro para suporte em tempo real.</p>
        <button className="mt-10 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-2xl flex items-center gap-3 hover:scale-105 transition-all">
            <MessageSquare size={20} /> Iniciar Conversa
        </button>
    </div>
);


// ============================================================================
// MAIN PAGE EXPORT
// ============================================================================
export default function ModernDashboard() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [company, setCompany] = useState<any>(null);
    const [metrics, setMetrics] = useState<any>(null);
    const [financeSummary, setFinanceSummary] = useState<any>(null);
    const [activity, setActivity] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [dasMei, setDasMei] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [u, c, m, a, t, fs, das] = await Promise.all([
                    AuthService.me().catch(() => null),
                    CompanyService.getMyCompany().catch(() => null),
                    DashboardService.getMetrics().catch(() => null),
                    DashboardService.getRecentActivity().catch(() => ({ activities: [] })),
                    FinanceService.getTransactions().catch(() => []),
                    FinanceService.getSummary().catch(() => null),
                    DasMeiService.getAtual().catch(() => null),
                ]);
                setUser(u);
                setCompany(c);
                setMetrics(m);
                setActivity(a.activities || []);
                setTransactions(t);
                setFinanceSummary(fs);
                setDasMei(das);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const menuItems = [
        { id: 'dashboard', label: 'Início / Cockpit', icon: LayoutDashboard },
        { id: 'finance', label: 'Caixa & Bancos', icon: Landmark },
        { id: 'rh', label: 'Gestão de Time', icon: Users },
        { id: 'ponto', label: 'Meu Ponto', icon: ClockIcon },
        { id: 'ia', label: 'Assistente IA', icon: Bot },
        { id: 'config', label: 'Ajustes', icon: Settings },
    ];

    if (loading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Innovation.ia está carregando...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col lg:flex-row text-slate-900 selection:bg-indigo-100 overflow-hidden">

            {/* MOBILE HEADER */}
            <div className="lg:hidden flex items-center justify-between bg-white border border-slate-200 border-black/5 shadow-sm p-5 border-b border-slate-100 z-[100]">
                <div className="flex items-center gap-3 font-black text-xl tracking-tighter">
                    <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center"><Bot size={18} /></div>
                    Innovation
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-slate-50 rounded-xl text-slate-600">
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* MOBILE OVERLAY */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80]"
                    />
                )}
            </AnimatePresence>

            {/* SIDEBAR */}
            <aside className={`
        fixed inset-y-0 left-0 w-72 bg-white border border-slate-200 border-black/5 shadow-sm border-r border-slate-100 z-[90] flex flex-col transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                <div className="hidden lg:flex items-center gap-3 p-8">
                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-[0.8rem] flex items-center justify-center shadow-lg shadow-indigo-100">
                        <Bot size={22} />
                    </div>
                    <span className="font-black text-2xl tracking-tighter text-slate-900">Innovation<span className="text-indigo-600">.ia</span></span>
                </div>

                <div className="px-6 mb-6">
                    <div className="bg-slate-50 border border-slate-50 rounded-2xl p-4 flex items-center gap-4 shadow-inner">
                        <div className="w-10 h-10 bg-white border border-slate-200 border-black/5 shadow-sm rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm">
                            {user?.name?.[0] || 'U'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 truncate">{company?.name || 'Inovação Force'}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{user?.name || 'Eduardo Silva'}</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto overflow-x-hidden pt-2">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-black transition-all ${activeTab === item.id
                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <item.icon size={18} className={activeTab === item.id ? 'text-white' : 'text-slate-300'} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-6">
                    <button className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-600 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:bg-rose-100">
                        <Lock size={14} /> Sair do Painel
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white border border-slate-200 border-black/5 shadow-sm lg:bg-slate-50/50">

                {/* TOP SEARCH BAR */}
                <header className="hidden lg:flex h-20 px-10 items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 focus-within:bg-white border border-slate-200 border-black/5 shadow-sm focus-within:ring-4 ring-indigo-50 rounded-2xl px-5 py-2.5 w-[500px] transition-all">
                        <Search size={18} className="text-slate-300" />
                        <input type="text" placeholder="Procurar transações, contratos, colaboradores..." className="bg-transparent border-none outline-none text-sm text-slate-700 w-full placeholder:text-slate-400 font-medium" />
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Sincronizado</span>
                        </div>

                        <button className="relative p-2.5 bg-white border border-slate-200 border-black/5 shadow-sm border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white shadow-lg shadow-rose-200"></span>
                        </button>

                        <div className="h-8 w-px bg-slate-100 mx-2"></div>

                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm font-black text-slate-900 leading-tight">Painel Admin</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Innovation Enterprise</p>
                            </div>
                            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black shadow-lg">
                                {user?.name?.[0] || 'A'}
                            </div>
                        </div>
                    </div>
                </header>

                {/* PAGE CONTENT RENDERER */}
                <div className="flex-1 overflow-x-hidden overflow-y-auto p-6 lg:p-10">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="h-full"
                        >
                            {activeTab === 'dashboard' && <TabDashboard metrics={metrics} activity={activity} />}
                            {activeTab === 'finance' && <TabFinanceiro summary={financeSummary || metrics} transactions={transactions} dasMei={dasMei} />}
                            {activeTab === 'rh' && (
                                <div className="py-20 text-center">
                                    <Users size={48} className="mx-auto text-slate-200 mb-6" />
                                    <h3 className="text-xl font-black text-slate-900">Gestão Estratégica de Talentos</h3>
                                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">Módulo avançado de RH para controle de folha, férias e organograma. Em breve integrado com inteligência de rede.</p>
                                    <button className="mt-8 bg-indigo-50 text-indigo-600 font-black px-6 py-3 rounded-xl hover:bg-indigo-100 transition-all uppercase text-xs tracking-widest">Acessar RH V2</button>
                                </div>
                            )}
                            {activeTab === 'ponto' && <TabPonto />}
                            {activeTab === 'ia' && <TabAssistente />}
                            {activeTab === 'config' && <TabConfig user={user} company={company} />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

        </div>
    );
}
