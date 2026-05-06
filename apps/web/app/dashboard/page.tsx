"use client";
import React from 'react';
import Link from 'next/link';
import { 
  Users, 
  MessageSquare, 
  Zap, 
  TrendingUp, 
  Clock, 
  ArrowUpRight,
  Target
} from 'lucide-react';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { useAuth } from '@/app/contexts/AuthContext';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function DashboardHome() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <ProtectedRoute>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {/* Welcome Section */}
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight mb-2">{t('dashboard.welcome')}, <span className="grad-text">{user?.name || 'Usuário'}</span></h1>
              <p className="text-gray-400">Aqui está o que está acontecendo na sua empresa hoje.</p>
            </div>
            <div className="flex gap-3">
               <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold flex items-center gap-2">
                  <Clock size={14} className="text-purple-400" /> {new Date().toLocaleDateString('pt-BR')}
               </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard title="Total Candidatos" value="1,284" change="+12%" icon={<Users className="text-blue-400" />} />
            <StatCard title="Atendimentos IA" value="856" change="+24%" icon={<MessageSquare className="text-purple-400" />} />
            <StatCard title="Vagas Abertas" value="12" change="0%" icon={<Target className="text-orange-400" />} />
            <StatCard title="Economia de Tempo" value="142h" change="+18%" icon={<Zap className="text-yellow-400" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Chart/Activity Area */}
            <div className="lg:col-span-2 glass p-8 rounded-[40px] border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp size={120} />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  Atividade Recente <ArrowUpRight size={18} className="text-purple-500" />
                </h3>
                <div className="space-y-6">
                  <ActivityItem label="Novo candidato qualificado" desc="Ana Silva atingiu 92% de match para Full Stack." time="2 horas atrás" />
                  <ActivityItem label="Bot de Triagem Finalizado" desc="Triagem automática concluída para 45 candidatos." time="4 horas atrás" />
                  <ActivityItem label="Pagamento Processado" desc="Assinatura Enterprise renovada via Asaas." time="Ontem" />
                  <ActivityItem label="Nova Vaga Publicada" desc="Vaga para Tech Lead postada no LinkedIn." time="Ontem" />
                </div>
              </div>
            </div>

            {/* Side Module Access */}
            <div className="space-y-6">
              <QuickAccessCard 
                title="IA Engine" 
                desc="Análise DISC e Resumo" 
                color="bg-purple-500" 
                link="/dashboard/rh/pipeline"
              />
              <QuickAccessCard 
                title="WhatsApp Bot" 
                desc="Configurar Fluxos" 
                color="bg-green-500" 
                link="/dashboard/whatsapp/builder"
              />
              <QuickAccessCard 
                title="Financeiro" 
                desc="Faturas e Métricas" 
                color="bg-blue-500" 
                link="/dashboard/finance/pricing"
              />
            </div>
          </div>
      </div>
    </ProtectedRoute>
  );
}

const StatCard = ({ title, value, change, icon }) => (
  <div className="glass p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform">{icon}</div>
      <span className={`text-xs font-bold ${change.startsWith('+') ? 'text-green-500' : 'text-gray-500'}`}>{change}</span>
    </div>
    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">{title}</p>
    <h4 className="text-2xl font-black">{value}</h4>
  </div>
);

const ActivityItem = ({ label, desc, time }) => (
  <div className="flex gap-4 items-start pb-6 border-b border-white/5 last:border-0 last:pb-0">
    <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
    <div>
      <p className="font-bold text-sm">{label}</p>
      <p className="text-xs text-gray-500 mb-1">{desc}</p>
      <p className="text-[10px] text-gray-600 font-mono">{time}</p>
    </div>
  </div>
);

const QuickAccessCard = ({ title, desc, color, link }) => (
  <Link href={link} className="block glass p-6 rounded-3xl border border-white/5 hover:bg-white/5 transition-all group">
    <div className="flex justify-between items-center">
      <div>
        <h4 className="font-bold mb-1">{title}</h4>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
      <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
        <ArrowUpRight size={20} className="text-white" />
      </div>
    </div>
  </Link>
);

