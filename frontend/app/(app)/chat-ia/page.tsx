'use client';

import { useState, useRef, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import {
    Send, Cpu, User, Zap, Rocket, Brain, Lock, Sparkles,
    RotateCcw, Copy, Check, Terminal, Info, AlertTriangle,
    ChevronDown, Trash2, StopCircle
} from 'lucide-react';
import api from '@/services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

const MODEL_ICONS: Record<string, any> = {
    'gemini-flash': Zap,
    'gemini-pro': Rocket,
    'claude': Brain,
};

const MODEL_COLORS: Record<string, string> = {
    'gemini-flash': 'from-blue-500 to-cyan-400',
    'gemini-pro': 'from-purple-500 to-pink-500',
    'claude': 'from-orange-500 to-yellow-400',
};

const QUICK_PROMPTS = [
    { text: '📄 Analise este currículo e dê uma nota', category: 'Recrutamento' },
    { text: '💰 Calcule o custo real de um funcionário CLT com salário de R$5.000', category: 'Financeiro' },
    { text: '📋 Crie um PDI para um desenvolvedor pleno', category: 'RH' },
    { text: '🎯 Sugira 5 killer questions para vaga de Analista de Dados', category: 'ATS' },
    { text: '📊 Como reduzir turnover na empresa?', category: 'Estratégia' },
    { text: '🎫 Monte um SLA para atendimento N1/N2/N3', category: 'Suporte' },
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
        api.get('/ai/models')
            .then(r => setModels(r.data.models || []))
            .catch(() => {
                setModels([
                    { id: 'gemini-flash', name: 'Gemini 1.5 Flash', description: 'Rápido e eficiente', plan: 'Starter', available: true, icon: '⚡' },
                    { id: 'gemini-pro', name: 'Gemini 1.5 Pro', description: 'Análises profundas', plan: 'Growth', available: true, icon: '🚀' },
                    { id: 'claude', name: 'Claude 3.5 Sonnet', description: 'Premium Enterprise', plan: 'Enterprise', available: false, icon: '🧠', locked_message: 'Contate o admin' },
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
            // Using fetch directly for streaming support
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/ai/chat`, {
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

            // Remove thinking state and prepare for stream
            setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isThinking: false } : m));

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                // SSE chunks come as "data: content\n\n"
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const content = line.substring(6).trim();

                        if (content === '[DONE]') break;
                        if (content.startsWith('[ERROR]')) {
                            fullText += `\n\n❌ **Erro:** ${content.replace('[ERROR]', '').trim()}`;
                        } else {
                            // Replace [NEWLINE] back to actual newlines
                            const decodedChunk = content.replace(/\[NEWLINE\]/g, '\n');
                            fullText += decodedChunk;
                        }

                        // Update UI with partial text
                        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m));
                    }
                }
            }

        } catch (error: any) {
            if (error.name === 'AbortError') {
                setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: m.text + '... [Interrompido]', isThinking: false } : m));
            } else {
                const errMsg = error.message || 'Erro de conexão.';
                setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: `❌ **Erro:** ${errMsg}`, isThinking: false } : m));
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

    const clearChat = () => {
        if (window.confirm('Deseja limpar todo o histórico do chat?')) {
            setMessages([]);
        }
    };

    const SelectedIcon = MODEL_ICONS[selectedModel] || Zap;
    const gradientClass = MODEL_COLORS[selectedModel] || MODEL_COLORS['gemini-flash'];

    return (
        <AppLayout title="Chat IA — Innovation.ia">
            <div className="flex h-[calc(100vh-57px)] bg-[#050508] text-gray-100 overflow-hidden font-sans">
                <main className="flex-1 flex flex-col h-full relative max-w-5xl mx-auto border-x border-gray-800/30 bg-gray-950/20 shadow-2xl">
                    {/* Header Estilo Premium */}
                    <header className="px-6 py-4 border-b border-gray-800/50 flex justify-between items-center bg-gray-950/40 backdrop-blur-2xl sticky top-0 z-40">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradientClass} flex items-center justify-center p-[1px] shadow-lg shadow-blue-500/10`}>
                                <div className="w-full h-full rounded-2xl bg-gray-950 flex items-center justify-center">
                                    <SelectedIcon className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-white">Innovation<span className="text-blue-400">.ia</span></h2>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">
                                            {currentModel?.name || 'IA'} • ONLINE
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <button
                                    onClick={() => setShowModelSelector(!showModelSelector)}
                                    className="flex items-center gap-3 bg-gray-900/50 border border-gray-700/50 hover:border-blue-500/50 rounded-2xl px-4 py-2.5 text-sm transition-all duration-300 backdrop-blur-md shadow-lg"
                                >
                                    <span className="text-lg">{currentModel?.icon || '⚡'}</span>
                                    <span className="font-semibold text-gray-200">{currentModel?.name?.split('1.5 ')[1] || 'Flash'}</span>
                                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showModelSelector ? 'rotate-180' : ''}`} />
                                </button>

                                {showModelSelector && (
                                    <div className="absolute right-0 top-full mt-3 w-80 bg-gray-900/90 border border-gray-700/50 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden z-50 animate-in fade-in zoom-in duration-200">
                                        <div className="p-4 border-b border-gray-800/50 bg-gray-950/30">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Selecione Inteligência</p>
                                        </div>
                                        <div className="p-2 space-y-1">
                                            {models.map(model => {
                                                const Icon = MODEL_ICONS[model.id] || Zap;
                                                const isSelected = selectedModel === model.id;
                                                const gradient = MODEL_COLORS[model.id] || MODEL_COLORS['gemini-flash'];

                                                return (
                                                    <button
                                                        key={model.id}
                                                        onClick={() => {
                                                            if (model.available) {
                                                                setSelectedModel(model.id);
                                                                setShowModelSelector(false);
                                                            }
                                                        }}
                                                        className={`w-full p-4 flex items-start gap-4 rounded-2xl transition-all duration-200 group
                                                        ${isSelected ? 'bg-blue-500/10 border border-blue-500/20' : 'hover:bg-gray-800/50 border border-transparent'}
                                                        ${!model.available ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-lg`}>
                                                            {model.available ? <Icon className="w-5 h-5 text-white" /> : <Lock className="w-5 h-5 text-white" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm font-bold text-white mb-0.5">{model.name}</span>
                                                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider
                                                                    ${model.plan === 'Starter' ? 'bg-blue-500/20 text-blue-400' :
                                                                        model.plan === 'Growth' ? 'bg-purple-500/20 text-purple-400' :
                                                                            'bg-orange-500/20 text-orange-400'}`}>
                                                                    {model.plan}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2">{model.description}</p>
                                                            {!model.available && (
                                                                <div className="mt-2 text-[10px] text-red-300/80 font-medium flex items-center gap-1.5 italic">
                                                                    <div className="w-1 h-1 bg-red-400 rounded-full" /> {model.locked_message || 'Requer upgrade'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button onClick={clearChat} className="p-3 text-gray-500 hover:text-red-400 transition-colors rounded-2xl bg-gray-900/40 hover:bg-gray-800 group" title="Limpar conversa" aria-label="Limpar conversa">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </header>

                    {/* Chat Area - Roll Estilo Gemini */}
                    <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 custom-scrollbar scroll-smooth">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-20 text-center animate-in fade-in slide-in-from-bottom-5 duration-700">
                                <div className={`w-24 h-24 bg-gradient-to-br ${gradientClass} rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/20 relative group overflow-hidden`}>
                                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Sparkles className="w-12 h-12 text-white animate-pulse" />
                                </div>
                                <h1 className="text-4xl font-extrabold mb-4 bg-gradient-to-r from-white via-blue-100 to-gray-400 bg-clip-text text-transparent">
                                    Intelligence
                                </h1>
                                <p className="max-w-md text-gray-400 text-base leading-relaxed mb-12">
                                    Seu motor de IA especializado em RH estratégico, análise financeira de folha e gestão de talentos.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl w-full">
                                    {QUICK_PROMPTS.map((prompt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => sendMessage(prompt.text)}
                                            className="group text-left p-5 bg-gray-900/30 border border-gray-800/50 rounded-3xl hover:border-blue-500/40 hover:bg-gray-900/60 transition-all duration-300"
                                        >
                                            <p className="text-sm font-semibold text-gray-200 group-hover:text-blue-300 transition-colors mb-2">{prompt.text}</p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-1 h-1 bg-gray-600 rounded-full" />
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{prompt.category}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-12">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`flex gap-4 max-w-[90%] md:max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg mt-1
                                            ${msg.sender === 'user'
                                                    ? 'bg-blue-600'
                                                    : `bg-gradient-to-br ${MODEL_COLORS[selectedModel] || MODEL_COLORS['gemini-flash']}`}`}
                                            >
                                                {msg.sender === 'user' ? <User className="w-5 h-5 text-white" /> : <SelectedIcon className="w-5 h-5 text-white" />}
                                            </div>

                                            <div className={`relative flex flex-col gap-2 rounded-3xl p-5 text-sm md:text-base leading-relaxed
                                            ${msg.sender === 'user'
                                                    ? 'bg-blue-600 text-white rounded-tr-sm shadow-xl shadow-blue-900/10'
                                                    : 'bg-gray-900/50 border border-gray-800 text-gray-100 rounded-tl-sm shadow-inner shadow-black/20'}
                                            ${msg.isThinking ? 'bg-gray-900/30 border-dashed animate-pulse min-w-[200px]' : ''}`}
                                            >
                                                {msg.isThinking ? (
                                                    <div className="flex items-center gap-4 py-2">
                                                        <div className="flex gap-1.5">
                                                            <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                            <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                                                            <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Processando Inteligência...</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="prose prose-invert prose-blue max-w-none text-gray-100 prose-p:leading-relaxed prose-pre:bg-gray-950 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-2xl">
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkGfm]}
                                                                components={{
                                                                    code({ node, inline, className, children, ...props }: any) {
                                                                        const match = /language-(\w+)/.exec(className || '');
                                                                        return !inline && match ? (
                                                                            <div className="relative group/code my-4">
                                                                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10">
                                                                                    <button
                                                                                        onClick={() => copyToClipboard(String(children).replace(/\n$/, ''), msg.id)}
                                                                                        className="bg-gray-800/80 hover:bg-gray-700 p-1.5 rounded-lg border border-white/10 backdrop-blur-md"
                                                                                        aria-label="Copiar código"
                                                                                    >
                                                                                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                                                                                    </button>
                                                                                </div>
                                                                                <SyntaxHighlighter
                                                                                    style={vscDarkPlus}
                                                                                    language={match[1]}
                                                                                    PreTag="div"
                                                                                    className="!bg-gray-950 !rounded-2xl !p-5 !m-0 !text-xs md:!text-sm border border-white/5 shadow-2xl"
                                                                                    {...props}
                                                                                >
                                                                                    {String(children).replace(/\n$/, '')}
                                                                                </SyntaxHighlighter>
                                                                            </div>
                                                                        ) : (
                                                                            <code className="bg-gray-800/80 text-blue-300 px-2 py-0.5 rounded-lg text-[0.85em] font-mono border border-white/5" {...props}>
                                                                                {children}
                                                                            </code>
                                                                        );
                                                                    }
                                                                }}
                                                            >
                                                                {msg.text || '...'}
                                                            </ReactMarkdown>
                                                        </div>

                                                        {msg.sender === 'ai' && msg.text && (
                                                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800/50">
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => copyToClipboard(msg.text, msg.id)}
                                                                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/40 hover:bg-gray-800 rounded-xl text-[10px] font-bold text-gray-500 hover:text-white transition-all uppercase tracking-wider"
                                                                    >
                                                                        {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                                        {copiedId === msg.id ? 'Copiado' : 'Copiar'}
                                                                    </button>
                                                                </div>
                                                                {msg.model && (
                                                                    <div className="flex items-center gap-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                                                                        <div className="w-1 h-1 bg-gray-700 rounded-full" />
                                                                        VIA {msg.model}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                        )}
                    </div>

                    {/* Input Area - Moderna e Flutuante */}
                    <div className="p-6 bg-gray-950/20 backdrop-blur-xl border-t border-gray-800/40">
                        <div className="max-w-4xl mx-auto relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-[2rem] blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                            <div className="relative bg-gray-900/80 border border-gray-700/50 rounded-[2rem] shadow-2xl focus-within:border-blue-500/50 transition-all overflow-hidden flex flex-col">
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={`Mensagem para Inteligência...`}
                                    className="w-full bg-transparent pl-6 pr-16 py-5 text-gray-100 placeholder-gray-500 focus:outline-none resize-none max-h-[180px] text-base leading-relaxed scrollbar-hide"
                                    rows={1}
                                />
                                <div className="flex items-center justify-between px-6 pb-4 pt-1">
                                    <div className="flex items-center gap-4 text-gray-600">
                                        <button className="hover:text-gray-300 transition-colors" title="Anexar" aria-label="Anexar arquivo">
                                            <div className="w-5 h-5 border-2 border-current rounded-md flex items-center justify-center text-[10px] font-bold">+</div>
                                        </button>
                                        <div className="w-[1px] h-3 bg-gray-800" />
                                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40">Streaming Ativo</span>
                                    </div>

                                    <button
                                        onClick={() => loading ? stopGeneration() : sendMessage()}
                                        disabled={!input.trim() && !loading}
                                        aria-label={loading ? "Parar geração" : "Enviar mensagem"}
                                        className={`p-3 rounded-2xl transition-all duration-300 shadow-xl
                                        ${(input.trim() || loading)
                                                ? `bg-blue-600 text-white shadow-blue-500/20 scale-110`
                                                : 'bg-gray-800 text-gray-600 scale-100 opacity-50'}`}
                                    >
                                        {loading ? <StopCircle className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1f2937;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #374151;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .prose pre {
                    background-color: transparent !important;
                    padding: 0 !important;
                    margin: 0 !important;
                }
                .prose code::before, .prose code::after {
                    content: "" !important;
                }
            `}</style>
        </AppLayout>
    );
}
