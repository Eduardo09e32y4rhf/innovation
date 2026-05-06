'use client';

import { useState, useCallback, DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    MoreVertical,
    MessageSquare,
    Calendar,
    BrainCircuit,
    ChevronRight,
    Plus,
    GripVertical,
    CheckSquare,
    Square,
    Mail,
    X
} from 'lucide-react';

interface Candidate {
    id: string;
    name: string;
    email: string;
    position: string;
    match_score: number;
    status: string;
    applied_at: string;
    tags: string[];
    avatar?: string;
    selected?: boolean;
}

const INITIAL_CANDIDATES: Candidate[] = [
    { id: '1', name: 'Alice Smith', email: 'alice@example.com', position: 'Senior Fullstack Developer', match_score: 98, status: 'received', applied_at: '2026-02-28', tags: ['React', 'Node.js', 'Go'], avatar: 'AS' },
    { id: '2', name: 'Bob Johnson', email: 'bob@example.com', position: 'Senior Fullstack Developer', match_score: 85, status: 'triagem', applied_at: '2026-03-01', tags: ['Python', 'FastAPI', 'React'], avatar: 'BJ' },
    { id: '3', name: 'Charlie Brown', email: 'charlie@example.com', position: 'Senior Fullstack Developer', match_score: 92, status: 'interview', applied_at: '2026-02-25', tags: ['AWS', 'Next.js', 'PostgreSQL'], avatar: 'CB' },
    { id: '4', name: 'Diana Prince', email: 'diana@example.com', position: 'Senior Fullstack Developer', match_score: 78, status: 'received', applied_at: '2026-03-01', tags: ['Tailwind', 'TypeScript'], avatar: 'DP' },
];

const COLUMNS = [
    { id: 'received', label: '📥 Recebidos', color: 'border-blue-500/30 bg-blue-500/5' },
    { id: 'triagem', label: '🧠 Triagem IA', color: 'border-purple-500/30 bg-purple-500/5' },
    { id: 'interview', label: '📅 Entrevista', color: 'border-yellow-500/30 bg-yellow-500/5' },
    { id: 'technical', label: '💻 Teste Técnico', color: 'border-orange-500/30 bg-orange-500/5' },
    { id: 'hired', label: '✅ Contratado', color: 'border-green-500/30 bg-green-500/5' },
];

export function ATSKanban() {
    const [candidates, setCandidates] = useState<Candidate[]>(INITIAL_CANDIDATES);
    const [searchTerm, setSearchTerm] = useState('');
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageText, setMessageText] = useState('');

    // Toggle single selection
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Toggle all in view
    const toggleSelectAll = () => {
        if (selectedIds.length === filteredCandidates.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredCandidates.map(c => c.id));
        }
    };

    // Send bulk message
    const sendBulkMessage = () => {
        console.log('Sending message to:', selectedIds, messageText);
        setShowMessageModal(false);
        setMessageText('');
        setSelectedIds([]);
    };

    // Filter candidates
    const filteredCandidates = candidates.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.position.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Get candidates by status
    const getCandidatesByStatus = useCallback((status: string) => {
        return filteredCandidates.filter(c => c.status === status);
    }, [filteredCandidates]);

    // Handle drag start
    const handleDragStart = (e: DragEvent, candidateId: string) => {
        e.dataTransfer.setData('candidateId', candidateId);
        e.dataTransfer.effectAllowed = 'move';
    };

    // Handle drag over
    const handleDragOver = (e: DragEvent, columnId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverColumn(columnId);
    };

    // Handle drag leave
    const handleDragLeave = () => {
        setDragOverColumn(null);
    };

    // Handle drop
    const handleDrop = (e: DragEvent, targetStatus: string) => {
        e.preventDefault();
        const candidateId = e.dataTransfer.getData('candidateId');
        
        if (candidateId) {
            setCandidates(prev => prev.map(c => 
                c.id === candidateId ? { ...c, status: targetStatus } : c
            ));
        }
        
        setDragOverColumn(null);
    };

    // Move candidate to next stage
    const moveCandidate = (id: string, currentStatus: string) => {
        const currentIndex = COLUMNS.findIndex(col => col.id === currentStatus);
        const nextStatus = COLUMNS[(currentIndex + 1) % COLUMNS.length].id;
        setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: nextStatus } : c));
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        if (score >= 75) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
        return 'text-red-400 bg-red-500/10 border-red-500/20';
    };

    return (
        <div className="space-y-6">
            {/* Header Control */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Pesquisar candidatos, vagas ou tecnologias..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-800 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-all placeholder-gray-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
<div className="flex gap-2 items-center">
                    {/* Bulk Actions Toolbar */}
                    <button
                        onClick={toggleSelectAll}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-2 text-sm"
                    >
                        {selectedIds.length === filteredCandidates.length && filteredCandidates.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        <span>Selecionar</span>
                    </button>
                    
                    {selectedIds.length > 0 && (
                        <>
                            <span className="text-xs text-gray-400 px-2">
                                {selectedIds.length} selecionado{selectedIds.length !== 1 ? 's' : ''}
                            </span>
                            <button
                                onClick={() => setShowMessageModal(true)}
                                className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors flex items-center gap-2 text-sm"
                            >
                                <Mail className="w-4 h-4" />
                                <span>Enviar Mensagem</span>
                            </button>
                        </>
                    )}
                    
                    <div className="flex -space-x-2 ml-auto">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-gray-950 bg-gray-800 flex items-center justify-center text-[10px] font-bold">
                                {['AS', 'CS', 'MO', 'JP'][i - 1]}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4">
                {COLUMNS.map(col => (
                    <div key={col.id} className="w-80 flex-shrink-0 flex flex-col gap-4">
                        {/* Column Header */}
                        <div className={`p-3 rounded-2xl border ${col.color} flex items-center justify-between`}>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{col.label}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                                    {getCandidatesByStatus(col.id).length}
                                </span>
                            </div>
                            <button
                                className="text-gray-500 hover:text-white transition-colors"
                                aria-label={`Opções da coluna ${col.label}`}
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Droppable Area */}
                        <div
                            className={`flex flex-col gap-3 min-h-[500px] rounded-xl transition-all ${
                                dragOverColumn === col.id 
                                    ? 'bg-blue-500/20 border-2 border-dashed border-blue-500' 
                                    : ''
                            }`}
                            onDragOver={(e) => handleDragOver(e, col.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            <AnimatePresence mode="popLayout">
                                {getCandidatesByStatus(col.id).map((candidate) => (
                                    <motion.div
                                        key={candidate.id}
                                        layout
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, candidate.id)}
                                        className="group bg-white border border-gray-800 hover:border-blue-500/50 rounded-2xl p-4 cursor-grab active:cursor-grabbing relative overflow-hidden transition-all shadow-sm hover:shadow-blue-500/10"
                                    >
                                        {/* Drag Handle */}
                                        <div className="absolute top-2 right-2 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <GripVertical className="w-4 h-4" />
                                        </div>

                                        {/* Top Metadata */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center font-bold text-xs ring-2 ring-gray-950">
                                                    {candidate.avatar}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors leading-none mb-1">{candidate.name}</h4>
                                                    <p className="text-[10px] text-gray-500">{candidate.position}</p>
                                                </div>
                                            </div>
                                            {/* Ranking IA Badge */}
                                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-black tracking-wider ${getScoreColor(candidate.match_score)}`}>
                                                <BrainCircuit className="w-3 h-3" />
                                                {candidate.match_score}%
                                            </div>
                                        </div>

                                        {/* Tags/Keywords */}
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {candidate.tags.map(tag => (
                                                <span key={tag} className="text-[9px] px-2 py-0.5 rounded-md bg-gray-800 border border-gray-700 text-gray-400">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Actions / Info */}
                                        <div className="flex items-center justify-between pt-3 border-t border-gray-800/50">
                                            <div className="flex gap-3">
                                                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                    <MessageSquare className="w-3 h-3" /> 2
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                    <Calendar className="w-3 h-3" /> 15h
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => moveCandidate(candidate.id, candidate.status)}
                                                    className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:bg-blue-500 hover:text-slate-900 transition-all"
                                                    aria-label="Avançar candidato"
                                                    title="Avançar candidato"
                                                >
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gray-800">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                                                style={{ width: `${candidate.match_score}%` }}
                                            />
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                ))}

                {/* Add Stage Column */}
                <div className="w-80 flex-shrink-0">
                    <button
                        className="w-full h-full rounded-2xl border-2 border-dashed border-gray-800 flex flex-col items-center justify-center opacity-30 hover:opacity-100 hover:border-blue-500/50 transition-all cursor-pointer"
                        aria-label="Adicionar nova etapa"
                    >
                        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Plus className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 group-hover:text-blue-600">Adicionar Etapa</p>
                    </button>
</div>
            </div>

            {/* Bulk Message Modal */}
            {showMessageModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Enviar Mensagem em Massa</h3>
                            <button onClick={() => setShowMessageModal(false)} className="p-1 hover:bg-white/10 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">
                            Enviando para {selectedIds.length} candidato{selectedIds.length !== 1 ? 's' : ''}
                        </p>
                        <textarea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            className="w-full h-40 bg-white/5 border border-gray-700 rounded-xl p-4 text-white resize-none focus:outline-none focus:border-purple-500"
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button 
                                onClick={() => setShowMessageModal(false)}
                                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={sendBulkMessage}
                                disabled={!messageText.trim()}
                                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
