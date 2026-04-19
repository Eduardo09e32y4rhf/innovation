 e'use client';

import { useChat } from 'ai/react';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { useRef, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';

export default function ChatIA() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, stop } = useChat({
    api: '/api/chat',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <AppLayout title="Chat IA - Innovation Assistant">
      <div className="flex flex-col h-screen bg-gradient-to-b from-slate-50 to-indigo-50 p-4 md:p-8">
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
          <div className="bg-white/70 backdrop-blur-xl border border-slate-200/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full mb-6">
            <div className="p-6 border-b border-slate-200/50 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
              <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                Innovation IA Assistant
              </h1>
              <p className="text-slate-500 text-sm mt-1 font-medium">Estrategista mestre para RH, Finanças e Automação</p>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-12">
                  <div className="w-24 h-24 bg-indigo-100 rounded-3xl flex items-center justify-center mb-6">
                    <Send className="w-12 h-12 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Comece uma conversa</h3>
                  <p className="text-sm max-w-md">Faça uma pergunta sobre RH, finanças, automação ou estratégia empresarial</p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-2xl shadow-md ${
                        m.role === 'user'
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-none'
                          : 'bg-slate-100 text-slate-900 rounded-bl-none border border-slate-200'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      {m.role === 'assistant' && (
                        <div className="flex items-center gap-1 mt-3 text-xs opacity-75">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                          <span>IA Innovation</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-6 border-t border-slate-200/50 bg-white/50">
              <div className="flex gap-3">
                <input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Digite sua pergunta sobre RH, finanças ou estratégia..."
                  className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl px-5 py-4 text-sm placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/25 focus:border-indigo-300 transition-all resize-none"
                  disabled={isLoading}
                />
                <Button type="submit" size="icon" className="w-14 h-14 rounded-2xl shadow-lg hover:shadow-xl bg-gradient-to-r from-indigo-600 to-purple-600 border-0" disabled={isLoading || !input.trim()}>
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
              {error && (
                <p className="text-xs text-rose-600 mt-2 px-1 font-medium text-center">{error}</p>
              )}
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

