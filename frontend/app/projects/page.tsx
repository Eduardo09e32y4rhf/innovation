'use client';

import { Sidebar } from '../../components/Sidebar';
import { KanbanSquare, ListTodo, Users } from 'lucide-react';

export default function ProjectsPage() {
    return (
        <div className="flex h-screen bg-[#0a0a0f] text-white">
            <Sidebar />
            <main className="flex-1 ml-[280px] p-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600 mb-6">
                    Gestão de Projetos (Kanban)
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {['Backlog', 'Em Progresso', 'Concluído'].map((col, i) => (
                        <div key={i} className="glass-panel p-4 rounded-xl min-h-[500px]">
                            <div className="flex items-center justify-between mb-4">
                                <span className="font-semibold text-gray-300">{col}</span>
                                <span className="bg-gray-800 px-2 py-0.5 rounded text-xs text-gray-500">
                                    {i === 1 ? '3' : i === 2 ? '12' : '5'}
                                </span>
                            </div>
                            <div className="space-y-3">
                                {[1, 2, 3].map((card) => (
                                    <div key={card} className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 hover:border-blue-500/50 cursor-grab active:cursor-grabbing transition shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">Frontend</span>
                                            <Users className="w-3 h-3 text-gray-500" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-200 mb-2">
                                            Implementar Dashboard {col === 'Em Progresso' ? 'v2' : card}
                                        </p>
                                        <div className="flex justify-between items-center text-xs text-gray-500">
                                            <span>#{card}24</span>
                                            <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-[10px]">
                                                JS
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
