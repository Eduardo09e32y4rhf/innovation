'use client';
import React, { useState } from 'react';
import { Search, MapPin, Briefcase, Clock, ArrowRight, CheckCircle, FileText, Upload, Send, X, Bot } from 'lucide-react';

const JOBS = [
  { id: '1', title: 'Desenvolvedor Full Stack Senior', category: 'Engenharia', type: 'Remoto', salary: 'R$ 15k - 22k', tags: ['React', 'Node.js', 'TypeScript'], description: 'Buscamos alguém para liderar a evolução da nossa plataforma de IA.' },
  { id: '2', title: 'Gerente de Projetos IA', category: 'Produto', type: 'Híbrido (SP)', salary: 'R$ 12k - 18k', tags: ['Agile', 'AI Tools', 'Roadmap'], description: 'Gestão de ciclos de desenvolvimento de modelos generativos.' },
  { id: '3', title: 'Analista de RH Pleno', category: 'People', type: 'Presencial', salary: 'R$ 7k - 10k', tags: ['Recrutamento', 'ATS', 'Cultura'], description: 'Foco em contratação técnica e cultura de inovação.' },
];

export default function PublicJobsPage() {
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setApplied(true);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#05050a] text-white selection:bg-purple-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Header */}
      <nav className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl px-8 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 grad-bg rounded-lg flex items-center justify-center font-bold text-white shadow-lg">I</div>
          <span className="text-xl font-bold tracking-tighter">INNOVATION<span className="text-purple-500">.IA</span></span>
        </div>
        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Portal de Carreiras</div>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <header className="text-center mb-16">
          <h1 className="text-5xl font-black tracking-tight mb-4">Mude o futuro da <span className="grad-text">Tecnologia</span>.</h1>
          <p className="text-gray-400 max-w-xl mx-auto">Trabalhe em uma das empresas que mais cresce no setor de IA e Recrutamento Estratégico.</p>
        </header>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-12">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Qual vaga você procura?" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          </div>
          <div className="flex gap-4">
             <select className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-purple-500 appearance-none cursor-pointer">
                <option>Todas Áreas</option>
                <option>Engenharia</option>
                <option>Produto</option>
             </select>
          </div>
        </div>

        {/* Jobs Grid */}
        <div className="grid gap-6">
          {JOBS.map((job) => (
            <div 
              key={job.id} 
              onClick={() => setSelectedJob(job)}
              className="glass p-8 rounded-[32px] border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase rounded-lg">{job.category}</span>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold uppercase"><Clock size={12}/> {job.type}</div>
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-purple-400 transition-colors">{job.title}</h3>
                <div className="flex flex-wrap gap-2">
                  {job.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-white/5 rounded-lg text-[10px] text-gray-400 border border-white/5">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden md:block">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Base Salarial</p>
                  <p className="text-sm font-mono text-gray-300">{job.salary}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-all">
                  <ArrowRight size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal de Candidatura */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass w-full max-w-2xl rounded-[40px] border border-white/10 overflow-hidden relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => { setSelectedJob(null); setApplied(false); }} 
              className="absolute top-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>

            {applied ? (
              <div className="p-16 text-center">
                <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-8">
                  <CheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-black mb-4">Candidatura Enviada!</h2>
                <p className="text-gray-400 mb-8 leading-relaxed">Sua aplicação para <strong>{selectedJob.title}</strong> foi recebida. Nossa IA vai analisar seu perfil e você receberá um retorno em breve via e-mail ou WhatsApp.</p>
                <button 
                  onClick={() => { setSelectedJob(null); setApplied(false); }} 
                  className="px-8 py-4 grad-bg rounded-2xl font-bold hover:scale-105 transition-transform"
                >
                  Ver outras vagas
                </button>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row h-full">
                <div className="md:w-2/5 grad-bg p-10 flex flex-col justify-between text-white">
                  <div>
                    <Bot size={40} className="mb-6" />
                    <h2 className="text-3xl font-black leading-tight mb-4">Aplicação via <br/> Innovation IA</h2>
                    <p className="text-sm text-white/80 leading-relaxed italic">"Nossa tecnologia analisa seu currículo em tempo real para dar match com nossas oportunidades."</p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <CheckCircle size={14} /> Triagem Inteligente
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <CheckCircle size={14} /> Feedback Rápido
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-10">
                  <h3 className="text-xl font-bold mb-2">{selectedJob.title}</h3>
                  <p className="text-xs text-gray-500 mb-8">{selectedJob.type} · {selectedJob.category}</p>
                  
                  <form onSubmit={handleApply} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nome Completo</label>
                      <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-purple-500" placeholder="Seu nome" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">E-mail</label>
                      <input required type="email" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-purple-500" placeholder="seu@email.com" />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Currículo (PDF)</label>
                      <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-purple-500/50 transition-all cursor-pointer group">
                        <Upload size={24} className="mx-auto mb-2 text-gray-500 group-hover:text-purple-400 transition-colors" />
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Arraste ou clique para subir</p>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 grad-bg rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {loading ? 'Processando IA...' : 'Confirmar Candidatura'}
                      {!loading && <Send size={18} />}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
