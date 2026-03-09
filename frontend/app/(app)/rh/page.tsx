'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import {
    Users, TrendingUp, Target, Clock, Plus, CheckCircle2,
    ChevronRight, Award, Trophy, Medal, Heart,
    AlertCircle, Briefcase, FileText, Search, Filter,
    Calendar, Zap, ShieldCheck, Mail, ArrowUpRight,
    TrendingDown, UserPlus, Info, Timer, Upload, ScanLine, X, Sparkles
} from 'lucide-react';
import { RHService } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface Employee {
    id: number;
    name: string;
    role: string;
    department: string;
    status: 'active' | 'vacation' | 'away';
    risk: 'stable' | 'attention' | 'critical';
    avatar?: string;
    time_balance?: number;
}

interface TimelineEvent {
    id: number;
    type: 'promotion' | 'leave' | 'document' | 'hiring';
    date: string;
    title: string;
    description: string;
}

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

function StatCard({ title, value, detail, icon: Icon, colorClass, trend }: any) {
    return (
        <div className="relative overflow-hidden bg-white border-slate-200 border-black/5 shadow-sm/70 backdrop-blur-xl border-slate-200/60 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all group">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClass} opacity-[0.04] group-hover:opacity-[0.08] transition-opacity rounded-bl-full`} />
            <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                <div className="flex justify-between items-start">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 ${colorClass.split(' ')[0].replace('from-', 'text-')}`}>
                        <Icon size={22} strokeWidth={2} />
                    </div>
                    {trend && (
                        <span className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${trend.startsWith('+') || trend.startsWith('↑') ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' : 'bg-amber-50 text-amber-600 border-amber-100/50'}`}>
                            {trend.startsWith('+') || trend.startsWith('↑') ? <ArrowUpRight size={12} /> : null}
                            {trend}
                        </span>
                    )}
                </div>
                <div>
                    <h3 className="text-[13px] font-medium text-slate-9000 mb-1">{title}</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-slate-800 tracking-tight">{value}</span>
                        <span className="text-xs font-medium text-slate-400">{detail}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EmployeeCard({ employee, onClick }: { employee: Employee; onClick: () => void }) {
    const riskStyles = {
        stable: 'bg-emerald-50 text-emerald-600 border-emerald-100/50',
        attention: 'bg-amber-50 text-amber-600 border-amber-100/50',
        critical: 'bg-rose-50 text-rose-600 border-rose-100/50'
    };

    const riskLabel = { stable: 'Estável', attention: 'Atenção', critical: 'Crítico' };

    return (
        <motion.div
            layout
            whileHover={{ y: -2 }}
            onClick={onClick}
            className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-200/60 p-4 rounded-[1.25rem] cursor-pointer shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group flex items-center gap-4"
        >
            <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-50 to-indigo-100/50 border-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-lg shadow-sm">
                    {employee.name[0]}
                </div>
                <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${employee.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'} shadow-[0_0_0_1px_rgba(0,0,0,0.05)]`} />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors tracking-tight">{employee.name}</h3>
                <p className="text-[12px] text-slate-9000 truncate mt-0.5">{employee.role} <span className="text-slate-700 mx-1">•</span> {employee.department}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
                <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${riskStyles[employee.risk]}`}>
                    {riskLabel[employee.risk]}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                    <Clock size={12} /> {employee.time_balance || 0}h
                </div>
            </div>
        </motion.div>
    );
}

function TimelineDrawer({ isOpen, onClose, employee }: { isOpen: boolean; onClose: () => void; employee: Employee | null }) {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && employee) {
            setLoading(true);
            RHService.getEmployeeTimeline(employee.id)
                .then(setEvents)
                .finally(() => setLoading(false));
        }
    }, [isOpen, employee]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-50/20 backdrop-blur-sm z-[100]" onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-slate-200 border-black/5 shadow-sm z-[101] shadow-2xl p-6 sm:p-8 overflow-y-auto border-l border-slate-200"
                    >
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-xl font-bold text-slate-900 shadow-lg shadow-indigo-200">
                                    {employee?.name[0]}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">{employee?.name}</h2>
                                    <p className="text-indigo-600 text-[13px] font-medium">{employee?.role}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-8">
<<<<<<< HEAD
                            <div className="bg-slate-50 p-4 rounded-2xl border-slate-100/80">
                                <p className="text-[11px] text-slate-500 font-medium tracking-wide mb-1 flex items-center gap-1.5"><Sparkles size={12} /> Status Cognitivo</p>
=======
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/80">
                                <p className="text-[11px] text-slate-9000 font-medium tracking-wide mb-1 flex items-center gap-1.5"><Sparkles size={12} /> Status Cognitivo</p>
>>>>>>> 73e3b8acfec7b8c39719e808c5e32ff2dd4f4465
                                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm">
                                    98.4% Estável
                                </div>
                            </div>
<<<<<<< HEAD
                            <div className="bg-slate-50 p-4 rounded-2xl border-slate-100/80">
                                <p className="text-[11px] text-slate-500 font-medium tracking-wide mb-1 flex items-center gap-1.5"><Timer size={12} /> Tempo de Empresa</p>
=======
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/80">
                                <p className="text-[11px] text-slate-9000 font-medium tracking-wide mb-1 flex items-center gap-1.5"><Timer size={12} /> Tempo de Empresa</p>
>>>>>>> 73e3b8acfec7b8c39719e808c5e32ff2dd4f4465
                                <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-sm">
                                    2a 4m
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                            {loading ? (
                                [1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-50 rounded-2xl animate-pulse ml-10" />)
                            ) : events.length === 0 ? (
                                <div className="text-center py-10 bg-slate-50 rounded-2xl border-dashed border-slate-200 ml-10">
                                    <p className="text-[13px] font-medium text-slate-400">Nenhum evento registrado hoje.</p>
                                </div>
                            ) : events.map((event, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                                    key={event.id} className="relative pl-10"
                                >
                                    <div className="absolute left-[8px] top-1.5 w-4 h-4 rounded-full bg-white border-slate-200 border-black/5 shadow-sm border-[3px] border-indigo-500 shadow-sm z-10" />
                                    <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-200/60 p-4 rounded-2xl group hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50/50 transition-all">
                                        <div className="flex justify-between items-start mb-1.5">
                                            <h4 className="text-[13px] font-semibold text-slate-800">{event.title}</h4>
                                            <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">{event.date}</span>
                                        </div>
                                        <p className="text-[13px] text-slate-9000 leading-relaxed">{event.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function AdmissionModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [done, setDone] = useState(false);

    const handleSend = async () => {
        setSending(true);
        try {
            await RHService.createAdmission({ email });
            setDone(true);
            setTimeout(() => { onClose(); setDone(false); setEmail(''); }, 2000);
        } catch (e) { }
        finally { setSending(false); }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-[200] p-4">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-50/30 backdrop-blur-sm" onClick={onClose}
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        className="bg-white border-slate-200 border-black/5 shadow-sm w-full max-w-sm p-8 rounded-[2rem] shadow-2xl relative z-10 text-center border-slate-100"
                    >
                        <div className="w-16 h-16 bg-gradient-to-tr from-indigo-50 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 border-indigo-50 text-indigo-600 shadow-inner">
                            <UserPlus size={28} />
                        </div>

                        <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">Admissão Cognitiva</h2>
                        <p className="text-[13px] text-slate-9000 mb-8 px-2 leading-relaxed">
                            Inicie o onboarding "Zero Papel". O talento receberá um link seguro para envio de documentos.
                        </p>

                        {done ? (
                            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="py-6">
                                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="text-emerald-500" size={32} />
                                </div>
                                <p className="text-emerald-600 font-semibold text-sm">Convite Enviado com Sucesso</p>
                            </motion.div>
                        ) : (
                            <div className="space-y-5">
                                <div className="relative text-left">
                                    <label className="text-[11px] font-semibold text-slate-9000 mb-1.5 block ml-1 uppercase tracking-wide">E-mail do Talento</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="email" placeholder="nome@exemplo.com"
                                            className="w-full bg-slate-50 border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium placeholder:text-slate-400"
                                            value={email} onChange={e => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSend} disabled={!email || sending}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-slate-900 font-semibold py-3 rounded-xl shadow-md shadow-indigo-200 transition-all text-sm disabled:opacity-50 disabled:hover:bg-indigo-600 flex justify-center items-center gap-2"
                                    >
                                        {sending ? (
                                            <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Processando</>
                                        ) : 'Enviar Link'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default function AdvancedRHPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filter, setFilter] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await RHService.getEmployees();
            setEmployees(data);
        } finally { setLoading(false); }
    };

    const filtered = employees.filter(e => e.name.toLowerCase().includes(filter.toLowerCase()) || e.role.toLowerCase().includes(filter.toLowerCase()));

    const stats = [
        { title: 'Headcount Ativo', value: employees.length, detail: 'Colaboradores', trend: '+2 contratações', icon: Users, colorClass: 'from-indigo-600 to-indigo-500' },
        { title: 'Turnover Risk', value: '12%', detail: 'Taxa atual', trend: '↓ 2.4%', icon: AlertCircle, colorClass: 'from-rose-500 to-rose-400' },
        { title: 'Banco de Horas', value: '420h', detail: 'Saldo global', trend: 'Estável', icon: Clock, colorClass: 'from-amber-500 to-amber-400' },
        { title: 'Performance', value: '8.8', detail: 'Média global', trend: '↑ 0.5', icon: Target, colorClass: 'from-emerald-500 to-emerald-400' },
    ];

    return (
        <AppLayout title="Pessoas & Cultura">
            <div className="p-6 sm:p-8 space-y-8 animate-in fade-in duration-500 min-h-screen">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border-slate-200 border-black/5 shadow-sm/70 backdrop-blur-xl p-6 rounded-[2rem] border-slate-200/60 shadow-sm">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 text-slate-900">
                            <Heart size={26} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Pessoas & Cultura</h1>
                            <p className="text-[13px] text-slate-9000 font-medium">Gestão inteligente e desenvolvimento continuado de talentos.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text" placeholder="Buscar talento..."
                                className="w-full bg-slate-50 border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-[13px] text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                                value={filter} onChange={e => setFilter(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-slate-900 px-5 py-2.5 rounded-xl font-semibold text-[13px] flex items-center gap-2 shadow-sm shadow-indigo-200 transition-all"
                        >
                            <UserPlus size={16} /> <span className="hidden sm:inline">Nova Admissão</span>
                        </button>
                    </div>
                </div>

                {/* Dashboard KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                    {stats.map((s, idx) => (
                        <StatCard key={idx} {...s} />
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white border-slate-200 border-black/5 shadow-sm/70 backdrop-blur-xl border-slate-200/60 rounded-[2rem] p-6 sm:p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                    <Users size={20} className="text-indigo-600" /> Quadro de Colaboradores
                                </h2>
                                <div className="flex gap-1">
                                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"><Filter size={18} /></button>
                                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"><ArrowUpRight size={18} /></button>
                                </div>
                            </div>

                            {loading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-20 bg-slate-50 border-slate-100 rounded-[1.25rem] animate-pulse" />)}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filtered.map(emp => (
                                        <EmployeeCard
                                            key={emp.id}
                                            employee={emp}
                                            onClick={() => { setSelectedEmp(emp); setIsDrawerOpen(true); }}
                                        />
                                    ))}
                                    {filtered.length === 0 && (
                                        <div className="col-span-full py-12 text-center text-slate-400 text-sm font-medium border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                            Nenhum colaborador encontrado com os filtros atuais.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white border-slate-200 border-black/5 shadow-sm/70 backdrop-blur-xl border-rose-100/60 p-6 sm:p-8 rounded-[2rem] shadow-sm">
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2 mb-6">
                                <AlertCircle size={20} className="text-rose-500" /> Alertas de Risco (IA)
                            </h2>

                            <div className="space-y-3">
                                {employees.filter(e => e.risk !== 'stable').length === 0 ? (
                                    <div className="text-center py-8 border-dashed border-emerald-200/50 rounded-2xl bg-emerald-50/30">
                                        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 border-emerald-100/50">
                                            <ShieldCheck className="text-emerald-500" size={24} />
                                        </div>
                                        <p className="text-[13px] font-medium text-slate-9000">Nenhum risco detectado pela análise cognitiva.</p>
                                    </div>
                                ) : (
                                    employees.filter(e => e.risk !== 'stable').map(emp => (
                                        <div key={emp.id} className="flex items-center gap-3 p-3.5 rounded-[1.25rem] bg-white border-slate-200 border-black/5 shadow-sm border-rose-100/50 shadow-sm hover:shadow-md hover:border-rose-200 transition-all cursor-pointer group" onClick={() => { setSelectedEmp(emp); setIsDrawerOpen(true); }}>
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-50 to-rose-100 flex items-center justify-center font-bold text-rose-600 shadow-sm">
                                                {emp.name[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-semibold text-slate-800 truncate">{emp.name}</p>
                                                <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1">
                                                    <TrendingDown size={12} /> {emp.risk === 'critical' ? 'Risco Alto' : 'Atenção Necessária'}
                                                </p>
                                            </div>
                                            <div className="p-1.5 rounded-lg text-slate-700 group-hover:text-rose-500 transition-colors">
                                                <ChevronRight size={18} />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

<<<<<<< HEAD
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] p-6 sm:p-8 text-white shadow-xl shadow-indigo-200/50 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white border-slate-200 border-black/5 shadow-sm/5 rounded-bl-[4rem] pointer-events-none" />
                            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white border-slate-200 border-black/5 shadow-sm/10 blur-3xl rounded-full pointer-events-none" />
=======
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] p-6 sm:p-8 text-slate-900 shadow-xl shadow-indigo-200/50 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[4rem] pointer-events-none" />
                            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 blur-3xl rounded-full pointer-events-none" />
>>>>>>> 73e3b8acfec7b8c39719e808c5e32ff2dd4f4465

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <ScanLine size={18} className="text-indigo-200" />
                                            <h3 className="text-base font-bold tracking-tight">Onboarding Zero Papel</h3>
                                        </div>
                                        <p className="text-[11px] font-semibold text-indigo-200 tracking-wide">COMPLIANCE 100% DIGITAL</p>
                                    </div>
                                </div>
                                <div className="space-y-4 bg-white border-slate-200 border-black/5 shadow-sm/10 backdrop-blur-sm border-white/10 rounded-2xl p-4">
                                    <div className="flex justify-between text-[11px] font-medium mb-2">
                                        <span>Automação Cognitiva</span>
                                        <span className="text-indigo-200">12 docs validados</span>
                                    </div>
                                    <div className="h-1.5 bg-white border-slate-200 border-black/5 shadow-sm/20 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.5, delay: 0.5 }} className="h-full bg-white border-slate-200 border-black/5 shadow-sm w-full rounded-full shadow-[0_0_10px_white]" />
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-indigo-100 pt-1">
                                        "A plataforma validou 12 novos documentos via IA hoje, economizando aproximadamente 4h de triagem humana."
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <TimelineDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                employee={selectedEmp}
            />

            <AdmissionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </AppLayout>
    );
}
