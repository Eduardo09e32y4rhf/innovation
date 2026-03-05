'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import {
    Users, TrendingUp, Target, Clock, Plus, CheckCircle2,
    ChevronRight, Award, Trophy, Medal, Heart,
    AlertCircle, Briefcase, FileText, Search, Filter,
    Calendar, Zap, ShieldCheck, Mail, ArrowUpRight,
    TrendingDown, UserPlus, Info, Timer, Upload, ScanLine
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

function StatCard({ title, value, detail, icon: Icon, color }: any) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="glass-panel p-5 rounded-3xl border border-white/5 relative overflow-hidden group"
        >
            <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity`} />
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform">
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                </div>
                <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
                <p className="text-sm text-purple-300/60 font-medium mb-2">{title}</p>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> {detail}
                </p>
            </div>
        </motion.div>
    );
}

function EmployeeCard({ employee, onClick }: { employee: Employee; onClick: () => void }) {
    const riskColor = {
        stable: 'bg-emerald-400/20 text-emerald-400 border-emerald-400/30',
        attention: 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30',
        critical: 'bg-red-400/20 text-red-400 border-red-400/30'
    };

    const riskLabel = { stable: 'Estável', attention: 'Em Risco', critical: 'Crítico' };

    return (
        <motion.div
            layout
            whileHover={{ scale: 1.02 }}
            onClick={onClick}
            className="glass-panel p-5 rounded-3xl cursor-pointer border border-white/5 hover:border-purple-500/30 transition-all group relative"
        >
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-xl shadow-xl">
                        {employee.name[0]}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a0a18] ${employee.status === 'active' ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white truncate group-hover:text-purple-400 transition-colors">{employee.name}</h3>
                    <p className="text-xs text-purple-300/40 font-medium">{employee.role} · {employee.department}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${riskColor[employee.risk]}`}>
                        {riskLabel[employee.risk]}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-purple-300/30 font-mono">
                        <Clock className="w-3 h-3" /> {employee.time_balance || 0}h
                    </div>
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
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]" onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-[#0a0a18]/90 border-l border-white/5 z-[101] shadow-2xl p-8 overflow-y-auto"
                    >
                        <div className="flex justify-between items-center mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-3xl bg-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-purple-500/20 shadow-2xl">
                                    {employee?.name[0]}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white">{employee?.name}</h2>
                                    <p className="text-purple-400/60 font-medium tracking-wide flex items-center gap-2">
                                        <Briefcase className="w-4 h-4" /> {employee?.role}
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-10">
                            <div className="glass-panel p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                                <p className="text-[10px] text-purple-300/40 uppercase font-black tracking-widest mb-1">Status de IA</p>
                                <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold">
                                    <ShieldCheck className="w-4 h-4" /> 98.4% Confiável
                                </div>
                            </div>
                            <div className="glass-panel p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                                <p className="text-[10px] text-purple-300/40 uppercase font-black tracking-widest mb-1">Duração Vínculo</p>
                                <div className="flex items-center justify-center gap-2 text-white font-bold text-sm">
                                    <Timer className="w-4 h-4 text-purple-400" /> 2 anos e 4 meses
                                </div>
                            </div>
                        </div>

                        <h3 className="text-xs font-black uppercase text-purple-300/20 tracking-[0.2em] mb-8 border-b border-white/5 pb-4">
                            Timeline 360º — Histórico Cognitivo
                        </h3>

                        <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-white/5">
                            {loading ? (
                                [1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)
                            ) : events.map((event, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
                                    key={event.id} className="relative pl-10"
                                >
                                    <div className="absolute left-0 top-1 w-[22px] h-[22px] rounded-full bg-[#0a0a18] border-2 border-purple-500 shadow-lg shadow-purple-500/20 flex items-center justify-center z-10">
                                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                                    </div>
                                    <div className="glass-panel p-5 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-sm font-black text-white uppercase tracking-tight">{event.title}</h4>
                                            <span className="text-[10px] font-mono text-purple-300/40">{event.date}</span>
                                        </div>
                                        <p className="text-xs text-purple-300/60 leading-relaxed">{event.description}</p>
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
        } finally {
            setSending(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-[200] p-4">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose}
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="glass-panel w-full max-w-md p-8 rounded-[2.5rem] border border-white/10 relative z-10 text-center"
                    >
                        <div className="w-20 h-20 bg-purple-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-purple-500/20">
                            <UserPlus className="w-10 h-10 text-purple-400" />
                        </div>

                        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Nova Admissão Digital</h2>
                        <p className="text-sm text-purple-300/40 mb-8 px-4">Inicie o onboarding cognitivo "Zero Papel". O colaborador receberá o link para envio de documentos via IA.</p>

                        {done ? (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="py-8">
                                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                                <p className="text-emerald-400 font-bold">E-mail de onboarding enviado!</p>
                            </motion.div>
                        ) : (
                            <div className="space-y-4">
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300/30" />
                                    <input
                                        type="email" placeholder="E-mail do novo colaborador"
                                        className="w-full bg-[#0a0a18] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-purple-500 outline-none transition-all"
                                        value={email} onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={handleSend} disabled={!email || sending}
                                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {sending ? 'PROCESSANDO...' : 'ENVIAR CONVITE'}
                                </button>
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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await RHService.getEmployees();
            setEmployees(data);
        } finally {
            setLoading(false);
        }
    };

    const filtered = employees.filter(e => e.name.toLowerCase().includes(filter.toLowerCase()) || e.role.toLowerCase().includes(filter.toLowerCase()));

    const stats = [
        { title: 'Headcount Ativo', value: employees.length, detail: '+2 este mês', icon: Users, color: 'bg-blue-400' },
        { title: 'Risco de Turnover', value: `${((employees.filter(e => e.risk !== 'stable').length / Math.max(employees.length, 1)) * 100).toFixed(0)}%`, detail: '+4pp vs anterior', icon: AlertCircle, color: 'bg-red-400' },
        { title: 'Saldo Banco de Horas', value: `${employees.reduce((acc, e) => acc + (e.time_balance || 0), 0)}h`, detail: 'Atenção necessária', icon: Clock, color: 'bg-yellow-400' },
        { title: 'Score PDI Médio', value: '8.4', detail: 'Melhorando (↑)', icon: Target, color: 'bg-emerald-400' },
    ];

    return (
        <AppLayout>
            <div className="max-w-[1600px] mx-auto space-y-10 pb-20">
                {/* Header Estratégico */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight mb-2 uppercase italic bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
                            Gestão Estratégica
                        </h1>
                        <p className="text-purple-300/40 font-medium flex items-center gap-2 tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Diretoria de RH (Nível Fllu) · Painel de Inteligência
                        </p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300/30" />
                            <input
                                type="text" placeholder="Filtrar talentos ou cargos..."
                                className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-white placeholder:text-purple-300/20 focus:border-purple-500 focus:bg-white/10 outline-none transition-all"
                                value={filter} onChange={e => setFilter(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="p-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-500 shadow-xl shadow-purple-500/20 active:scale-95 transition-all flex items-center gap-2 font-bold px-6 whitespace-nowrap"
                        >
                            <UserPlus className="w-5 h-5" />
                            <span className="hidden sm:inline italic uppercase">Nova Admissão</span>
                        </button>
                    </div>
                </div>

                {/* Dashboard de KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((s, idx) => (
                        <StatCard key={idx} {...s} />
                    ))}
                </div>

                {/* Painel Central */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
                                <Users className="w-6 h-6 text-purple-500" /> Grelha de Colaboradores
                            </h2>
                            <div className="flex gap-2">
                                <button className="p-2 rounded-xl bg-white/5 border border-white/5 text-purple-300/40 hover:text-white transition-all">
                                    <Filter className="w-4 h-4" />
                                </button>
                                <button className="p-2 rounded-xl bg-white/5 border border-white/5 text-purple-300/40 hover:text-white transition-all">
                                    <ArrowUpRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-24 bg-white/5 rounded-3xl animate-pulse" />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {filtered.map(emp => (
                                    <EmployeeCard
                                        key={emp.id}
                                        employee={emp}
                                        onClick={() => { setSelectedEmp(emp); setIsDrawerOpen(true); }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3 text-red-400">
                            <AlertCircle className="w-6 h-6" /> IA: Alertas de Risco
                        </h2>

                        <div className="glass-panel p-6 rounded-[2rem] border border-red-500/10 space-y-4">
                            {employees.filter(e => e.risk !== 'stable').length === 0 ? (
                                <div className="text-center py-10">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-400/20 mx-auto mb-4" />
                                    <p className="text-xs text-purple-300/40">Nenhum risco crítico detectado pela IA hoje.</p>
                                </div>
                            ) : (
                                employees.filter(e => e.risk !== 'stable').map(emp => (
                                    <div key={emp.id} className="flex items-center gap-4 p-4 rounded-2xl bg-red-400/5 border border-red-400/10 group-hover:border-red-400/30 transition-all">
                                        <div className="w-10 h-10 rounded-xl bg-red-400/20 flex items-center justify-center font-bold text-red-400">
                                            {emp.name[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{emp.name}</p>
                                            <p className="text-[10px] text-red-400/60 font-medium">Risco {emp.risk === 'critical' ? 'Crítico de Saída' : 'por Burnout'}</p>
                                        </div>
                                        <button
                                            onClick={() => { setSelectedEmp(emp); setIsDrawerOpen(true); }}
                                            className="p-2 rounded-xl text-purple-300/40 hover:text-white transition-all"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="glass-panel p-6 rounded-[2rem] border border-emerald-500/10 bg-emerald-500/5 group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-base font-bold text-emerald-400 m-0">Inovação Zero Papel</h3>
                                    <p className="text-[11px] text-emerald-400/40">Status: 100% Digital</p>
                                </div>
                                <div className="p-2 bg-emerald-400/20 rounded-xl">
                                    <ScanLine className="w-5 h-5 text-emerald-400" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-1.5 bg-emerald-400/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-400 w-[100%]" />
                                </div>
                                <p className="text-[10px] text-emerald-400/60 leading-relaxed italic">
                                    "A plataforma validou 12 novos documentos via IA hoje, economizando 4h de triagem manual."
                                </p>
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
