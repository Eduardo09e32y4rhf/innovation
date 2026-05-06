'use client';

import { useState } from 'react';
import { 
    Search, 
    Mail, 
    Phone, 
    MapPin, 
    Linkedin, 
    FileText, 
    Download, 
    Star,
   Clock,
    MessageSquare,
    Calendar,
    BrainCircuit,
    ChevronLeft,
    Send,
    MoreVertical,
    Paperclip,
    Upload,
    X
} from 'lucide-react';

interface Candidate {
    id: string;
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    position: string;
    match_score: number;
    sentiment_score: number;
    status: string;
    applied_at: string;
    resume_url?: string;
    tags: string[];
    experience: {
        company: string;
        role: string;
        duration: string;
    }[];
    education: {
        degree: string;
        institution: string;
        year: string;
    }[];
notes: {
        id: string;
        author: string;
        content: string;
        date: string;
    }[];
    attachments?: {
        id: string;
        name: string;
        url: string;
        type: string;
    }[];
    timeline: {
        id: string;
        action: string;
        date: string;
        user: string;
    }[];
}

const mockCandidate: Candidate = {
    id: '1',
    name: 'Alice Smith',
    email: 'alice@example.com',
    phone: '+55 11 99999-9999',
    location: 'São Paulo, SP',
    linkedin: 'https://linkedin.com/in/alice-smith',
    position: 'Senior Fullstack Developer',
    match_score: 98,
    sentiment_score: 92,
    status: 'interview',
    applied_at: '2026-02-28',
    tags: ['React', 'Node.js', 'Go', 'AWS', 'PostgreSQL'],
    experience: [
        { company: 'Tech Corp', role: 'Senior Developer', duration: '2023 - Presente' },
        { company: 'StartupXYZ', role: 'Full Stack Developer', duration: '2020 - 2023' },
    ],
    education: [
        { degree: 'Ciência da Computação', institution: 'USP', year: '2020' },
    ],
notes: [
        { id: '1', author: 'Recruiter', content: 'Entrevista agendada para 15/03', date: '2026-03-04' },
    ],
    attachments: [
        { id: '1', name: 'curriculo_alice.pdf', url: '/files/curriculo.pdf', type: 'pdf' },
    ],
    timeline: [
        { id: '1', action: 'Candidatura recebida', date: '2026-02-28', user: 'Sistema' },
        { id: '2', action: 'Triagem IA aprovada', date: '2026-02-28', user: 'AI' },
        { id: '3', action: 'Entrevista agendada', date: '2026-03-04', user: 'Recruiter' },
    ],
};

export default function CandidateProfilePage() {
    const candidate = mockCandidate;
    const [newNote, setNewNote] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'resume' | 'timeline' | 'notes'>('overview');

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-emerald-400 bg-emerald-500/10';
        if (score >= 75) return 'text-yellow-400 bg-yellow-500/10';
        return 'text-red-400 bg-red-500/10';
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, string> = {
            received: 'bg-blue-500/20 text-blue-400',
            triagem: 'bg-purple-500/20 text-purple-400',
            interview: 'bg-yellow-500/20 text-yellow-400',
            technical: 'bg-orange-500/20 text-orange-400',
            hired: 'bg-green-500/20 text-green-400',
        };
        return badges[status] || 'bg-gray-500/20 text-gray-400';
    };

    return (
        <div className="min-h-screen bg-[#05050a] text-white">
            {/* Header */}
            <div className="border-b border-white/5 p-6">
                <div className="flex items-center gap-4 mb-4">
                    <a href="/dashboard/rh/pipeline" className="text-gray-400 hover:text-white">
                        <ChevronLeft className="w-6 h-6" />
                    </a>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(candidate.status)}`}>
                        {candidate.status.toUpperCase()}
                    </span>
                </div>
                
                <div className="flex items-start gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl font-bold">
                        AS
                    </div>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold mb-1">{candidate.name}</h1>
                        <p className="text-gray-400 mb-4">{candidate.position}</p>
                        
                        <div className="flex items-center gap-6 text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                {candidate.email}
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                {candidate.phone}
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {candidate.location}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                            <Linkedin className="w-5 h-5" />
                        </button>
                        <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                            <Mail className="w-5 h-5" />
                        </button>
                        <button className="p-3 rounded-xl grad-bg">
                            <MessageSquare className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* AI Scores */}
            <div className="grid grid-cols-4 gap-4 p-6 border-b border-white/5">
                <div className="glass rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2 text-gray-400 text-sm">
                        <BrainCircuit className="w-4 h-4" />
                        Match Score
                    </div>
                    <div className={`text-3xl font-bold ${getScoreColor(candidate.match_score)}`}>
                        {candidate.match_score}%
                    </div>
                </div>
                <div className="glass rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2 text-gray-400 text-sm">
                        <Star className="w-4 h-4" />
                        Sentiment
                    </div>
                    <div className={`text-3xl font-bold ${getScoreColor(candidate.sentiment_score)}`}>
                        {candidate.sentiment_score}%
                    </div>
                </div>
                <div className="glass rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2 text-gray-400 text-sm">
                        <Clock className="w-4 h-4" />
                        Aplicado em
                    </div>
                    <div className="text-xl font-bold">{candidate.applied_at}</div>
                </div>
                <div className="glass rounded-2xl p-4">
                    <button className="w-full h-full flex items-center justify-center gap-2 hover:bg-white/5 rounded-xl transition-colors">
                        <Download className="w-5 h-5" />
                        Baixar Currículo
                    </button>
                </div>
            </div>

            {/* Tags */}
            <div className="p-6 border-b border-white/5">
                <div className="flex flex-wrap gap-2">
                    {candidate.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-4 border-b border-white/5">
                {(['overview', 'resume', 'timeline', 'notes'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === tab 
                                ? 'bg-purple-600 text-white' 
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="p-6">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-2 gap-6">
                        {/* Experience */}
                        <div className="glass rounded-2xl p-6">
                            <h3 className="text-xl font-bold mb-4">Experiência</h3>
                            <div className="space-y-4">
                                {candidate.experience.map((exp, i) => (
                                    <div key={i} className="border-l-2 border-purple-500/30 pl-4">
                                        <p className="font-bold">{exp.role}</p>
                                        <p className="text-gray-400 text-sm">{exp.company}</p>
                                        <p className="text-gray-500 text-xs">{exp.duration}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Education */}
                        <div className="glass rounded-2xl p-6">
                            <h3 className="text-xl font-bold mb-4">Formação</h3>
                            <div className="space-y-4">
                                {candidate.education.map((edu, i) => (
                                    <div key={i} className="border-l-2 border-blue-500/30 pl-4">
                                        <p className="font-bold">{edu.degree}</p>
                                        <p className="text-gray-400 text-sm">{edu.institution}</p>
                                        <p className="text-gray-500 text-xs">{edu.year}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'timeline' && (
                    <div className="max-w-2xl">
                        <div className="space-y-4">
                            {candidate.timeline.map(item => (
                                <div key={item.id} className="flex gap-4">
                                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />
                                    <div className="flex-1 glass rounded-xl p-4">
                                        <p className="font-bold">{item.action}</p>
                                        <p className="text-gray-400 text-sm">
                                            {item.date} • {item.user}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

{activeTab === 'notes' && (
                    <div className="max-w-2xl space-y-4">
                        {/* Attachments Section */}
                        <div className="glass rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-bold flex items-center gap-2">
                                    <Paperclip className="w-4 h-4" />
                                    Anexos
                                </h4>
                                <label className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 cursor-pointer transition-colors">
                                    <Upload className="w-4 h-4" />
                                    <input type="file" className="hidden" />
                                </label>
                            </div>
                            {candidate.attachments && candidate.attachments.length > 0 ? (
                                <div className="space-y-2">
                                    {candidate.attachments.map(att => (
                                        <div key={att.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-purple-400" />
                                                <span className="text-sm">{att.name}</span>
                                            </div>
                                            <a href={att.url} className="text-purple-400 hover:text-purple-300">
                                                <Download className="w-4 h-4" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm">Nenhum arquivo anexado</p>
                            )}
                        </div>

                        {/* Notes Section */}
                        {candidate.notes.map(note => (
                            <div key={note.id} className="glass rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold">{note.author}</span>
                                    <span className="text-gray-500 text-sm">{note.date}</span>
                                </div>
                                <p className="text-gray-400">{note.content}</p>
                            </div>
                        ))}
                        
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Adicionar nota..."
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500"
                            />
                            <button className="p-3 rounded-xl bg-purple-600 hover:bg-purple-500">
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'resume' && (
                    <div className="glass rounded-2xl p-8 text-center">
                        <FileText className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                        <p className="text-gray-400">Visualizador de currículo em desenvolvimento</p>
                        <button className="mt-4 px-6 py-2 bg-purple-600 rounded-lg">
                            <Download className="w-4 h-4 inline mr-2" />
                            Baixar PDF
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
