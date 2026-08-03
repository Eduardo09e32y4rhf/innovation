'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2,
  Users,
  ShieldCheck,
  TrendingUp,
  Activity,
  ArrowRight,
  Clock,
  WalletCards,
  FileSignature,
  Settings2,
  Zap,
  FileText
} from 'lucide-react';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';

const QUICK_LINKS = [
  { id: 'finance', title: 'Financeiro', subtitle: 'Gestão de assinaturas e Asaas', icon: WalletCards, href: '/finance', color: 'from-emerald-500/20 to-emerald-900/20', iconColor: 'text-emerald-600' },
  { id: 'contracts', title: 'Contratos', subtitle: 'Ciclo de vida e renovações', icon: FileSignature, href: '/contracts', color: 'from-blue-500/20 to-blue-900/20', iconColor: 'text-blue-600' },
  { id: 'config', title: 'Configuração', subtitle: 'Planos, limites e auditoria', icon: Settings2, href: '/configuration', color: 'from-violet-500/20 to-violet-900/20', iconColor: 'text-[#8A05BE]' },
];

const RECENT_LOGS = [
  { id: 1, text: 'Nova empresa ativada', detail: 'Tech Solutions Ltda assinou Plano Premium', time: 'Agora', icon: Building2, color: 'text-emerald-600', dot: 'bg-emerald-500' },
  { id: 2, text: 'Pagamento processado', detail: 'Asaas: R$ 499,90 recebidos', time: 'Há 15 min', icon: WalletCards, color: 'text-blue-600', dot: 'bg-blue-500' },
  { id: 3, text: 'Contrato gerado', detail: 'Inove SA - Contrato de prestação de serviços', time: 'Há 2h', icon: FileText, color: 'text-violet-600', dot: 'bg-violet-500' },
  { id: 4, text: 'Alerta de falha', detail: 'Falha no webhook do Asaas (Tentativa 1)', time: 'Há 5h', icon: Zap, color: 'text-red-600', dot: 'bg-red-500' },
];

export default function PlatformDashboard() {
  const params = useParams();
  const router = useRouter();
  const tenant = String(params?.tenant || '');
  const stats = useQuery(() => api.platform.stats(), []);

  return (
    <div className="min-h-screen bg-slate-50 w-full pb-12">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* HEADER */}
        <div className="flex flex-col gap-1 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#8A05BE] mb-2 block">
                PLATAFORMA CENTRAL
              </span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Console da Plataforma</h1>
              <p className="text-sm text-slate-500 mt-1">
                Gestão macro de inquilinos, assinaturas e saúde do sistema.
              </p>
            </div>
            <button 
              onClick={() => router.push(`/${tenant}/dashboard/platform/companies`)}
              className="btn-nubank shadow-lg shadow-[#8A05BE]/20"
            >
              Nova Empresa
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* MAIN STATS - SPANS 8 COLS */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1: Active Companies */}
            <div className="card-stat">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="card-stat-label">Empresas Ativas</span>
              </div>
              <div className="card-stat-value">
                {stats.loading ? <span className="animate-pulse bg-slate-200 rounded h-8 w-16 block" /> : stats.data?.activeCompanies || 0}
              </div>
              <div className="card-stat-detail flex items-center gap-1 mt-2">
                <TrendingUp size={12} className="text-emerald-500" />
                Em crescimento
              </div>
            </div>

            {/* Card 2: Total Users */}
            <div className="card-stat">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <span className="card-stat-label">Usuários Totais</span>
              </div>
              <div className="card-stat-value">
                {stats.loading ? <span className="animate-pulse bg-slate-200 rounded h-8 w-16 block" /> : stats.data?.users || 0}
              </div>
              <div className="card-stat-detail flex items-center gap-1 mt-2">
                <Activity size={12} className="text-blue-500" />
                Acessos ativos
              </div>
            </div>

            {/* Card 3: Inadimplentes */}
            <div className="card-stat">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-red-600" />
                </div>
                <span className="card-stat-label">Inadimplentes</span>
              </div>
              <div className="card-stat-value text-red-600">
                {stats.loading ? <span className="animate-pulse bg-slate-200 rounded h-8 w-16 block" /> : stats.data?.pastDueCompanies || 0}
              </div>
              <div className="card-stat-detail mt-2">Atenção requerida</div>
            </div>

            {/* General Overview */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 card-flat bg-gradient-to-br from-white to-slate-50 border-slate-200 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#8A05BE]/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-xl font-black text-slate-900 mb-2">Visão Geral Operacional</h3>
                <p className="text-sm text-slate-500 max-w-md">
                  O ecossistema está rodando perfeitamente. O faturamento e o volume de acessos apresentam uma curva positiva de crescimento.
                </p>
              </div>
              <div className="flex gap-4 relative z-10">
                <div className="text-center px-5 py-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Funcionários</p>
                  <p className="text-xl font-black text-slate-900">{stats.loading ? '-' : stats.data?.employees || 0}</p>
                </div>
                <div className="text-center px-5 py-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Suspensas</p>
                  <p className="text-xl font-black text-red-600">{stats.loading ? '-' : stats.data?.suspendedCompanies || 0}</p>
                </div>
              </div>
            </div>

          </div>

          {/* QUICK LINKS - SPANS 4 COLS */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <h3 className="section-title mb-2 px-1">Acesso Rápido</h3>
            
            {QUICK_LINKS.map((link) => (
              <button 
                key={link.id}
                onClick={() => router.push(`/${tenant}/dashboard/platform${link.href}`)}
                className="group relative flex items-center gap-4 card-flat p-4 text-left transition-all hover:-translate-y-0.5 overflow-hidden border-slate-200"
              >
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 group-hover:border-[#8A05BE]/20 transition-colors">
                  <link.icon size={20} className={link.iconColor} />
                </div>
                <div className="relative flex-1">
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#8A05BE] transition-colors">{link.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{link.subtitle}</p>
                </div>
                <ArrowRight size={16} className="text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-[#8A05BE]" />
              </button>
            ))}
          </div>

          {/* BOTTOM SECTION: AUDIT TIMELINE */}
          <div className="md:col-span-12 mt-2">
            <div className="card-flat overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50">
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-[#8A05BE]" />
                  <h3 className="section-title mb-0">Atividade Recente</h3>
                </div>
                <Link 
                  href={`/${tenant}/dashboard/platform/audit`}
                  className="text-xs font-bold text-[#8A05BE] hover:underline"
                >
                  Ver log completo
                </Link>
              </div>
              
              <div className="p-6">
                <div className="relative border-l-2 border-slate-100 ml-4 space-y-6 py-2">
                  {RECENT_LOGS.map((log) => (
                    <div key={log.id} className="relative pl-6 group">
                      <span className={`absolute left-[-21px] top-1 flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-100 shadow-sm transition-colors group-hover:border-[#8A05BE]/30`}>
                        <log.icon size={16} className={log.color} />
                      </span>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{log.text}</p>
                          <p className="text-xs text-slate-500 mt-1">{log.detail}</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 self-start sm:self-auto">
                          {log.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
