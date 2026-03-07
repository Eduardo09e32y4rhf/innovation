'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import {
    Users, TrendingUp, Target, Clock, Plus, CheckCircle2,
    ChevronRight, Award, Trophy, Medal, Heart,
    AlertCircle, Briefcase, FileText, Search, Filter,
    Calendar, Zap, ShieldCheck, Mail, ArrowUpRight,
    TrendingDown, UserPlus, Info, Timer, Upload, ScanLine, X
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

function StatCard({ title, value, detail, icon: Icon, colorClass }: any) {
    return (
        <div className="bg-white border border-slate-100 p-6 rounded-[2.2rem] shadow-sm hover:shadow-xl hover:shadow-indigo-100/40 transition-all group relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colorClass} opacity-[0.03] group-hover:opacity-[0.07] transition-opacity rounded-bl-[4rem]`} />
            <div className="relative z-10">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 bg-white border border-slate-100 shadow-sm ${colorClass.split(' ')[0].replace('from-', 'text-')}`}>
                    <Icon size={24} />
                </div>
                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{title}</h3>
                <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
                <p className="text-[11px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
                    <ArrowUpRight size={14} /> {detail}
                </p>
            </div>
        </div>
    );
}

function EmployeeCard({ employee, onClick }: { employee: Employee; onClick: () => void }) {
    const riskStyles = {
        stable: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        attention: 'bg-amber-50 text-amber-600 border-amber-100',
        critical: 'bg-rose-50 text-rose-600 border-rose-100'
    };

    const riskLabel = { stable: 'Estável', attention: 'Em Risco', critical: 'Crítico' };

    return (
        <motion.div
            layout
            whileHover={{ y: -5 }}
            onClick={onClick}
            className="bg-white border border-slate-100 p-5 rounded-[1.8rem] cursor-pointer shadow-sm hover:shadow-xl hover:shadow-indigo-100/30 transition-all group"
        >
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xl shadow-inner">
                        {employee.name[0]}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${employee.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{employee.name}</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{employee.role} · {employee.department}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${riskStyles[employee.risk]}`}>
                        {riskLabel[employee.risk]}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                        <Clock size={12} /> {employee.time_balance || 0}h
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
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white z-[101] shadow-2xl p-8 overflow-y-auto"
                    >
                        <div className="flex justify-between items-center mb-10">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-indigo-100">
                                    {employee?.name[0]}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{employee?.name}</h2>
                                    <p className="text-indigo-600 text-xs font-bold uppercase tracking-[0.1em]">{employee?.role}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-400 transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-10">
                            <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100">
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Status de IA</p>
                                <div className="flex items-center gap-2 text-emerald-600 font-black text-sm">
                                    <ShieldCheck size={18} /> 98.4% Estável
                                </div>
                            </div>
                            <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100">
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Vínculo</p>
                                <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                                    <Timer size={18} className="text-indigo-600" /> 2a 4m
                                </div>
                            </div>
                        </div>

                        <h3 className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em] mb-8 border-b border-slate-50 pb-4">
                            Timeline Cognitiva do Talento
                        </h3>

                        <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-100">
                            {loading ? (
                                [1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-50 rounded-2xl animate-pulse" />)
                            ) : events.length === 0 ? (
                                <div className="text-center py-10">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum evento registrado hoje.</p>
                                </div>
                            ) : events.map((event, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}
                                    key={event.id} className="relative pl-10"
                                >
                                    <div className="absolute left-0 top-1 w-[22px] h-[22px] rounded-full bg-white border-2 border-indigo-600 shadow-md flex items-center justify-center z-10">
                                        <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                                    </div>
                                    <div className="bg-white border border-slate-100 p-5 rounded-3xl group hover:border-indigo-100 hover:bg-slate-50/50 transition-all shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{event.title}</h4>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{event.date}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed">{event.description}</p>
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
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-white w-full max-w-md p-10 rounded-[2.8rem] shadow-2xl relative z-10 text-center"
                    >
                        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-indigo-100 shadow-inner text-indigo-600">
                            <UserPlus size={40} />
                        </div>

                        <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Admissão Cognitiva</h2>
                        <p className="text-sm text-slate-400 font-medium mb-10 px-4 leading-relaxed">Inicie o onboarding "Zero Papel". O colaborador receberá o link para envio de documentos via IA.</p>

                        {done ? (
                            <div className="py-8">
                                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                                <p className="text-emerald-600 font-black uppercase tracking-widest text-xs">Convite Enviado!</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="relative">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                    <input
                                        type="email" placeholder="E-mail do novo talento"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4.5 pl-14 pr-6 text-slate-900 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 outline-none transition-all text-sm font-medium"
                                        value={email} onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={handleSend} disabled={!email || sending}
                                    className="w-full bg-indigo-600 text-white font-black py-5 rounded-[1.8rem] shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-[0.2em] disabled:opacity-50"
                                >
                                    {sending ? 'PROCESSANDO...' : 'ENVIAR CONVITE DIGITAL'}
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
        { title: 'Headcount Ativo', value: employees.length, detail: '+2 este mês', icon: Users, colorClass: 'from-indigo-600 to-blue-500' },
        { title: 'Turnover Risk', value: '12%', detail: 'Sob controle', icon: AlertCircle, colorClass: 'from-rose-600 to-pink-500' },
        { title: 'Banco de Horas', value: '420h', detail: 'Total da equipe', icon: Clock, colorClass: 'from-amber-600 to-orange-500' },
        { title: 'Performance', value: '8.8', detail: 'Média global (↑)', icon: Target, colorClass: 'from-emerald-600 to-teal-500' },
    ];

    return (
        <AppLayout title="Gestão de Talentos">
            <div className="p-8 space-y-10 animate-in fade-in duration-700">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Pessoas <span className="text-indigo-600">& Cultura</span></h1>
                        <p className="text-slate-500 font-medium tracking-tight">Inteligência cognitiva aplicada ao desenvolvimento humano.</p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text" placeholder="Buscar talento ou cargo..."
                                className="w-full bg-white border border-slate-100 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-100 shadow-sm transition-all"
                                value={filter} onChange={e => setFilter(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-all"
                        >
                            <UserPlus size={18} /> Nova Admissão
                        </button>
                    </div>
                </div>

                {/* Dashboard KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((s, idx) => (
                        <StatCard key={idx} {...s} />
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-8 space-y-8">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                                <Users size={24} className="text-indigo-600" /> Quadro de Colaboradores
                            </h2>
                            <div className="flex gap-2 text-slate-400">
                                <button className="p-2 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100"><Filter size={18} /></button>
                                <button className="p-2 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100"><ArrowUpRight size={18} /></button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-28 bg-white border border-slate-100 rounded-3xl animate-pulse" />)}
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

                    <div className="lg:col-span-4 space-y-8">
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                            <AlertCircle size={24} className="text-rose-500" /> Alertas de Risco (IA)
                        </h2>

                        <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm space-y-5">
                            {employees.filter(e => e.risk !== 'stable').length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                                        <CheckCircle2 className="text-emerald-500" size={32} />
                                    </div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum risco detectado</p>
                                </div>
                            ) : (
                                employees.filter(e => e.risk !== 'stable').map(emp => (
                                    <div key={emp.id} className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 group transition-all hover:bg-white hover:shadow-lg hover:shadow-indigo-50 hover:border-indigo-100">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 shadow-inner">
                                            {emp.name[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-slate-900 truncate">{emp.name}</p>
                                            <p className="text-[10px] font-black uppercase text-rose-500 tracking-widest">{emp.risk === 'critical' ? 'Risco Crítico' : 'Atenção'}</p>
                                        </div>
                                        <button
                                            onClick={() => { setSelectedEmp(emp); setIsDrawerOpen(true); }}
                                            className="p-2 rounded-xl text-slate-300 group-hover:text-indigo-600 transition-all"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-emerald-100 group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-[4rem] pointer-events-none" />
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-lg font-black tracking-tight">Zero Papel</h3>
                                    <p className="text-[10px] uppercase font-black tracking-widest opacity-60">Status: 100% Digital</p>
                                </div>
                                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                    <ScanLine size={24} />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-white w-full shadow-[0_0_10px_white]" />
                                </div>
                                <p className="text-[11px] font-medium leading-relaxed italic opacity-80">
                                    "A plataforma validou 12 novos documentos via IA hoje, economizando 4h de triagem."
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
