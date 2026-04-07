'use client';

import { useEffect, useState } from 'react';
import { MapPin, Briefcase, Clock, Search, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { ATSService } from '@/services/api';
import { motion } from 'framer-motion';

interface Job {
    id: number;
    title: string;
    description: string;
    location?: string;
    type?: string;
    salary?: string;
    status: string;
}

export default function JobsPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Job | null>(null);
    const [cvText, setCvText] = useState('');
    const [applying, setApplying] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        ATSService.getPublicJobs().then(data => {
            setJobs(data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const filtered = jobs.filter(j =>
        j.title.toLowerCase().includes(search.toLowerCase()) ||
        j.description?.toLowerCase().includes(search.toLowerCase())
    );

    const handleApply = async () => {
        if (!selected || !cvText) return;
        setApplying(true);
        try {
            await ATSService.applyToJob(selected.id, { cover_letter: cvText, candidate_id: 1 });
            setSuccess(true);
            setTimeout(() => { setSelected(null); setSuccess(false); setCvText(''); }, 2000);
        } catch (e) { console.error(e); }
        finally { setApplying(false); }
    };

    return (
        <div className="min-h-screen bg-white text-slate-900">
            {/* Nav */}
            <nav className="border-b border-zinc-800 py-4 px-8 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur z-10">
                <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                    Innovation.ia
                </Link>
                <div className="flex gap-4">
                    <Link href="/login" className="text-zinc-400 hover:text-slate-900 text-sm transition">Login</Link>
                    <Link href="/register" className="px-4 py-2 bg-blue-500 hover:bg-blue-500 rounded-lg text-sm font-medium transition">Criar Conta</Link>
                </div>
            </nav>

            {/* Hero */}
            <section className="py-16 px-4 text-center">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-4xl font-bold mb-4">
                        Vagas com{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                            Seleção por IA
                        </span>
                    </h1>
                    <p className="text-zinc-400 mb-8">Candidaturas analisadas em segundos. Menos espera, mais oportunidade.</p>

                    <div className="max-w-xl mx-auto flex items-center gap-3 bg-white border border-zinc-700 rounded-xl px-4 py-3">
                        <Search className="w-5 h-5 text-zinc-9000" />

                        <input
                            aria-label="Buscar vagas"
                            className="flex-1 bg-transparent text-sm outline-none"
                            placeholder="Buscar vagas por título ou skills..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </motion.div>
            </section>

            {/* Jobs */}
            <section className="px-4 pb-20 max-w-4xl mx-auto">
                {loading ? (
                    <div className="text-center py-12 text-zinc-9000">Carregando vagas...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 text-zinc-9000">
                        {search ? 'Nenhuma vaga encontrada para essa busca.' : 'Nenhuma vaga aberta no momento.'}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((job, i) => (
                            <motion.div
                                key={job.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="border border-zinc-800 hover:border-blue-500/50 rounded-2xl p-6 transition cursor-pointer group"

                                onClick={() => setSelected(job)}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">

                                                {job.type || 'CLT'}
                                            </span>
                                            <span className="text-xs text-green-400">● Aberta</span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition">{job.title}</h3>
                                        <p className="text-zinc-9000 text-sm mt-1 line-clamp-2">{job.description}</p>
                                    </div>
                                    <button className="ml-4 px-4 py-2 bg-blue-500 hover:bg-blue-500 rounded-lg text-sm font-medium transition whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                        Candidatar-se
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 mt-4 text-xs text-zinc-9000">
                                    {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                                    {job.salary && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{job.salary}</span>}
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Candidaturas abertas</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>

            {/* Modal Candidatura */}
            {selected && (
                <div className="fixed inset-0 bg-white/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-zinc-700 rounded-2xl p-6 w-full max-w-lg">

                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold">{selected.title}</h3>
                                <p className="text-zinc-400 text-sm">{selected.location} · {selected.type}</p>
                            </div>
                            <button
                                onClick={() => setSelected(null)}
                                aria-label="Fechar modal"
                                title="Fechar"
                                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded p-1"
                            >
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>

                        {success ? (
                            <div className="text-center py-8">
                                <div className="text-5xl mb-4">✅</div>
                                <p className="text-green-400 font-semibold">Candidatura enviada com sucesso!</p>
                                <p className="text-zinc-9000 text-sm mt-1">Nossa IA analisará seu perfil em segundos.</p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4">
                                    <label className="text-sm text-zinc-400 mb-2 block">Cole seu currículo / carta de apresentação</label>
                                    <textarea
                                        className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 text-sm min-h-[180px]"
                                        placeholder="Cole aqui seu currículo em texto ou uma carta de apresentação..."
                                        value={cvText}
                                        onChange={e => setCvText(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={handleApply}
                                    disabled={applying || !cvText}
                                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-sm font-semibold transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                >
                                    <Upload className="w-4 h-4 inline mr-2" />
                                    {applying ? 'Enviando para IA...' : 'Enviar Candidatura'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
