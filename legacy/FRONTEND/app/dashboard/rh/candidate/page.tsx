import React from 'react';
import { User, Mail, Phone, MapPin, Star, FileText, MessageSquare, History, CheckCircle, XCircle } from 'lucide-react';

const CandidateProfilePage = () => {
  return (
<div className="max-w-6xl mx-auto animate-in fade-in duration-700">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl grad-bg flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
              <User size={40} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Ana Silva</h1>
              <p className="text-gray-400">Candidata a Desenvolvedor Full Stack Senior</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-2">
              <XCircle size={18} /> Rejeitar
            </button>
            <button className="px-6 py-3 bg-green-500/10 text-green-400 border border-green-500/20 rounded-2xl font-bold hover:bg-green-500 hover:text-white transition-all flex items-center gap-2">
              <CheckCircle size={18} /> Mover para Entrevista
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Esquerda: Info & IA Score */}
          <div className="space-y-8">
            <div className="glass p-8 rounded-3xl border-purple-500/30">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Innovation IA Score</h3>
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">92</div>
              </div>
              <div className="space-y-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  A IA analisou as habilidades técnicas e experiência. Candidata possui 95% de compatibilidade com a stack de React/Next.js.
                </p>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 w-[92%]"></div>
                </div>
              </div>
            </div>

            <div className="glass p-8 rounded-3xl space-y-6">
              <h3 className="text-lg font-bold mb-2">Contato</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-400"><Mail size={18} /> ana.silva@email.com</div>
                <div className="flex items-center gap-3 text-gray-400"><Phone size={18} /> (11) 98888-7777</div>
                <div className="flex items-center gap-3 text-gray-400"><MapPin size={18} /> São Paulo, SP</div>
              </div>
            </div>
          </div>

          {/* Coluna Central/Direita: Currículo & Timeline */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass p-8 rounded-3xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold flex items-center gap-2"><FileText /> Análise de Currículo</h3>
                <button className="text-xs font-bold text-purple-400 underline">Ver PDF Original</button>
              </div>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Resumo Extraído pela IA</h4>
                  <p className="text-gray-300 leading-relaxed">Desenvolvedora Senior com 6 anos de experiência em ecossistemas JavaScript. Especialista em arquiteturas escaláveis e integração de APIs de IA.</p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Habilidades Chave</h4>
                  <div className="flex flex-wrap gap-2">
                    {['React', 'Next.js', 'Node.js', 'TypeScript', 'Prisma', 'Docker', 'AWS'].map(skill => (
                      <span key={skill} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300">{skill}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-8 flex items-center gap-2"><History /> Histórico</h3>
              <div className="space-y-6">
                <TimelineItem date="01/05/2026" event="Candidatura Recebida" desc="Candidata aplicou via Landing Page." />
                <TimelineItem date="01/05/2026" event="Triagem IA Concluída" desc="Score de 92 atribuído automaticamente." />
                <TimelineItem date="Agora" event="Em Análise" desc="Aguardando feedback do recrutador." />
              </div>
            </div>
          </div>
        </div>
      </div>
);
};

const TimelineItem = ({ date, event, desc }) => (
  <div className="flex gap-6 relative group">
    <div className="flex flex-col items-center">
      <div className="w-3 h-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50"></div>
      <div className="w-0.5 h-full bg-white/5"></div>
    </div>
    <div className="pb-8">
      <p className="text-[10px] text-gray-500 font-bold mb-1">{date}</p>
      <p className="text-sm font-bold mb-1">{event}</p>
      <p className="text-xs text-gray-400">{desc}</p>
    </div>
  </div>
);

export default CandidateProfilePage;

