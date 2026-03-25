"use client"

import React, { useState, useEffect, useRef } from 'react';
import {
    Send,
    Bot,
    User,
    Sparkles,
    Paperclip,
    MoreHorizontal,
    ArrowLeft
} from 'lucide-react';

export default function InnovationIAChat() {
    type Message = { id: number; text: string; sender: 'ai' | 'user' };
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, text: "Olá Eduardo! Sou a InnovationIA, sua inteligência de gestão. Como posso ajudar seu ecossistema hoje?", sender: 'ai' }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll para a última mensagem
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now(), text: input, sender: 'user' };
        setMessages((prev: Message[]) => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        try {
            // Connect to the real backend endpoint
            const response = await fetch('/api/v1/innovation-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: input,
                    history: messages.map((m: Message) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }))
                })
            });

            if (!response.ok) {
                throw new Error('Falha ao comunicar com a IA');
            }

            const data = await response.json();

            const aiMsg: Message = {
                id: Date.now() + 1,
                text: data.answer || "Desculpe, não consegui processar sua solicitação no momento.",
                sender: 'ai'
            };
            setMessages((prev: Message[]) => [...prev, aiMsg]);

        } catch (error) {
            console.error(error);
            const errorMsg: Message = {
                id: Date.now() + 1,
                text: "Houve um erro de comunicação com o servidor.",
                sender: 'ai'
            };
            setMessages((prev: Message[]) => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900">

            {/* HEADER DO CHAT */}
            <header className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-slate-500" />
                    </button>
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                            <Bot size={22} />
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div>
                        <h2 className="font-bold text-sm leading-tight text-slate-800">InnovationIA</h2>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Online agora</p>
                    </div>
                </div>
                <button className="p-2 text-slate-400 hover:text-slate-600">
                    <MoreHorizontal size={20} />
                </button>
            </header>

            {/* ÁREA DE MENSAGENS */}
            <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
                {messages.map((msg: Message) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm
                ${msg.sender === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                                {msg.sender === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                            </div>

                            <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm
                ${msg.sender === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}`}>
                                {msg.text}
                            </div>

                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                    </div>
                )}
            </main>

            {/* INPUT DE MENSAGEM */}
            <footer className="p-4 bg-white border-t border-slate-200">
                <div className="max-w-4xl mx-auto flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 transition-all">
                    <button aria-label="Anexar arquivo" className="p-2 text-slate-400 hover:text-indigo-500 transition-colors">
                        <Paperclip size={20} />
                    </button>

                    <textarea
                        rows={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Pergunte qualquer coisa para a InnovationIA..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 resize-none max-h-32 placeholder:text-slate-400 outline-none"
                    />

                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className={`p-2 rounded-xl transition-all ${input.trim() && !isTyping ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-300 cursor-not-allowed'}`}>
                        <Send size={20} />
                    </button>
                </div>
                <p className="text-[10px] text-center text-slate-400 mt-2">
                    InnovationIA pode cometer erros. Considere verificar informações importantes.
                </p>
            </footer>

        </div>
    );
}
