'use client';

import { useState, useRef, useEffect } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Send, Cpu, User } from 'lucide-react';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    isThinking?: boolean;
}

export default function ChatIAPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const user = { name: 'Usuário' }; // Mock user since we haven't ported auth context yet

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: input,
            sender: 'user',
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        // AI Thinking placeholder
        const thinkingId = 'thinking-' + Date.now();
        setMessages((prev) => [
            ...prev,
            { id: thinkingId, text: 'Pensando...', sender: 'ai', isThinking: true },
        ]);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/ai/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    question: userMsg.text,
                    context: "Usuário do sistema Innovation.ia. Responda como um assistente de RH."
                })
            });

            const data = await response.json();

            setMessages((prev) => {
                // Remove thinking message
                const newMessages = prev.filter((msg) => msg.id !== thinkingId);

                let aiText = 'Erro ao processar resposta.';
                if (response.ok) {
                    aiText = data.answer || data.response || '';
                } else {
                    aiText = data.answer || data.response || 'Erro ao processar sua mensagem.';
                }

                return [
                    ...newMessages,
                    { id: Date.now().toString(), text: aiText, sender: 'ai' },
                ];
            });
        } catch (error) {
            console.error(error);
            setMessages((prev) => {
                const newMessages = prev.filter((msg) => msg.id !== thinkingId);
                return [
                    ...newMessages,
                    { id: Date.now().toString(), text: 'Erro de conexão.', sender: 'ai' }
                ];
            });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex h-screen bg-[#0a0a0f] text-white">
            <Sidebar />

            <main className="flex-1 ml-[280px] flex flex-col h-full relative">
                {/* Header */}
                <header className="p-6 border-b border-zinc-900 flex justify-between items-center bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold">Assistente Innovation.ia</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-xs text-zinc-400">Gemini 1.5 Flash Ativo</span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <select className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none">
                            <option value="gemini">Gemini Pro</option>
                            <option value="claude">Claude 3.5</option>
                        </select>
                    </div>
                </header>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-40 py-20">
                            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mb-6 animate-float">
                                <Cpu className="w-10 h-10 text-white" />
                            </div>
                            <h3 className="text-2xl font-black mb-2">Como posso acelerar seu RH hoje?</h3>
                            <p className="max-w-md text-zinc-400">Posso analisar currículos, prever custos de contratação ou gerar roadmaps de squads inteiros.</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-4 max-w-[80%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 
                  ${msg.sender === 'user' ? 'bg-purple-600' : 'bg-gradient-to-br from-cyan-500 to-blue-500'}`}>
                                    {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
                                </div>

                                <div className={`p-4 rounded-2xl text-sm leading-relaxed 
                  ${msg.sender === 'user'
                                        ? 'bg-purple-600 text-white rounded-br-none'
                                        : 'bg-zinc-800/80 border border-purple-500/30 rounded-bl-none text-zinc-200'}
                  ${msg.isThinking ? 'animate-pulse' : ''}`}>

                                    {msg.isThinking ? (
                                        <span className="flex gap-1">
                                            <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce delay-75"></span>
                                            <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce delay-150"></span>
                                            <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce delay-300"></span>
                                        </span>
                                    ) : (
                                        // Basic markdown rendering (bold and newlines)
                                        <div dangerouslySetInnerHTML={{
                                            __html: msg.text
                                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                .replace(/\n/g, '<br />')
                                        }} />
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 bg-[#0a0a0f] border-t border-purple-500/20">
                    <div className="relative max-w-4xl mx-auto">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Pergunte qualquer coisa sobre sua empresa..."
                            className="w-full bg-zinc-900/50 border border-purple-500/30 rounded-2xl pl-5 pr-14 py-4 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none overflow-hidden min-h-[60px]"
                            rows={1}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || loading}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-purple-500 hover:text-purple-400 disabled:opacity-50 transition-colors"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-center text-[10px] text-zinc-600 mt-4">
                        A IA pode fornecer informações incorretas. Verifique fatos importantes.
                    </p>
                </div>
            </main>
        </div>
    );
}
