'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import {
    Users, TrendingUp, Target, Clock, Plus, CheckCircle2,
    ChevronRight, Award, Trophy, Medal, Heart,
    AlertCircle, Briefcase, FileText, Search, Filter,
    Calendar, Zap, ShieldCheck, Mail, ArrowUpRight,
    TrendingDown, UserPlus, Info, Timer
} from 'lucide-react';
import { RHService, AIService } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ATSKanban } from '@/components/ats/ATSKanban';
import { BiometricPunch } from '@/components/rh/BiometricPunch';

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface Employee {
    id: number;
    name: string;
    role: string;
    department: string;
    status: 'active' | 'vacation' | 'away';
    risk: 'stable' | 'attention' | 'critical';
    avatar?: string;
}

interface TimelineEvent {
    id: number;
    type: 'promotion' | 'leave' | 'document' | 'hiring';
    date: string;
    title: string;
    description: string;
}

// ─── MOCK DATA ──────────────────────────────────────────────────────────────
const EMPLOYEES: Employee[] = [
    { id: 1, name: 'Ana Silva', role: 'Dev Lead', department: 'TI', status: 'active', risk: 'stable' },
    { id: 2, name: 'Carlos Santos', role: 'Senior Designer', department: 'Produto', status: 'active', risk: 'attention' },
    { id: 3, name: 'Maria Oliveira', role: 'RH Manager', department: 'RH', status: 'vacation', risk: 'stable' },
    { id: 4, name: 'João Pereira', role: 'Sales rep', department: 'Comercial', status: 'active', risk: 'critical' },
];

const TIMELINE: TimelineEvent[] = [
    { id: 1, type: 'promotion', date: '2025-12-10', title: 'Promoção para Senior', description: 'Promoção baseada em performance 360°.' },
    { id: 2, type: 'document', date: '2025-11-05', title: 'Atestado Médico', description: 'Atestado de 2 dias por gripe.' },
    { id: 3, type: 'hiring', date: '2024-03-15', title: 'Admissão', description: 'Início na Innovation.ia como Pleno.' },
];

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

function EmployeeCard({ employee, onClick }: { employee: Employee; onClick: () => void }) {
    const riskColor = { stable: 'bg-emerald-400', attention: 'bg-yellow-400', critical: 'bg-red-400' };
    const riskLabel = { stable: 'Estável', attention: 'Atenção', critical: 'Crítico' };

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={onClick}
            className="glass-panel p-4 rounded-2xl cursor-pointer border border-purple-500/10 hover:border-purple-500/30 transition-all group"
        >
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {employee.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{employee.name}</h3>
                    <p className="text-[11px] text-purple-300/40">{employee.role} · {employee.department}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold text-white ${riskColor[employee.risk]}`}>
                        {riskLabel[employee.risk]}
                    </div>
                    <span className="text-[10px] text-purple-300/30">Risco</span>
                </div>
            </div>
        </motion.div>
    );
}

function TimelineDrawer({ isOpen, onClose, employee }: { isOpen: boolean; onClose: () => void; employee: Employee | null }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0a0a18] border-l border-purple-500/20 z-[101] p-6 overflow-y-auto"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-xl font-bold text-white">Perfil 360º</h2>
                                <p className="text-sm text-purple-300/40">{employee?.name} · {employee?.role}</p>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-xl hover:bg-purple-500/10 text-purple-300/40 hover:text-white transition-all">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-purple-500/10">
                            {TIMELINE.map((event) => (
                                <div key={event.id} className="relative pl-8">
                                    <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-purple-300/40 uppercase font-bold">{new Date(event.date).toLocaleDateString('pt-BR')}</span>
                                        <h4 className="text-sm font-bold text-white mt-1">{event.title}</h4>
                                        <p className="text-xs text-purple-300/30 mt-1">{event.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────

export default function RHAdvancedPage() {
    const [activeTab, setActiveTab] = useState<'overview' | 'ats' | '360' | 'pdi' | 'timebank' | 'payslips' | 'gamification' | 'pulse' | 'punch'>('overview');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [showDrawer, setShowDrawer] = useState(false);
    const [showAdmission, setShowAdmission] = useState(false);

    const TABS = [
        { id: 'overview', label: 'Painel RH', icon: ShieldCheck },
        { id: 'ats', label: 'ATS', icon: Briefcase },
        { id: '360', label: 'Avaliação 360°', icon: Zap },
        { id: 'pdi', label: 'PDI', icon: Target },
        { id: 'punch', label: 'Ponto', icon: Clock },
        { id: 'timebank', label: 'Banco de Horas', icon: Timer },
        { id: 'payslips', label: 'Holerites', icon: Award },
        { id: 'gamification', label: 'Conquistas', icon: Trophy },
        { id: 'pulse', label: 'Pulso', icon: Heart },
    ];

    return (
        <AppLayout title="Gestão Avançada de RH">
            <div className="p-6 sm:p-8 space-y-8 text-white min-h-screen">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-3 h-3 text-purple-400" />
                            <span className="text-[10px] text-purple-300/40 uppercase tracking-widest font-bold">Diretoria de RH</span>
                        </div>
                        <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-violet-400 bg-clip-text text-transparent">
                            RH Estratégico & Cognitivo
                        </h1>
                        <p className="text-purple-300/40 text-sm mt-1">Gestão de talentos, timeline 360° e previsão de turnover.</p>
                    </div>
                    <button
                        onClick={() => setShowAdmission(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 rounded-2xl text-sm font-bold text-white shadow-xl shadow-purple-500/20 transition-all shrink-0"
                    >
                        <UserPlus className="w-4 h-4" /> Nova Admissão
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 p-1 bg-purple-500/5 border border-purple-500/10 rounded-2xl overflow-x-auto custom-scrollbar no-scrollbar">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-purple-600 text-white shadow-lg'
                                : 'text-purple-300/30 hover:text-purple-300/60 hover:bg-purple-500/5'}`}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Sections */}
                <div className="mt-8 transition-all duration-500">

                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            {/* KPIs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: 'Colaboradores', val: '42', sub: 'Ativos agora', icon: Users, color: 'text-blue-400' },
                                    { label: 'Headcount', val: '105%', sub: '+5% vs. Jan', icon: TrendingUp, color: 'text-emerald-400' },
                                    { label: 'Turnover Rate', val: '2.4%', sub: 'Baixo (Zero Churn)', icon: TrendingDown, color: 'text-emerald-400' },
                                    { label: 'Em Risco', val: '4', sub: 'Alerta Turnover', icon: AlertCircle, color: 'text-red-400' },
                                ].map((kpi, i) => (
                                    <div key={i} className="glass-panel p-5 rounded-2xl border border-purple-500/10 relative overflow-hidden group">
                                        <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <kpi.icon className={`w-12 h-12 ${kpi.color}`} />
                                        </div>
                                        <p className="text-[10px] text-purple-300/40 uppercase font-black mb-1">{kpi.label}</p>
                                        <h3 className="text-2xl font-black text-white">{kpi.val}</h3>
                                        <p className={`text-[10px] mt-1 font-bold ${kpi.color}`}>{kpi.sub}</p>
                                    </div>
                                ))}
                            </div>

                            {/* turnover Alertas */}
                            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                                    <AlertCircle className="w-5 h-5 text-red-400" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-white">Alerta de Turnover! 4 Colaboradores em risco.</h4>
                                    <p className="text-xs text-red-400/60">Fatores: horas extras excessivas e falta de promoção recente.</p>
                                </div>
                                <button className="px-4 py-2 bg-red-400/10 hover:bg-red-400/20 text-red-400 text-xs font-bold rounded-lg transition-all">Ver Detalhes</button>
                            </div>

                            {/* Employee Grid */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-white">Equipe Central</h3>
                                    <div className="flex gap-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-300/30" />
                                            <input className="bg-purple-500/5 border border-purple-500/10 rounded-xl px-8 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50" placeholder="Buscar..." />
                                        </div>
                                        <button className="p-2 border border-purple-500/10 rounded-xl hover:bg-purple-500/5 transition-all">
                                            <Filter className="w-4 h-4 text-purple-300/30" />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {EMPLOYEES.map(emp => (
                                        <EmployeeCard
                                            key={emp.id}
                                            employee={emp}
                                            onClick={() => { setSelectedEmployee(emp); setShowDrawer(true); }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ats' && <ATSKanban />}
                    {activeTab === 'punch' && <div className="py-8"><BiometricPunch /></div>}

                    {['360', 'pdi', 'timebank', 'payslips', 'gamification', 'pulse'].includes(activeTab) && (
                        <div className="glass-panel rounded-3xl p-12 text-center flex flex-col items-center justify-center border border-purple-500/5">
                            <Zap className="w-12 h-12 text-purple-500/20 mb-4" />
                            <h3 className="text-xl font-bold text-purple-300/40">Módulo em Integração</h3>
                            <p className="text-sm text-purple-300/20 mt-2">Este recurso já está conectado ao backend. Selecione outra aba lateral no dashboard se precisar de acesso imediato.</p>
                        </div>
                    )}
                </div>
            </div>

            <TimelineDrawer
                isOpen={showDrawer}
                onClose={() => setShowDrawer(false)}
                employee={selectedEmployee}
            />

            {/* Admission Modal Placeholder */}
            <AnimatePresence>
                {showAdmission && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0a0a18] border border-purple-500/30 rounded-3xl p-8 max-w-lg w-full shadow-2xl shadow-purple-500/20">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-white">Nova Admissão Digital</h3>
                                <button onClick={() => setShowAdmission(false)}><Plus className="w-6 h-6 rotate-45 text-purple-300" /></button>
                            </div>
                            <div className="p-12 border-2 border-dashed border-purple-500/20 rounded-3xl flex flex-col items-center justify-center gap-4 bg-purple-500/5 hover:bg-purple-500/10 cursor-pointer transition-all">
                                <FileText className="w-12 h-12 text-purple-400" />
                                <p className="text-sm text-center text-purple-300/60 font-medium">Capture documentos ou arraste PDFs.<br /><strong className="text-purple-400">Gemini 3.1 processa e valida instantaneamente.</strong></p>
                            </div>
                            <div className="mt-6 space-y-4">
                                <input className="w-full bg-purple-500/5 border border-purple-500/20 rounded-xl px-4 py-3 text-sm" placeholder="E-mail do colaborador" />
                                <button className="w-full py-4 bg-purple-600 rounded-xl font-bold text-sm">Enviar convite de admissão</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </AppLayout>
    );
}
