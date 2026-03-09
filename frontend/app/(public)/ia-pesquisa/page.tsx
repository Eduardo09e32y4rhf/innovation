'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, User, Sparkles, StopCircle, RefreshCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    isThinking?: boolean;
}

export default function IAPublicaPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
            const response = await fetch(`/api/v1/ai/public-ask-stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: text,
                    model: 'gemini-flash', // default
                    history,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) throw new Error('Falha na comunicação com a IA');

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
                        if (content.startsWith('[ERROR]')) {
                            fullText += `\n\n❌ **Erro:** ${content.replace('[ERROR]', '').trim()}`;
                        } else {
                            const decodedChunk = content.replace(/\[NEWLINE\]/g, '\n');
                            fullText += decodedChunk;
                        }

                        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m));
                    }
                }
            }

        } catch (error: any) {
            if (error.name === 'AbortError') {
                setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: m.text + '... [Pesquisa Interrompida]', isThinking: false } : m));
            } else {
                setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: `❌ **Erro:** ${error.message || 'Serviço indisponível.'}`, isThinking: false } : m));
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

    const SUGGESTIONS = [
        "Quais as novas regras do INSS?",
        "Como funciona o saque-aniversário do FGTS hoje?",
        "Houve mudança no Imposto de Renda?"
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            {/* Header Simples */}
            <header className="bg-white border-slate-200 border-black/5 shadow-sm border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-slate-900 shadow-md">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-slate-800">IA de Pesquisa Rápida</h1>
                        <p className="text-xs text-slate-9000">Busca em tempo real na Web (Google/YouTube)</p>
                    </div>
                </div>
                {messages.length > 0 && (
                    <button
                        onClick={() => setMessages([])}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        title="Nova Pesquisa"
                    >
                        <RefreshCcw className="w-5 h-5" />
                    </button>
                )}
            </header>

            {/* Área de Chat */}
            <main className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-6 overflow-y-auto pb-32">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center mt-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 text-blue-600">
                            <Sparkles className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold mb-3 text-slate-800">Olá! O que você precisa saber hoje?</h2>
                        <p className="text-slate-9000 max-w-md mb-8">
                            Faça uma pergunta sobre Leis, FGTS, INSS, Impostos ou qualquer outro assunto. Eu busco as respostas mais atualizadas na internet para você.
                        </p>

                        <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                            {SUGGESTIONS.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => sendMessage(s)}
                                    className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-200 hover:border-blue-400 text-slate-700 text-sm px-4 py-2 rounded-full shadow-sm hover:shadow transition-all"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.sender === 'ai' && (
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-slate-900 shrink-0 mt-1 shadow-sm">
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                )}

                                <div className={`px-5 py-4 rounded-2xl max-w-[85%] text-[15px] leading-relaxed shadow-sm
                                    ${msg.sender === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-sm'
                                        : 'bg-white border-slate-200 border-black/5 shadow-sm border-slate-200 text-slate-800 rounded-tl-sm'}`}
                                >
                                    {msg.isThinking ? (
                                        <div className="flex items-center gap-2 text-slate-9000">
                                            <div className="flex gap-1">
                                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                            </div>
                                            <span className="text-sm font-medium">Buscando na Web...</span>
                                        </div>
                                    ) : (
                                        <div className={`prose ${msg.sender === 'user' ? 'prose-invert' : ''} max-w-none`}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>

                                {msg.sender === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0 mt-1">
                                        <User className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                )}
            </main>

            {/* Input Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-10 pb-6 px-4">
                <div className="max-w-3xl mx-auto relative">
                    <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-300 shadow-xl rounded-[2rem] p-2 flex items-end focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Pergunte o que quiser..."
                            className="w-full bg-transparent px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none resize-none max-h-32 min-h-[48px]"
                            rows={1}
                        />
                        <button
                            onClick={() => loading ? stopGeneration() : sendMessage()}
                            disabled={!input.trim() && !loading}
                            className={`p-3 m-1 rounded-full transition-all flex items-center justify-center shrink-0
                                ${(input.trim() || loading)
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                                    : 'bg-slate-100 text-slate-400'}`}
                        >
                            {loading ? <StopCircle className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                        </button>
                    </div>
                    <div className="text-center mt-3">
                        <p className="text-[11px] text-slate-400 font-medium">
                            A IA pode cometer erros. Sempre verifique informações importantes nos sites oficiais do governo.
                        </p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .prose p { margin-bottom: 0.75em; margin-top: 0; }
                .prose p:last-child { margin-bottom: 0; }
                .prose strong { font-weight: 700; color: inherit; }
                .prose ul { margin-top: 0.5em; margin-bottom: 0.5em; padding-left: 1.5em; }
                .prose li { margin-bottom: 0.25em; }
            `}</style>
        </div>
    );
}
