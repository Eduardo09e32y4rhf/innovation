'use client';

import { useChat } from 'ai/react';
import { Rocket, Search, MoreVertical, Robot, Send, MessageSquare, CheckCircle2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function StrategistChat() {
    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: '/api/chat',
        onFinish: async (message) => {
            // Pulo do Gato: Sincroniza automaticamente com a VPS
            const vpsUrl = process.env.NEXT_PUBLIC_API_URL;
            if (vpsUrl) {
                try {
                    await fetch(`${vpsUrl}/api/innovation-ia/sync-knowledge`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: input,
                            answer: message.content,
                            source: 'Vercel-Strategist-UI'
                        }),
                    });
                } catch (e) {
                    console.error("Erro ao sincronizar com VPS:", e);
                }
            }
        }
    });

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="h-screen flex bg-[#0f172a] text-slate-200 font-sans overflow-hidden">
            {/* Sidebar - Glassmorphism */}
            <aside className="w-72 bg-white/5 backdrop-blur-xl h-full p-6 hidden lg:flex flex-col border-r border-white/10">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Rocket className="text-white w-5 h-5" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">
                        Innovation <span className="text-blue-500">IA</span>
                    </h1>
                </div>

                <nav className="flex-1 space-y-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Histórico de Gestão</p>
                    <div className="space-y-1">
                        <button className="w-full text-left p-3 rounded-xl bg-blue-600/10 border border-blue-500/20 text-sm flex items-center gap-3">
                            <MessageSquare className="text-blue-400 w-4 h-4" /> Estratégia de Churn
                        </button>
                        <button className="w-full text-left p-3 rounded-xl hover:bg-white/5 transition text-sm flex items-center gap-3 text-slate-400">
                            <MessageSquare className="w-4 h-4" /> Análise Gslimp
                        </button>
                    </div>
                </nav>

                <div className="mt-auto p-4 rounded-2xl bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center gap-3 text-xs">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>VPS Prosolution: <span className="text-green-400 font-bold">Ativa</span></span>
                    </div>
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col relative h-full">
                <header className="p-5 bg-white/5 backdrop-blur-md flex justify-between items-center border-b border-white/5">
                    <div>
                        <h2 className="font-bold">Estrategista Innovation</h2>
                        <p className="text-xs text-slate-400">Modelo: Mistral Large 3 via Vercel Edge</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="p-2 hover:bg-white/5 rounded-lg transition text-slate-400"><Search className="w-5 h-5" /></button>
                        <button className="p-2 hover:bg-white/5 rounded-lg transition text-slate-400"><MoreVertical className="w-5 h-5" /></button>
                    </div>
                </header>

                {/* Chat Messages */}
                <section ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="max-w-3xl mx-auto">
                        {/* Boas vindas ou histórico */}
                        <div className="flex gap-4 mb-8">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex-shrink-0 flex items-center justify-center">
                                <Robot className="text-white w-5 h-5" />
                            </div>
                            <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl rounded-tl-none border border-blue-500/10 shadow-2xl">
                                <p className="text-sm leading-relaxed">
                                    Olá, <strong>Eduardo</strong>! O ambiente da Vercel está configurado. O <strong>Innovation IA</strong> agora pode escalar globalmente. Como mestre estrategista, qual o próximo passo do backend na VPS?
                                </p>
                                <div className="mt-4 flex gap-2">
                                    <span className="text-[10px] px-2 py-1 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20">DB: SQLAlchemy</span>
                                    <span className="text-[10px] px-2 py-1 bg-purple-500/10 text-purple-400 rounded-md border border-purple-500/20">API: FastAPI</span>
                                </div>
                            </div>
                        </div>

                        {messages.map((m) => (
                            <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : ''}`}>
                                {m.role !== 'user' && (
                                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex-shrink-0 flex items-center justify-center">
                                        <Robot className="text-white w-5 h-5" />
                                    </div>
                                )}

                                <div className={`p-5 rounded-2xl shadow-xl max-w-[80%] ${m.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-white/5 backdrop-blur-md border border-white/10 rounded-tl-none'
                                    }`}>
                                    <p className="text-sm leading-relaxed">{m.content}</p>
                                </div>

                                {m.role === 'user' && (
                                    <div className="w-8 h-8 rounded-lg bg-slate-700 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white">
                                        E
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-4 items-center">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 animate-pulse" />
                                <div className="text-xs text-slate-500 italic">O estrategista está pensando...</div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Input Footer */}
                <footer className="p-6 bg-transparent">
                    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={handleInputChange}
                                placeholder="Envie sua dúvida estratégica..."
                                className="w-full bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm pr-16 text-white appearance-none"
                            />
                            <button
                                type="submit"
                                className="absolute right-4 p-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-colors shadow-lg"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                    <p className="text-center text-[10px] text-slate-500 mt-4 tracking-wider uppercase">
                        Powered by NVIDIA Mistral Large 3 & Vercel Edge
                    </p>
                </footer>
            </main>
        </div>
    );
}
