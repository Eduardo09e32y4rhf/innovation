'use client';

import { useState, useRef, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import {
    Send, User, Lock, Sparkles, Bot,
    Copy, Check, ChevronDown, Trash2, StopCircle, Paperclip
} from 'lucide-react';
import api from '@/services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    model?: string;
    isThinking?: boolean;
}

interface AIModel {
    id: string;
    name: string;
    description: string;
    plan: string;
    available: boolean;
    icon: string;
    locked_message?: string;
}

const QUICK_PROMPTS = [
    { text: '📄 Analise este currículo e dê uma nota', category: 'Recrutamento' },
    { text: '💰 Calcule o custo real de um funcionário CLT', category: 'Financeiro' },
    { text: '📊 Como reduzir turnover na empresa?', category: 'Estratégia' },
    { text: '🎯 Sugira 5 killer questions para vaga de Dados', category: 'ATS' },
];

export default function ChatIAPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState('gemini-flash');
    const [models, setModels] = useState<AIModel[]>([]);
    const [showModelSelector, setShowModelSelector] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Load available models
    useEffect(() => {
        api.get('/api/ai/models')
            .then(r => setModels(r.data.models || []))
            .catch(() => {
                setModels([
                    { id: 'gemini-flash', name: 'Gemini 1.5 Flash', description: 'Rápido e eficiente para tarefas do dia a dia.', plan: 'Starter', available: true, icon: '⚡' },
                    { id: 'gemini-pro', name: 'Gemini 3.1 Pro', description: 'O modelo mais avançado para análises complexas.', plan: 'Growth', available: true, icon: '🚀' },
                    { id: 'claude', name: 'Claude 3.5 Sonnet', description: 'Excelência em escrita e codificação.', plan: 'Enterprise', available: false, icon: '🧠', locked_message: 'Upgrade para Enterprise' },
                ]);
            });
    }, []);

    const currentModel = models.find(m => m.id === selectedModel);

    const stopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setLoading(false);
        }
    };

    const sendMessage = async (customText?: string) => {
        const text = customText || input.trim();
        if (!text || loading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text,
            sender: 'user',
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        const aiMsgId = 'ai-' + Date.now();
        setMessages(prev => [
            ...prev,
            { id: aiMsgId, text: '', sender: 'ai', isThinking: true },
        ]);

        const history = messages
            .filter(m => !m.isThinking)
            .slice(-15)
            .map(m => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.text,
            }));

        abortControllerRef.current = new AbortController();

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    question: text,
                    model: selectedModel,
                    history,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) throw new Error('Falha na comunicação com o servidor');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('Streaming não suportado pelo navegador');

            const decoder = new TextDecoder();
            let fullText = '';

            setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isThinking: false } : m));

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const content = line.substring(6).trim();
                        if (content === '[DONE]') break;

                        let decodedChunk = content;
                        try {
                            const partial = JSON.parse(content);
                            decodedChunk = partial.text || partial.content || '';
                        } catch {
                            decodedChunk = content.replace(/\[NEWLINE\]/g, '\n');
                        }

                        fullText += decodedChunk;
                        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m));
                    }
                }
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: m.text + ' [Interrompido]', isThinking: false } : m));
            } else {
                setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: `⚠️ **Aviso:** Conexão interrompida. Tente novamente em instantes.`, isThinking: false } : m));
            }
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <AppLayout title="InnovationIA — Inteligência Cognitiva">
            <div className="flex h-[calc(100vh-64px)] bg-slate-50 overflow-hidden font-sans">
                <main className="flex-1 flex flex-col h-full relative max-w-5xl mx-auto bg-white border-slate-200 border-black/5 shadow-sm shadow-2xl border-x border-slate-100">

                    {/* Header Premium */}
                    <header className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white border-slate-200 border-black/5 shadow-sm/80 backdrop-blur-md sticky top-0 z-40">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border-indigo-100">
                                <Bot size={28} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black tracking-tight text-slate-900">Innovation<span className="text-indigo-600">.ia</span></h2>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atendimento Ativo</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <button
                                    onClick={() => setShowModelSelector(!showModelSelector)}
                                    className="flex items-center gap-3 bg-slate-50 border-slate-200 hover:border-indigo-300 rounded-2xl px-4 py-2.5 text-xs font-black text-slate-600 transition-all shadow-sm"
                                >
                                    <span>{currentModel?.icon}</span>
                                    <span>{currentModel?.name}</span>
                                    <ChevronDown size={14} className={`transition-transform ${showModelSelector ? 'rotate-180' : ''}`} />
                                </button>

                                {showModelSelector && (
                                    <div className="absolute right-0 top-full mt-3 w-80 bg-white border-slate-200 border-black/5 shadow-sm border-slate-200 rounded-3xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in duration-200">
                                        <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Cérebros Disponíveis</p>
                                        </div>
                                        <div className="p-2 space-y-1">
                                            {models.map(model => (
                                                <button
                                                    key={model.id}
                                                    onClick={() => {
                                                        if (model.available) {
                                                            setSelectedModel(model.id);
                                                            setShowModelSelector(false);
                                                        }
                                                    }}
                                                    className={`w-full p-4 flex items-start gap-4 rounded-2xl transition-all group ${selectedModel === model.id ? 'bg-indigo-50 border-indigo-100' : 'hover:bg-slate-50 border-transparent'} ${!model.available ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 flex items-center justify-center shrink-0 shadow-sm text-lg">
                                                        {model.icon}
                                                    </div>
                                                    <div className="flex-1 text-left min-w-0">
                                                        <div className="flex items-center justify-between mb-0.5">
                                                            <span className="text-sm font-black text-slate-900">{model.name}</span>
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 font-bold uppercase">{model.plan}</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 line-clamp-2">{model.description}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto px-6 py-10 space-y-8 scroll-smooth custom-scrollbar">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-10 text-center animate-in fade-in slide-in-from-bottom-5 duration-700">
                                <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner border-indigo-100">
                                    <Sparkles size={48} className="text-indigo-600 animate-pulse" />
                                </div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Como posso ajudar?</h1>
                                <p className="max-w-md text-slate-500 font-medium mb-12">Sou a assistente especial da Innovation.ia.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                    {QUICK_PROMPTS.map((prompt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => sendMessage(prompt.text)}
                                            className="text-left p-5 bg-slate-50 border-slate-100 rounded-3xl hover:border-indigo-300 hover:bg-white border-slate-200 border-black/5 shadow-sm hover:shadow-xl transition-all group"
                                        >
                                            <p className="text-sm font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{prompt.text}</p>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{prompt.category}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-10">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex gap-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
                                        <div className={`flex gap-4 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center shadow-sm border ${msg.sender === 'user' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 text-indigo-600'}`}>
                                                {msg.sender === 'user' ? <User size={20} /> : <Bot size={20} />}
                                            </div>
                                            <div className={`p-5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-50 text-slate-800 border-slate-100 rounded-tl-none'}`}>
                                                {msg.isThinking ? (
                                                    <div className="flex gap-2 p-1">
                                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                    </div>
                                                ) : (
                                                    <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-white prose-pre:rounded-xl">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                                                    </div>
                                                )}
                                                {msg.sender === 'ai' && !msg.isThinking && (
                                                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
                                                        <button
                                                            onClick={() => copyToClipboard(msg.text, msg.id)}
                                                            className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors"
                                                        >
                                                            {copiedId === msg.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                            {copiedId === msg.id ? 'Copiado' : 'Copiar'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-6 bg-white border-slate-200 border-black/5 shadow-sm border-t border-slate-100">
                        <div className="max-w-4xl mx-auto relative group">
                            <div className="bg-slate-50 border-slate-200 rounded-[2rem] focus-within:ring-4 ring-indigo-50 focus-within:border-indigo-300 transition-all flex flex-col shadow-inner">
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Pergunte qualquer coisa..."
                                    className="w-full bg-transparent px-6 py-4 text-slate-800 placeholder-slate-400 focus:outline-none resize-none max-h-[200px] text-sm leading-relaxed"
                                    rows={1}
                                />
                                <div className="flex items-center justify-between px-6 pb-4">
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <button className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                                            <Paperclip size={18} />
                                        </button>
                                        <div className="w-px h-4 bg-slate-200 mx-1" />
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">IA Ativa</span>
                                    </div>
                                    <button
                                        onClick={() => loading ? stopGeneration() : sendMessage()}
                                        disabled={!input.trim() && !loading}
                                        className={`p-3 rounded-2xl transition-all shadow-lg ${loading || input.trim() ? 'bg-indigo-600 text-white shadow-indigo-100 scale-105' : 'bg-slate-200 text-slate-400'}`}
                                    >
                                        {loading ? <StopCircle size={20} /> : <Send size={20} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <p className="text-center mt-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">Innovation Force Engine • Produzido por Gemini Pro</p>
                    </div>
                </main>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </AppLayout>
    );
}
