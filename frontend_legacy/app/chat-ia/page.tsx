'use client';

import { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { MessageSquare, Bot } from 'lucide-react';

export default function ChatIAPage() {
    const [useFlowise, setUseFlowise] = useState(true);

    return (
        <AppLayout title="Ana IA — Assistente Inteligente">
            <div className="flex h-full flex-col items-center justify-center p-8 bg-[#050508] text-white">

                <div className="text-center max-w-2xl mb-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-purple-500/20">
                        <Bot className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Olá, eu sou a Ana IA
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Sua assistente especialista em RH Estratégico, Finanças e Gestão de Pessoas.
                        Posso ajudar a analisar currículos, calcular rescisões ou sugerir ações de clima.
                    </p>
                </div>

                {/* Flowise Embed Container */}
                <div className="w-full max-w-4xl h-[600px] bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden relative shadow-2xl">
                    <iframe
                        src="https://flowise.innovationia.com.br/chatbot/0000-0000-0000-0000" // Replace with actual embed URL if using iframe mode
                        className="w-full h-full"
                        style={{ border: 'none' }}
                        title="Ana IA Chat"
                    />

                    {/* Fallback / Loading State if iframe fails or is empty */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 -z-10">
                        <p className="text-gray-500 animate-pulse">Carregando interface neural...</p>
                    </div>
                </div>

                <p className="mt-6 text-sm text-gray-600">
                    * A Ana IA utiliza modelos avançados (GPT-4o / Claude 3.5) e pode cometer erros. Verifique informações críticas.
                </p>

            </div>
        </AppLayout>
    );
}
