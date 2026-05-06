import React, { useState } from 'react';
import { Plus, Briefcase, MapPin, Users, MoreVertical, Filter, Search } from 'lucide-react';

const JobsDashboard = () => {
  const [jobs, setJobs] = useState([
    { id: '1', title: 'Desenvolvedor Full Stack Senior', location: 'Remoto', candidates: 12, status: 'OPEN' },
    { id: '2', title: 'Gerente de Projetos IA', location: 'São Paulo, SP', candidates: 8, status: 'OPEN' },
    { id: '3', title: 'Analista de RH', location: 'Híbrido', candidates: 25, status: 'OPEN' },
  ]);

  return (
<div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header da Página */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">Gestão de Vagas</h1>
            <p className="text-gray-400">Gerencie o recrutamento e acompanhe os candidatos em tempo real.</p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 grad-bg rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg shadow-purple-500/20">
            <Plus size={20} />
            Nova Vaga
          </button>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar vagas por título ou tecnologia..." 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          </div>
          <button className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2 hover:bg-white/10 transition-colors">
            <Filter size={18} />
            Filtros
          </button>
        </div>

        {/* Grid de Vagas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <div key={job.id} className="glass p-6 rounded-3xl hover-scale relative group">
              <button className="absolute top-4 right-4 text-gray-500 hover:text-white">
                <MoreVertical size={20} />
              </button>
              
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6">
                <Briefcase size={24} />
              </div>

              <h3 className="text-lg font-bold mb-2 group-hover:text-purple-400 transition-colors">{job.title}</h3>
              
              <div className="flex flex-col gap-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <MapPin size={16} />
                  {job.location}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Users size={16} />
                  {job.candidates} Candidatos inscritos
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-widest">
                  {job.status}
                </div>
                <button className="text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors">
                  Ver Pipeline � 
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
);
};

export default JobsDashboard;

