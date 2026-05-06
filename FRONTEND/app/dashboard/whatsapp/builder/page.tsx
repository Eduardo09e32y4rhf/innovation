'use client';
import React, { useState } from 'react';
import { MessageSquare, GitBranch, Play, Save, Plus, Database, Cpu, Zap, ChevronRight, Bot, User, CheckCircle, X } from 'lucide-react';

const FLOWS = [
  {
    id: 'f1', title: 'Triagem de Candidatos', active: true,
    nodes: [
      { id: 'n1', type: 'trigger', title: 'Nova Candidatura Recebida', desc: 'Dispara quando candidato aplica' },
      { id: 'n2', type: 'action', title: 'IA: Analisar Perfil (Gemini)', desc: 'Score automático + extração de skills' },
      { id: 'n3', type: 'condition', title: 'Score > 75?', desc: 'Bifurcação por qualificação' },
      { id: 'n4', type: 'message', title: 'Enviar WhatsApp: Aprovado!', desc: 'Mensagem personalizada pela IA' },
    ]
  },
  {
    id: 'f2', title: 'Cobrança em Atraso', active: false,
    nodes: []
  },
];

const GEMINI_RESPONSES = [
  'Analisando currículo... Detectei 7 habilidades compatíveis. Score: 88.',
  'Candidato elegível para entrevista. Encaminhando para o pipeline.',
  'Mensagem de WhatsApp gerada automaticamente e enviada.',
  'Relatório de triagem concluído. 3 candidatos aprovados de 12.',
];

export default function BotBuilderPage() {
  const [activeFlow, setActiveFlow] = useState(FLOWS[0]);
  const [testing, setTesting] = useState(false);
  const [testLog, setTestLog] = useState<string[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'bot', text: 'Olá! Sou o Omnius IA. Pergunte-me sobre candidatos ou automações.' }
  ]);

  const runTest = () => {
    setTesting(true);
    setTestLog([]);
    let i = 0;
    const interval = setInterval(() => {
      if (i >= GEMINI_RESPONSES.length) {
        clearInterval(interval);
        setTesting(false);
        return;
      }
      setTestLog(prev => [...prev, GEMINI_RESPONSES[i]]);
      i++;
    }, 800);
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');

    setTimeout(() => {
      const responses: Record<string, string> = {
        candidato: 'Temos 45 candidatos ativos. 12 foram aprovados na triagem IA esta semana. Quer ver o pipeline completo?',
        vaga: 'Existem 3 vagas abertas: Full Stack Senior (12 candidatos), Gerente de Projetos (8) e Analista de RH (25).',
        score: 'O score médio dos candidatos esta semana é 81. Ana Silva lidera com 92 pontos.',
      };
      const key = Object.keys(responses).find(k => userMsg.toLowerCase().includes(k));
      const botReply = key ? responses[key] : `Entendido! Processando com Gemini Pro: "${userMsg}". Resultado disponível em instantes.`;
      setChatMessages(prev => [...prev, { role: 'bot', text: botReply }]);
    }, 900);
  };

  const nodeColors: Record<string, string> = {
    trigger: 'border-blue-500/50 bg-blue-500/5',
    action: 'border-purple-500/50 bg-purple-500/5',
    condition: 'border-orange-500/50 bg-orange-500/5',
    message: 'border-green-500/50 bg-green-500/5',
  };

  const nodeIcons: Record<string, any> = {
    trigger: <Zap size={16} className="text-blue-400" />,
    action: <Cpu size={16} className="text-purple-400" />,
    condition: <GitBranch size={16} className="text-orange-400" />,
    message: <MessageSquare size={16} className="text-green-400" />,
  };

  return (
<div className="max-w-7xl mx-auto h-[calc(100vh-120px)] flex flex-col animate-in fade-in duration-700">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-1">Bot Builder · IA Gemini</h1>
            <p className="text-gray-400 text-sm">Fluxos de automação com inteligência Gemini Pro integrada.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowChat(!showChat)}
              className="px-5 py-2 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs font-bold text-purple-400 hover:bg-purple-500 hover:text-white transition-all flex items-center gap-2"
            >
              <Bot size={14} /> Chat com IA
            </button>
            <button
              onClick={runTest}
              disabled={testing}
              className="px-5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <Play size={14} className={`text-green-400 ${testing ? 'animate-pulse' : ''}`} />
              {testing ? 'Testando...' : 'Testar Fluxo'}
            </button>
            <button className="px-6 py-2 grad-bg rounded-xl text-xs font-bold shadow-lg shadow-purple-500/20 flex items-center gap-2">
              <Save size={14} /> Salvar
            </button>
          </div>
        </header>

        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Lista de Fluxos */}
          <div className="w-56 flex flex-col gap-3">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-1">Fluxos</p>
            {FLOWS.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFlow(f)}
                className={`text-left p-4 rounded-2xl border transition-all ${activeFlow.id === f.id ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/5'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold">{f.title}</p>
                  <div className={`w-2 h-2 rounded-full ${f.active ? 'bg-green-400' : 'bg-gray-600'}`}></div>
                </div>
                <p className="text-[10px] text-gray-500">{f.nodes.length} etapas</p>
              </button>
            ))}
            <button className="p-4 rounded-2xl border border-dashed border-white/10 flex items-center justify-center gap-2 text-[10px] text-gray-600 hover:border-purple-500/30 hover:text-purple-400 transition-all">
              <Plus size={14} /> Novo Fluxo
            </button>
          </div>

          {/* Canvas do Fluxo */}
          <div className="flex-1 flex gap-6 overflow-hidden">
            <div className="flex-1 glass rounded-[30px] p-8 overflow-y-auto">
              <div className="max-w-md mx-auto space-y-2">
                {activeFlow.nodes.map((node, i) => (
                  <div key={node.id}>
                    <div className={`p-4 rounded-2xl border ${nodeColors[node.type]} flex items-start gap-3 hover:scale-[1.01] transition-transform cursor-pointer`}>
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                        {nodeIcons[node.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold mb-0.5">{node.title}</p>
                        <p className="text-[10px] text-gray-500">{node.desc}</p>
                      </div>
                      <ChevronRight size={14} className="text-gray-600 shrink-0 mt-1" />
                    </div>
                    {i < activeFlow.nodes.length - 1 && (
                      <div className="w-0.5 h-6 bg-gradient-to-b from-purple-500/50 to-transparent mx-auto my-1"></div>
                    )}
                  </div>
                ))}
                <button className="w-full mt-4 p-4 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center gap-2 text-xs text-gray-600 hover:border-purple-500/30 hover:text-purple-400 transition-all">
                  <Plus size={16} /> Adicionar Etapa
                </button>
              </div>
            </div>

            {/* Log de Teste ou Chat com IA */}
            {(testLog.length > 0 || showChat) && (
              <div className="w-72 glass rounded-[30px] p-6 flex flex-col animate-in slide-in-from-right-4 duration-300">
                {showChat ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Bot size={16} className="text-purple-400" />
                        <p className="text-sm font-bold">Gemini IA Chat</p>
                      </div>
                      <button onClick={() => setShowChat(false)} className="text-gray-500 hover:text-white"><X size={14} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                          {msg.role === 'bot' && <div className="w-6 h-6 rounded-full grad-bg flex items-center justify-center shrink-0"><Bot size={12} /></div>}
                          <div className={`max-w-[200px] p-3 rounded-2xl text-[11px] leading-relaxed ${msg.role === 'bot' ? 'bg-white/5 text-gray-300' : 'bg-purple-600 text-white'}`}>
                            {msg.text}
                          </div>
                          {msg.role === 'user' && <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0"><User size={12} /></div>}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendChat()}
                        placeholder="Pergunte ao Gemini..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <button onClick={sendChat} className="p-2 grad-bg rounded-xl hover:scale-105 transition-transform">
                        <Play size={12} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Log de Execução</p>
                    <div className="flex-1 space-y-3">
                      {testLog.map((entry, i) => (
                        <div key={i} className="flex items-start gap-2 text-[11px] animate-in fade-in duration-300">
                          <CheckCircle size={14} className="text-green-400 shrink-0 mt-0.5" />
                          <span className="text-gray-300">{entry}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
);
}

