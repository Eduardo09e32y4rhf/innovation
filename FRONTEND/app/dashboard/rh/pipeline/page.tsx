'use client';
import React, { useState } from 'react';
import { Search, Filter, MoreHorizontal, User, Star, Clock, MessageSquare, FileText, Plus, X, Send, Paperclip } from 'lucide-react';

const MOCK_CANDIDATES = {
  applied: [
    { id: 'c1', name: 'Ana Silva', role: 'Full Stack Senior', score: 92, time: '2h atrás', email: 'ana@email.com' },
    { id: 'c2', name: 'Bruno Costa', role: 'Full Stack Senior', score: 78, time: '5h atrás', email: 'bruno@email.com' },
  ],
  screening: [
    { id: 'c3', name: 'Carla Dias', role: 'Full Stack Senior', score: 85, time: '1d atrás', email: 'carla@email.com' },
  ],
  interview: [
    { id: 'c4', name: 'Diego Nunes', role: 'Full Stack Senior', score: 88, time: '2d atrás', email: 'diego@email.com' },
  ],
  hired: [],
};

const COLUMNS = [
  { id: 'applied', title: 'Novos', color: 'bg-blue-500' },
  { id: 'screening', title: 'Triagem IA', color: 'bg-purple-500' },
  { id: 'interview', title: 'Entrevista', color: 'bg-orange-500' },
  { id: 'hired', title: 'Contratado', color: 'bg-green-500' },
];

export default function PipelinePage() {
  const [columns, setColumns] = useState(MOCK_CANDIDATES);
  const [dragging, setDragging] = useState<string | null>(null);
  const [fromCol, setFromCol] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [notes, setNotes] = useState<Record<string, string[]>>({});
  const [noteInput, setNoteInput] = useState('');
  const [logs] = useState([
    { time: '01/05 10:22', type: 'IA', msg: 'Triagem automática concluída. Score: 92.' },
    { time: '01/05 11:00', type: 'Recrutador', msg: 'Candidata movida para Triagem IA.' },
    { time: '01/05 14:30', type: 'Bot', msg: 'Mensagem enviada via WhatsApp: "Olá Ana, temos uma oportunidade para você!"' },
  ]);

  const handleDragStart = (candidateId: string, colId: string) => {
    setDragging(candidateId);
    setFromCol(colId);
  };

  const handleDrop = (toColId: string) => {
    if (!dragging || !fromCol || fromCol === toColId) return;

    const updated = { ...columns } as any;
    const candidate = updated[fromCol].find((c: any) => c.id === dragging);
    if (!candidate) return;

    updated[fromCol] = updated[fromCol].filter((c: any) => c.id !== dragging);
    updated[toColId] = [...updated[toColId], { ...candidate, time: 'Agora' }];

    setColumns(updated);
    setDragging(null);
    setFromCol(null);
  };

  const addNote = () => {
    if (!noteInput.trim() || !selected) return;
    const id = selected.id;
    setNotes(prev => ({ ...prev, [id]: [...(prev[id] || []), noteInput.trim()] }));
    setNoteInput('');
  };

  const allCandidates = Object.values(columns).flat() as any[];

  return (
<div className="flex h-[calc(100vh-120px)] gap-6 overflow-hidden">
        {/* Kanban Board */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Pipeline de Recrutamento</h1>
              <p className="text-gray-400 text-sm mt-1">Arraste para mover · {allCandidates.length} candidatos ativos</p>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input type="text" placeholder="Buscar candidato..." className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-purple-500 w-64" />
              </div>
              <button className="p-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10"><Filter size={18} /></button>
            </div>
          </header>

          <div className="flex gap-4 overflow-x-auto flex-1 pb-4">
            {COLUMNS.map((col) => {
              const candidates = (columns as any)[col.id] || [];
              return (
                <div
                  key={col.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(col.id)}
                  className="min-w-[280px] flex flex-col bg-white/[0.02] border border-white/5 rounded-3xl p-4"
                >
                  <div className="flex items-center gap-2 mb-4 px-1">
                    <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                    <h3 className="font-bold text-sm text-gray-300 uppercase tracking-widest flex-1">{col.title}</h3>
                    <span className="bg-white/5 text-xs px-2 py-0.5 rounded-lg text-gray-500 font-mono">{candidates.length}</span>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto">
                    {candidates.map((c: any) => (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={() => handleDragStart(c.id, col.id)}
                        onClick={() => setSelected(c)}
                        className={`glass p-4 rounded-2xl border cursor-grab active:cursor-grabbing transition-all hover:border-purple-500/50 ${selected?.id === c.id ? 'border-purple-500' : 'border-white/5'}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center border border-white/10">
                              <User size={16} className="text-purple-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold leading-none">{c.name}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5">{c.role}</p>
                            </div>
                          </div>
                          <button className="text-gray-600 hover:text-white"><MoreHorizontal size={14} /></button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 rounded-lg">
                            <Star size={10} className="text-yellow-400 fill-yellow-400" />
                            <span className="text-[10px] font-bold text-purple-400">{c.score}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-gray-600">
                            <Clock size={10} />{c.time}
                          </div>
                        </div>
                      </div>
                    ))}
                    {candidates.length === 0 && (
                      <div className="h-20 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center text-xs text-gray-700">
                        Solte aqui
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Painel lateral do candidato */}
        {selected && (
          <div className="w-80 glass rounded-3xl flex flex-col overflow-hidden border border-purple-500/20 animate-in slide-in-from-right-4 duration-300">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl grad-bg flex items-center justify-center">
                  <User size={18} />
                </div>
                <div>
                  <p className="font-bold text-sm">{selected.name}</p>
                  <p className="text-[10px] text-gray-500">{selected.role}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>

            {/* Score */}
            <div className="px-5 py-4 border-b border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">IA Score</span>
                <span className="text-purple-400 font-black text-lg">{selected.score}</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all" style={{ width: `${selected.score}%` }}></div>
              </div>
            </div>

            {/* Log de comunicação */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1"><MessageSquare size={10} /> Log de Comunicação</p>
              {logs.map((log, i) => (
                <div key={i} className="text-xs bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-[10px] text-gray-500 mb-1">{log.time} · <span className="text-purple-400">{log.type}</span></p>
                  <p className="text-gray-300">{log.msg}</p>
                </div>
              ))}

              {/* Notas do recrutador */}
              {(notes[selected.id] || []).map((note, i) => (
                <div key={i} className="text-xs bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
                  <p className="text-[10px] text-purple-400 mb-1">Agora · <span>Recrutador</span></p>
                  <p className="text-gray-300">{note}</p>
                </div>
              ))}
            </div>

            {/* Input de nota */}
            <div className="p-4 border-t border-white/5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNote()}
                  placeholder="Adicionar nota..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-purple-500"
                />
                <button onClick={addNote} className="p-2 grad-bg rounded-xl hover:scale-105 transition-transform">
                  <Send size={14} />
                </button>
              </div>
              <button className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-white/5 rounded-xl text-[10px] text-gray-500 hover:bg-white/10 transition-colors">
                <Paperclip size={12} /> Anexar Arquivo
              </button>
            </div>
          </div>
        )}
      </div>
);
}

