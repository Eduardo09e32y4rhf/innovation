'use client';

import { Sidebar } from '../../components/Sidebar';
import { HelpCircle, MessageCircle, AlertTriangle, FileText } from 'lucide-react';

export default function SupportPage() {
    return (
        <div className="flex h-screen bg-[#0a0a0f] text-white">
            <Sidebar />
            <main className="flex-1 ml-[280px] p-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-600 mb-6">
                    Central de Suporte (HelpDesk)
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {[
                        { title: "Tickets Abertos", value: "24", icon: MessageCircle, color: "text-blue-400" },
                        { title: "Tempo Resposta", value: "1h 12m", icon: HelpCircle, color: "text-green-400" },
                        { title: "Incidentes", value: "0", icon: AlertTriangle, color: "text-red-400" },
                        { title: "SLA Batido", value: "98.5%", icon: FileText, color: "text-purple-400" },
                    ].map((kpi, i) => (
                        <div key={i} className="glass-panel p-6 rounded-xl flex flex-col items-center text-center">
                            <kpi.icon className={`w-10 h-10 mb-2 ${kpi.color}`} />
                            <p className="text-zinc-400 text-sm">{kpi.title}</p>
                            <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                        </div>
                    ))}
                </div>

                <div className="glass-panel rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-6">Tickets Recentes</h3>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-sm text-zinc-500 border-b border-zinc-800">
                                <th className="pb-3 pl-4">ID</th>
                                <th className="pb-3">Assunto</th>
                                <th className="pb-3">Status</th>
                                <th className="pb-3">Prioridade</th>
                                <th className="pb-3 pr-4 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { id: "#2049", subject: "Erro no login SSO", status: "Aberto", priority: "Alta" },
                                { id: "#2048", subject: "Dúvida sobre Faturas", status: "Em Andamento", priority: "Média" },
                                { id: "#2047", subject: "Integração GitHub falhou", status: "Resolvido", priority: "Baixa" },
                            ].map((ticket, i) => (
                                <tr key={i} className="group hover:bg-zinc-800/50 transition border-b border-zinc-800/50 last:border-0">
                                    <td className="py-4 pl-4 font-mono text-sm text-zinc-400">{ticket.id}</td>
                                    <td className="py-4 font-medium text-white">{ticket.subject}</td>
                                    <td className="py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium 
                                    ${ticket.status === 'Aberto' ? 'bg-blue-500/10 text-blue-400' :
                                                ticket.status === 'Resolvido' ? 'bg-green-500/10 text-green-400' :
                                                    'bg-yellow-500/10 text-yellow-400'}`}>
                                            {ticket.status}
                                        </span>
                                    </td>
                                    <td className="py-4 text-sm text-zinc-400">{ticket.priority}</td>
                                    <td className="py-4 pr-4 text-right">
                                        <button className="text-purple-400 hover:text-purple-300 text-sm font-medium">Ver Detalhes</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
