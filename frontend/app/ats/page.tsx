'use client';

import { Sidebar } from '../../components/Sidebar';
import { Users, FileText, CheckCircle, XCircle } from 'lucide-react';

export default function ATSPage() {
    return (
        <div className="flex h-screen bg-[#0a0a0f] text-white">
            <Sidebar />
            <main className="flex-1 ml-[280px] p-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-6">
                    Recrutamento Inteligente (ATS)
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-zinc-400 text-sm">Candidatos Totais</p>
                            <p className="text-2xl font-bold">1,248</p>
                        </div>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-zinc-400 text-sm">Aprovados pela IA</p>
                            <p className="text-2xl font-bold">85</p>
                        </div>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                            <XCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-zinc-400 text-sm">Rejeitados Automaticamente</p>
                            <p className="text-2xl font-bold">842</p>
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">Pipeline de Vagas</h3>
                    <div className="space-y-4">
                        {[
                            { role: "Senior Python Developer", applicants: 142, phase: "Entrevista Técnica", status: "Active" },
                            { role: "Product Manager", applicants: 89, phase: "Triagem IA", status: "Active" },
                            { role: "UX Designer", applicants: 56, phase: "Finalizado", status: "Closed" },
                        ].map((job, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl hover:bg-zinc-800 transition">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{job.role}</p>
                                        <p className="text-sm text-zinc-500">{job.applicants} candidatos</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                        {job.phase}
                                    </span>
                                    <span className={`w-2 h-2 rounded-full ${job.status === 'Active' ? 'bg-green-500' : 'bg-zinc-500'}`}></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
