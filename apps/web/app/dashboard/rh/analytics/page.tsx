import React from 'react';
import { BarChart3, TrendingUp, Users, Target, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const AnalyticsPage = () => {
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-700">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Analytics de Recrutamento</h1>
        <p className="text-gray-400">Acompanhe a eficiencia do seu funil de contratacao e performance da IA.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard title="Total de Candidatos" value="1,284" change="+12%" icon={<Users />} positive={true} />
        <StatCard title="Media AI Score" value="82.4" change="+5.2%" icon={<Target />} positive={true} />
        <StatCard title="Taxa de Conversao" value="14.2%" change="-2.1%" icon={<TrendingUp />} positive={false} />
        <StatCard title="Vagas Ativas" value="12" change="0%" icon={<Calendar />} positive={true} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold flex items-center gap-2"><BarChart3 /> Performance do Funil</h3>
            <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xs outline-none">
              <option>Ultimos 30 dias</option>
              <option>Ultimos 7 dias</option>
            </select>
          </div>

          <div className="space-y-6">
            <FunnelStep label="Candidaturas" value="1,284" percent="100%" color="bg-purple-500" />
            <FunnelStep label="Triagem IA" value="450" percent="35%" color="bg-blue-500" />
            <FunnelStep label="Entrevistas" value="120" percent="9.3%" color="bg-indigo-500" />
            <FunnelStep label="Contratacoes" value="18" percent="1.4%" color="bg-green-500" />
          </div>
        </div>

        <div className="lg:col-span-1 glass p-8 rounded-3xl">
          <h3 className="text-xl font-bold mb-8">Principais Canais</h3>
          <div className="space-y-6">
            <SourceItem name="LinkedIn" value="542" />
            <SourceItem name="Gupy (Sync)" value="321" />
            <SourceItem name="Indicacao" value="184" />
            <SourceItem name="Organico" value="120" />
          </div>

          <div className="mt-10 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
            <p className="text-xs text-purple-400 font-bold mb-1">Dica da IA</p>
            <p className="text-[10px] text-gray-400">O LinkedIn esta trazendo os candidatos com maior AI Score (media 88).</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, change, icon, positive }) => (
  <div className="glass p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-white/5 rounded-2xl text-gray-400 group-hover:text-purple-400 transition-colors">{icon}</div>
      <div className={`flex items-center gap-1 text-[10px] font-bold ${positive ? 'text-green-400' : 'text-red-400'}`}>
        {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {change}
      </div>
    </div>
    <h2 className="text-2xl font-black mb-1">{value}</h2>
    <p className="text-xs text-gray-500 uppercase tracking-widest">{title}</p>
  </div>
);

const FunnelStep = ({ label, value, percent, color }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-xs font-bold px-1">
      <span className="text-gray-400">{label}</span>
      <span className="text-white">{value} <span className="text-gray-600 font-normal ml-1">({percent})</span></span>
    </div>
    <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-1000`} style={{ width: percent }} />
    </div>
  </div>
);

const SourceItem = ({ name, value }) => (
  <div className="flex justify-between items-center group cursor-default">
    <span className="text-sm text-gray-400 group-hover:text-white transition-colors">{name}</span>
    <span className="text-sm font-mono font-bold text-gray-200">{value}</span>
  </div>
);

export default AnalyticsPage;
