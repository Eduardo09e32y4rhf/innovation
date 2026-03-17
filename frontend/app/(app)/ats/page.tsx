'use client';

import AppLayout from '@/components/AppLayout';
import { Users, FileText, CheckCircle, XCircle, Plus, Loader2, Search, Filter, MapPin, Briefcase, ChevronRight, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ATSService } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface Job {
    id: number;
    title: string;
    status: string;
    location?: string;
    type?: string;
    description?: string;
}

interface ApplicationStat {
    total: number;
    approved: number;
    rejected: number;
}

// ─── STAT CARD ───────────────────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, colorClass }: any) {
    return (
        <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-blue-100/40 transition-all group relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colorClass} opacity-[0.03] group-hover:opacity-[0.07] transition-opacity rounded-bl-[4rem]`} />
            <div className="relative z-10 flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 shadow-sm ${colorClass.split(' ')[0].replace('from-', 'text-')}`}>
                    <Icon size={24} />
                </div>
                <div>
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{title}</h3>
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
                </div>
            </div>
        </div>
    );
}

export default function ATSPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', location: '', type: 'CLT' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const data = await ATSService.getCompanyJobs();
            setJobs(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateJob = async () => {
        if (!form.title) return;
        setSaving(true);
        try {
            await ATSService.createJob({ ...form, status: 'open' });
            setShowCreate(false);
            setForm({ title: '', description: '', location: '', type: 'CLT' });
            await loadData();
        } finally {
            setSaving(false);
        }
    };

    const getPhaseLabel = (status: string) => {
        const map: Record<string, string> = {
            open: 'Triagem Ativa',
            closed: 'Finalizado',
            paused: 'Em Pausa',
        };
        return map[status] || status;
    };

    return (
        <AppLayout title="Recrutamento & Seleção (ATS)">
            <div className="p-8 space-y-10 animate-in fade-in duration-700">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Recrutamento <span className="text-blue-600">Cognitivo</span></h1>
                        <p className="text-slate-500 font-medium tracking-tight">Atraia os melhores talentos através de triagem neural e análise de perfil DISC.</p>
                    </div>

                    <button
                        onClick={() => setShowCreate(true)}
                        className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-blue-100 hover:scale-[1.02] transition-all"
                    >
                        <Plus size={18} /> Publicar Nova Vaga
                    </button>
                </div>

                {/* Dashboard KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        title="Vagas Abertas"
                        value={jobs.filter(j => j.status === 'open').length}
                        icon={Briefcase}
                        colorClass="from-indigo-600 to-blue-500"
                    />
                    <StatCard
                        title="Total Candidatos"
                        value="128"
                        icon={Users}
                        colorClass="from-emerald-600 to-teal-500"
                    />
                    <StatCard
                        title="Preenchidas"
                        value={jobs.filter(j => j.status !== 'open').length}
                        icon={CheckCircle}
                        colorClass="from-amber-600 to-orange-500"
                    />
                </div>

                {/* Main Content Area */}
                <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                            <FileText size={24} className="text-blue-600" /> Pipeline de Oportunidades
                        </h2>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" placeholder="Filtrar vagas..." className="w-full bg-slate-50 border-slate-100 rounded-xl py-2.5 pl-11 pr-4 text-xs font-medium focus:ring-4 focus:ring-indigo-50 outline-none transition-all" />
                            </div>
                            <button className="p-2.5 bg-slate-50 rounded-xl border-slate-100 text-slate-400 hover:text-blue-600 transition-all" aria-label="Filtrar vagas">
                                <Filter size={18} />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-200 mb-4" />
                            <p className="text-[10px] font-black uppercase text-slate-700 tracking-[0.2em]">Sincronizando banco de talentos...</p>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-100">
                            <Briefcase className="w-16 h-16 mx-auto mb-4 text-slate-800" />

                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhuma vaga publicada no momento.</p>
                            <button onClick={() => setShowCreate(true)} className="mt-4 text-blue-600 font-black uppercase text-xs hover:underline">Iniciar Processo Seletivo</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {jobs.map((job) => (
                                <div key={job.id} className="group flex flex-col md:flex-row items-center justify-between p-6 bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[1.8rem] hover:border-indigo-100 hover:shadow-xl hover:shadow-blue-100/30 transition-all cursor-pointer">
                                    <div className="flex items-center gap-5 w-full md:w-auto mb-4 md:mb-0">
                                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-blue-600 shadow-inner group-hover:scale-110 transition-transform">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{job.title}</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><MapPin size={12} /> {job.location || 'Remoto'}</span>
                                                <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600/60 uppercase tracking-widest"><Briefcase size={12} /> {job.type}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${job.status === 'open' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                                                }`}>
                                                {getPhaseLabel(job.status)}
                                            </span>
                                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none mt-1">Status Global</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 group-hover:bg-blue-600 group-hover:text-slate-900 transition-all">
                                            <ChevronRight size={20} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Newsletter / IA Tip */}
                <div className="bg-blue-600 rounded-[2.5rem] p-10 text-slate-900 shadow-xl shadow-blue-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-bl-[10rem] pointer-events-none" />

                    <div className="relative z-10 max-w-2xl">
                        <h2 className="text-3xl font-black tracking-tight mb-4 italic">Otimize com Recrutamento Neural.</h2>
                        <p className="text-indigo-100 font-medium leading-relaxed mb-8">Nossa IA analisa automaticamente o currículo, realiza o teste DISC e classifica os candidatos com base na cultura da sua empresa, economizando até 80% do tempo de triagem.</p>
                        <div className="flex flex-wrap gap-4">
                            <div className="bg-white border-slate-200 border-black/5 shadow-sm/20 backdrop-blur-md px-5 py-3 rounded-2xl border-white/20 flex items-center gap-2">
                                <CheckCircle size={18} className="text-indigo-200" />
                                <span className="text-xs font-black uppercase tracking-widest">Triagem 360º</span>
                            </div>
                            <div className="bg-white border-slate-200 border-black/5 shadow-sm/20 backdrop-blur-md px-5 py-3 rounded-2xl border-white/20 flex items-center gap-2">
                                <Plus size={18} className="text-indigo-200" />
                                <span className="text-xs font-black uppercase tracking-widest">Dashboards em tempo real</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Job Modal */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-50/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white w-full max-w-xl p-10 rounded-[2.8rem] shadow-2xl relative" onClick={e => e.stopPropagation()}>

                            <div className="flex justify-between items-center mb-10">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nova Oportunidade</h2>
                                <button onClick={() => setShowCreate(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:bg-slate-100 transition-all" aria-label="Fechar modal"><X size={20} /></button>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Título da Vaga</label>
                                        <input type="text" className="w-full bg-slate-50 border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-50 outline-none" placeholder="Ex: Desenvolvedor Fullstack" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Localização</label>
                                        <input type="text" className="w-full bg-slate-50 border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-50 outline-none" placeholder="Ex: São Paulo / Remoto" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Contrato</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['CLT', 'PJ', 'Freelancer', 'Estágio'].map(t => (
                                            <button key={t} onClick={() => setForm({ ...form, type: t })} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.type === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{t}</button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Descrição & Requisitos</label>
                                    <textarea rows={4} className="w-full bg-slate-50 border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-50 outline-none resize-none" placeholder="Detalhes da vaga..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                </div>

                                <button onClick={handleCreateJob} disabled={saving} className="w-full bg-blue-600 text-white font-black py-5 rounded-[1.8rem] shadow-xl shadow-blue-100 uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-95 transition-all mt-4">
                                    {saving ? 'PUBLICANDO...' : 'PUBLICAR VAGA AGORA'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AppLayout>
    );
}
