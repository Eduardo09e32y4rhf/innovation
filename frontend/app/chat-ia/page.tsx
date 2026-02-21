'use client';

import { useState, useRef, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import { Send, Cpu, User, Zap, Rocket, Brain, Lock, Sparkles, RotateCcw, Copy, Check } from 'lucide-react';
import api from '../../services/api';

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

const MODEL_ICONS: Record<string, typeof Zap> = {
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

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Load available models
    useEffect(() => {
        api.get('/ai/models')
            .then(r => setModels(r.data.models || []))
            .catch(() => {
                // Fallback models if endpoint not reachable
                setModels([
                    { id: 'gemini-flash', name: 'Gemini 1.5 Flash', description: 'Rápido e eficiente', plan: 'Starter', available: true, icon: '⚡' },
                    { id: 'gemini-pro', name: 'Gemini 1.5 Pro', description: 'Análises profundas', plan: 'Growth', available: true, icon: '🚀' },
                    { id: 'claude', name: 'Claude 3.5 Sonnet', description: 'Premium Enterprise', plan: 'Enterprise', available: false, icon: '🧠', locked_message: 'Contate o admin' },
                ]);
            });
    }, []);

    const currentModel = models.find(m => m.id === selectedModel);

    const sendMessage = async (customText?: string) => {
        const text = customText || input.trim();
        if (!text) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text,
            sender: 'user',
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        const thinkingId = 'thinking-' + Date.now();
        setMessages(prev => [
            ...prev,
            { id: thinkingId, text: '', sender: 'ai', isThinking: true },
        ]);

        try {
            // Build conversation history for context
            const history = messages
                .filter(m => !m.isThinking)
                .slice(-10) // Last 10 messages for context window
                .map(m => ({
                    role: m.sender === 'user' ? 'user' : 'assistant',
                    content: m.text,
                }));

            const response = await api.post('/ai/ask', {
                question: text,
                context: 'Assistente completo Innovation.ia',
                model: selectedModel,
                history,
            });

            const data = response.data;

            setMessages(prev => {
                const filtered = prev.filter(msg => msg.id !== thinkingId);
                return [
                    ...filtered,
                    {
                        id: Date.now().toString(),
                        text: data.answer || 'Sem resposta.',
                        sender: 'ai',
                        model: data.model_used || selectedModel,
                    },
                ];
            });
        } catch (error: any) {
            const errMsg = error?.response?.data?.detail || error?.message || 'Erro de conexão.';
            setMessages(prev => {
                const filtered = prev.filter(msg => msg.id !== thinkingId);
                return [
                    ...filtered,
                    { id: Date.now().toString(), text: `❌ ${errMsg}`, sender: 'ai' },
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

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const clearChat = () => {
        setMessages([]);
    };

    const SelectedIcon = MODEL_ICONS[selectedModel] || Zap;
    const gradientClass = MODEL_COLORS[selectedModel] || MODEL_COLORS['gemini-flash'];

    return (
        <AppLayout title="Chat IA — Assistente Innovation">
            <div className="flex h-[calc(100vh-57px)] bg-transparent text-white">
                <main className="flex-1 flex flex-col h-full relative">
                    {/* Header */}
                    <header className="p-4 border-b border-gray-800/50 flex justify-between items-center bg-gray-950/80 backdrop-blur-xl sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
                                <SelectedIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">Assistente Innovation.ia</h2>
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-xs text-gray-400">
                                        {currentModel?.name || 'Gemini 1.5 Flash'} • Online
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Model Selector */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowModelSelector(!showModelSelector)}
                                    className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm hover:border-purple-500/50 transition"
                                >
                                    <span>{currentModel?.icon || '⚡'}</span>
                                    <span className="text-gray-300">{currentModel?.name || 'Gemini Flash'}</span>
                                    <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">
                                        {currentModel?.plan || 'Starter'}
                                    </span>
                                </button>

                                {showModelSelector && (
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50">
                                        <div className="p-3 border-b border-gray-800">
                                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Selecione o Modelo</p>
                                        </div>
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
                                                    className={`w-full p-3 flex items-start gap-3 hover:bg-gray-800 transition text-left
                                                    ${isSelected ? 'bg-gray-800/80' : ''}
                                                    ${!model.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                >
                                                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 mt-0.5`}>
                                                        {model.available ? <Icon className="w-4 h-4 text-white" /> : <Lock className="w-4 h-4 text-white" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-white">{model.name}</span>
                                                            <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">{model.plan}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-0.5">{model.description}</p>
                                                        {!model.available && model.locked_message && (
                                                            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                                                <Lock className="w-3 h-3" /> {model.locked_message}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {isSelected && <span className="text-purple-400 text-xs mt-1">✓</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Clear chat */}
                            <button onClick={clearChat} className="p-2 text-gray-500 hover:text-white transition rounded-lg hover:bg-gray-800" title="Limpar conversa">
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </header>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-800">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-12">
                                <div className={`w-20 h-20 bg-gradient-to-br ${gradientClass} rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20`}>
                                    <Sparkles className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-2xl font-black mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                    Como posso ajudar hoje?
                                </h3>
                                <p className="max-w-lg text-gray-500 text-center text-sm mb-8">
                                    Sou seu copiloto de RH, Finanças e Projetos. Posso analisar currículos, calcular custos reais da folha, criar PDIs e muito mais.
                                </p>

                                {/* Quick Prompts */}
                                <div className="grid grid-cols-2 gap-3 max-w-2xl w-full">
                                    {QUICK_PROMPTS.map((prompt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => sendMessage(prompt.text)}
                                            className="text-left p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-purple-500/40 hover:bg-gray-900 transition group"
                                        >
                                            <p className="text-sm text-gray-300 group-hover:text-white transition">{prompt.text}</p>
                                            <p className="text-[10px] text-gray-600 mt-1">{prompt.category}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 
                                    ${msg.sender === 'user'
                                            ? 'bg-purple-600'
                                            : `bg-gradient-to-br ${MODEL_COLORS[selectedModel] || MODEL_COLORS['gemini-flash']}`}`}
                                    >
                                        {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
                                    </div>

                                    <div className={`relative group rounded-2xl text-sm leading-relaxed
                                    ${msg.sender === 'user'
                                            ? 'bg-purple-600 text-white rounded-br-sm p-4'
                                            : 'bg-gray-900/80 border border-gray-800 rounded-bl-sm p-4 text-gray-200'}
                                    ${msg.isThinking ? 'animate-pulse' : ''}`}
                                    >
                                        {msg.isThinking ? (
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <div className="flex gap-1">
                                                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                                <span className="text-xs">{currentModel?.name || 'IA'} pensando...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div dangerouslySetInnerHTML={{
                                                    __html: msg.text
                                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                                        .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-800 rounded-lg p-3 mt-2 mb-2 overflow-x-auto text-xs"><code>$1</code></pre>')
                                                        .replace(/`(.*?)`/g, '<code class="bg-gray-800 px-1.5 py-0.5 rounded text-purple-300 text-xs">$1</code>')
                                                        .replace(/\n/g, '<br />')
                                                }} />
                                                {msg.sender === 'ai' && !msg.isThinking && (
                                                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-800/50">
                                                        <button
                                                            onClick={() => copyToClipboard(msg.text, msg.id)}
                                                            className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-300 transition"
                                                        >
                                                            {copiedId === msg.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                                            {copiedId === msg.id ? 'Copiado!' : 'Copiar'}
                                                        </button>
                                                        {msg.model && (
                                                            <span className="text-[10px] text-gray-700 ml-auto">via {msg.model}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-[#0a0a0f] border-t border-gray-800/50">
                        <div className="relative max-w-4xl mx-auto">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={`Pergunte qualquer coisa ao ${currentModel?.name || 'Gemini Flash'}...`}
                                className="w-full bg-gray-900/50 border border-gray-800 rounded-2xl pl-5 pr-14 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all resize-none overflow-hidden min-h-[56px] text-sm"
                                rows={1}
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={!input.trim() || loading}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all
                                ${input.trim() && !loading
                                        ? `bg-gradient-to-r ${gradientClass} text-white shadow-lg`
                                        : 'text-gray-600'}`}
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex items-center justify-between max-w-4xl mx-auto mt-2 px-1">
                            <p className="text-[10px] text-gray-700">
                                {currentModel?.icon} Usando {currentModel?.name || 'Gemini Flash'} ({currentModel?.plan || 'Starter'})
                            </p>
                            <p className="text-[10px] text-gray-700">
                                A IA pode cometer erros. Verifique informações importantes.
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
