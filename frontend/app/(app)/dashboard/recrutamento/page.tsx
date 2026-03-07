'use client';

import React, { useState } from 'react';
import {
    Search,
    Filter,
    MoreHorizontal,
    Calendar,
    Briefcase,
    ChevronDown,
    Sparkles,
    Users,
    Clock,
    MapPin,
    Building,
    CheckCircle2,
    BrainCircuit,
    MessageSquare,
    GripVertical,
    Plus
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';

// --- DADOS SIMULADOS (Mock Data do Backend) ---
const vagas = [
    { id: 1, titulo: 'Engenheiro de Software Sénior', departamento: 'Tecnologia', local: 'Remoto', status: 'Publicada' },
    { id: 2, titulo: 'Product Manager', departamento: 'Produto', local: 'Híbrido', status: 'Publicada' },
];

const candidatosIniciais = [
    { id: 101, nome: 'Tiago Mendes', fase: 'novos', matchIA: null, data: 'Há 2h', cargoAtual: 'Software Engineer na TechCorp', experiencia: '5 anos', tags: ['React', 'Node.js', 'AWS'] },
    { id: 102, nome: 'Sofia Almeida', fase: 'novos', matchIA: null, data: 'Ontem', cargoAtual: 'Tech Lead', experiencia: '8 anos', tags: ['Python', 'Liderança', 'GCP'] },
    { id: 103, nome: 'Marcos Costa', fase: 'novos', matchIA: null, data: 'Ontem', cargoAtual: 'Backend Developer', experiencia: '3 anos', tags: ['Java', 'SQL', 'Docker'] },

    { id: 201, nome: 'Ricardo Gomes', fase: 'triagem', matchIA: 96, data: '05 Mar', cargoAtual: 'Senior Dev na FinTech', experiencia: '7 anos', tags: ['Arquitetura', 'Go', 'K8s'] },
    { id: 202, nome: 'Laura Silva', fase: 'triagem', matchIA: 88, data: '04 Mar', cargoAtual: 'Desenvolvedora Full Stack', experiencia: '4 anos', tags: ['React', 'TypeScript'] },
    { id: 203, nome: 'Bruno Fernandes', fase: 'triagem', matchIA: 65, data: '04 Mar', cargoAtual: 'Pleno Dev', experiencia: '3 anos', tags: ['Vue.js', 'PHP'] },

    { id: 301, nome: 'Diana Rocha', fase: 'entrevista', matchIA: 94, data: '02 Mar', cargoAtual: 'Engenheira Sénior', experiencia: '6 anos', tags: ['Node.js', 'Microserviços'], entrevista: 'Amanhã, 14:00' },

    { id: 401, nome: 'Pedro Carvalho', fase: 'proposta', matchIA: 92, data: '28 Fev', cargoAtual: 'Arquiteto de Soluções', experiencia: '10 anos', tags: ['Tech Lead', 'Cloud'] },
];

// --- COMPONENTES VISUAIS (Design System Enterprise) ---

const Avatar = ({ name }: { name: string }) => {
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const colors = ['bg-indigo-600', 'bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-slate-700'];
    const colorIndex = name.charCodeAt(0) % colors.length;

    return (
        <div className={`w-9 h-9 rounded-md flex items-center justify-center text-white text-xs font-bold shadow-sm ${colors[colorIndex]}`}>
            {initials}
        </div>
    );
};

const KanbanCard = ({ candidato }: { candidato: any }) => {
    const getMatchStatus = (score: number | null) => {
        if (!score) return { color: 'text-zinc-500', bg: 'bg-zinc-800/50', border: 'border-zinc-800', bar: 'w-0', label: 'Análise Pendente' };
        if (score >= 90) return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', bar: 'bg-emerald-500', label: 'Excelente Fit' };
        if (score >= 75) return { color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', bar: 'bg-indigo-500', label: 'Bom Fit' };
        return { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', bar: 'bg-amber-500', label: 'Atenção' };
    };

    const match = getMatchStatus(candidato.matchIA);

    return (
        <div className="bg-[#18181b] border border-zinc-800 hover:border-zinc-600 p-4 rounded-xl cursor-grab active:cursor-grabbing transition-all group flex flex-col gap-3 shadow-sm relative">

            <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-zinc-600 transition-opacity">
                <GripVertical size={14} />
            </div>

            <div className="flex justify-between items-start pl-2">
                <div className="flex gap-3 items-center">
                    <Avatar name={candidato.nome} />
                    <div>
                        <h4 className="font-semibold text-zinc-100 text-sm group-hover:text-indigo-400 transition-colors leading-tight">
                            {candidato.nome}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                            <Briefcase size={12} />
                            <span className="line-clamp-1">{candidato.cargoAtual}</span>
                        </div>
                    </div>
                </div>
                <button className="text-zinc-500 hover:text-zinc-300 p-1 rounded-md hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100">
                    <MoreHorizontal size={16} />
                </button>
            </div>

            <div className={`mt-1 ml-2 p-2 rounded-lg border ${match.bg} ${match.border} flex flex-col gap-1.5`}>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                        {candidato.matchIA ? <Sparkles size={12} className={match.color} /> : <BrainCircuit size={12} className="text-zinc-500" />}
                        {match.label}
                    </span>
                    <span className={`text-xs font-black ${match.color}`}>
                        {candidato.matchIA ? `${candidato.matchIA}%` : '--'}
                    </span>
                </div>
                <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${match.bar}`}
                        style={{ width: candidato.matchIA ? `${candidato.matchIA}%` : '0%' }}
                    ></div>
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pl-2">
                {candidato.tags.map((tag: string) => (
                    <span key={tag} className="text-[10px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md">
                        {tag}
                    </span>
                ))}
            </div>

            <div className="flex items-center justify-between mt-2 pt-3 border-t border-zinc-800/50 pl-2">
                <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-500">
                    <span className="flex items-center gap-1"><Clock size={12} /> {candidato.data}</span>
                    <span className="flex items-center gap-1"><Building size={12} /> {candidato.experiencia}</span>
                </div>

                <button className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md hover:bg-emerald-500 hover:text-white">
                    <MessageSquare size={12} /> Chat
                </button>
            </div>

            {candidato.entrevista && (
                <div className="mt-1 ml-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold px-2.5 py-1.5 rounded-md flex items-center gap-2">
                    <Calendar size={12} /> Entrevista: {candidato.entrevista}
                </div>
            )}
        </div>
    );
};

export default function RecrutamentoPage() {
    const [vagaSelecionada, setVagaSelecionada] = useState(vagas[0]);
    const [candidatos, setCandidatos] = useState(candidatosIniciais);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const analisarCurriculosIA = () => {
        setIsAnalyzing(true);
        setTimeout(() => {
            setCandidatos(prev => prev.map(c => {
                if (c.fase === 'novos') {
                    return { ...c, fase: 'triagem', matchIA: Math.floor(Math.random() * (99 - 70 + 1)) + 70 };
                }
                return c;
            }));
            setIsAnalyzing(false);
        }, 1800);
    };

    const getCandidatos = (fase: string) => candidatos.filter(c => c.fase === fase);

    return (
        <AppLayout title={`Recrutamento IA — ${vagaSelecionada.titulo}`}>
            <div className="h-full flex flex-col overflow-hidden selection:bg-indigo-500/30">

                {/* BARRA DE FERRAMENTAS E IA */}
                <div className="bg-[#0f0f13]/50 backdrop-blur-md px-6 py-3 border-b border-zinc-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                            <input
                                type="text"
                                placeholder="Buscar candidato, tag ou skill..."
                                className="w-full bg-[#18181b] border border-zinc-800 rounded-md py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 ring-indigo-500/50 transition-all text-zinc-200 placeholder:text-zinc-600"
                            />
                        </div>
                        <button className="bg-[#18181b] border border-zinc-800 hover:border-zinc-700 p-1.5 rounded-md text-zinc-400 transition-colors">
                            <Filter size={16} />
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 w-full md:w-auto">
                        <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
                            <span><strong className="text-zinc-300">{candidatos.length}</strong> no total</span>
                            <div className="w-1 h-1 rounded-full bg-zinc-700"></div>
                            <span><strong className="text-indigo-400">{candidatos.filter(c => c.matchIA).length}</strong> analisados</span>
                        </div>

                        <button
                            onClick={analisarCurriculosIA}
                            disabled={isAnalyzing || getCandidatos('novos').length === 0}
                            className="w-full md:w-auto bg-[#8b5cf6] hover:bg-[#a78bfa] disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-4 py-2 md:py-1.5 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_2px_10px_rgba(139,92,246,0.2)] disabled:shadow-none"
                        >
                            {isAnalyzing ? (
                                <><BrainCircuit size={16} className="animate-spin" /> Processando CVs...</>
                            ) : (
                                <><Sparkles size={16} /> Analisar com IA Premium</>
                            )}
                        </button>
                    </div>
                </div>

                {/* QUADRO KANBAN */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 md:p-6 custom-scrollbar">
                    <div className="flex gap-4 h-full min-w-max pb-2">

                        <div className="w-[300px] md:w-[320px] flex flex-col flex-shrink-0 bg-[#0f0f13]/40 border border-zinc-800/50 rounded-xl overflow-hidden">
                            <div className="p-3 border-b border-zinc-800/80 flex justify-between items-center bg-[#141418]/60">
                                <h3 className="font-semibold text-zinc-300 text-sm flex items-center gap-2 uppercase tracking-wide">
                                    <span className="w-2 h-2 rounded-full bg-zinc-600"></span>
                                    Recebidos
                                </h3>
                                <span className="bg-zinc-800 text-zinc-400 text-xs font-bold px-2 py-0.5 rounded">
                                    {getCandidatos('novos').length}
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar">
                                {getCandidatos('novos').map(c => <KanbanCard key={c.id} candidato={c} />)}
                                {getCandidatos('novos').length === 0 && (
                                    <div className="text-center p-6 border border-dashed border-zinc-800 rounded-lg text-zinc-600 text-xs font-medium m-2">
                                        Caixa de entrada vazia.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="w-[300px] md:w-[320px] flex flex-col flex-shrink-0 bg-[#8b5cf6]/5 border border-[#8b5cf6]/20 rounded-xl overflow-hidden ring-1 ring-[#8b5cf6]/10 shadow-[0_0_30px_rgba(139,92,246,0.03)]">
                            <div className="p-3 border-b border-[#8b5cf6]/30 flex justify-between items-center bg-[#8b5cf6]/10">
                                <h3 className="font-bold text-[#a78bfa] text-sm flex items-center gap-2 uppercase tracking-wide">
                                    <Sparkles size={14} />
                                    Match IA Premium
                                </h3>
                                <span className="bg-[#8b5cf6]/20 text-[#a78bfa] text-xs font-bold px-2 py-0.5 rounded border border-[#8b5cf6]/30">
                                    {getCandidatos('triagem').length}
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar">
                                {getCandidatos('triagem')
                                    .sort((a, b) => (b.matchIA || 0) - (a.matchIA || 0))
                                    .map(c => <KanbanCard key={c.id} candidato={c} />)}
                            </div>
                        </div>

                        <div className="w-[300px] md:w-[320px] flex flex-col flex-shrink-0 bg-[#0f0f13]/40 border border-zinc-800/50 rounded-xl overflow-hidden">
                            <div className="p-3 border-b border-zinc-800/80 flex justify-between items-center bg-[#141418]/60">
                                <h3 className="font-semibold text-zinc-300 text-sm flex items-center gap-2 uppercase tracking-wide">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Em Entrevista
                                </h3>
                                <span className="bg-zinc-800 text-zinc-400 text-xs font-bold px-2 py-0.5 rounded">
                                    {getCandidatos('entrevista').length}
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar">
                                {getCandidatos('entrevista').map(c => <KanbanCard key={c.id} candidato={c} />)}
                            </div>
                        </div>

                        <div className="w-[300px] md:w-[320px] flex flex-col flex-shrink-0 bg-[#0f0f13]/40 border border-zinc-800/50 rounded-xl overflow-hidden">
                            <div className="p-3 border-b border-zinc-800/80 flex justify-between items-center bg-[#141418]/60">
                                <h3 className="font-semibold text-zinc-300 text-sm flex items-center gap-2 uppercase tracking-wide">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    Proposta Final
                                </h3>
                                <span className="bg-zinc-800 text-zinc-400 text-xs font-bold px-2 py-0.5 rounded">
                                    {getCandidatos('proposta').length}
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar">
                                {getCandidatos('proposta').map(c => <KanbanCard key={c.id} candidato={c} />)}
                            </div>
                        </div>

                    </div>
                </div>

                <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 8px; }
          .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #3f3f46; }
        `}</style>
            </div>
        </AppLayout>
    );
}
