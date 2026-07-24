'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { api } from '@/app/lib/api';
import { 
  Headset, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Filter,
  Building2,
  Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PlatformTicket {
  id: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  updatedAt: string;
  employee?: { name: string };
  company?: { name: string; id: string };
}

export default function PlatformSupportPage() {
  const { user, isDev } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<PlatformTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  useEffect(() => {
    if (user && !isDev) {
      router.push('/dashboard');
      return;
    }
    loadTickets();
  }, [user, isDev, statusFilter, router]);

  const loadTickets = async () => {
    if (!isDev) return;
    
    setLoading(true);
    try {
      const data = await api.platformSupport.list({ status: statusFilter });
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load platform tickets', error);
      // Fake data for DEV visualization if API fails
      setTickets([
        {
          id: 'TKT-1234',
          subject: 'Problema na emissão de NFSe',
          status: 'OPEN',
          priority: 'HIGH',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          employee: { name: 'João Silva' },
          company: { id: 'c1', name: 'Acme Corp' }
        },
        {
          id: 'TKT-1235',
          subject: 'Configuração de relógio de ponto',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          createdAt: new Date(Date.now() - 186400000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          employee: { name: 'Maria Souza' },
          company: { id: 'c2', name: 'Stark Industries' }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 uppercase tracking-wider"><AlertCircle size={12}/> Aberto</span>;
      case 'IN_PROGRESS':
        return <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-700 uppercase tracking-wider"><Clock size={12}/> Em Atendimento</span>;
      case 'RESOLVED':
      case 'CLOSED':
        return <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 uppercase tracking-wider"><CheckCircle2 size={12}/> Resolvido</span>;
      default:
        return <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 uppercase tracking-wider">{status}</span>;
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(search.toLowerCase()) || 
    t.id.toLowerCase().includes(search.toLowerCase()) ||
    (t.company?.name && t.company.name.toLowerCase().includes(search.toLowerCase()))
  );

  const activeCount = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

  if (!isDev) return null;

  return (
    <div className="flex h-full flex-col gap-6 p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
              <Headset size={24} />
            </div>
            Painel DEV de Suporte
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Gerencie tickets de suporte de todas as empresas da plataforma.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 border border-slate-200 shadow-sm">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm font-bold text-slate-700">{activeCount} Ativos</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 border border-slate-200 shadow-sm">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-bold text-slate-700">{resolvedCount} Resolvidos</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between rounded-2xl border border-slate-200/60 bg-white/50 p-4 backdrop-blur-xl">
        <div className="relative w-full md:max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por ID, assunto ou empresa..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Filter size={16} />
            <span>Status:</span>
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-medium outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
          >
            <option value="">Todos os chamados</option>
            <option value="OPEN">Abertos</option>
            <option value="IN_PROGRESS">Em Atendimento</option>
            <option value="RESOLVED">Resolvidos</option>
          </select>
        </div>
      </div>

      <div className="flex-1 rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-purple-600"></div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
            <Headset size={48} className="text-slate-200" />
            <p className="text-sm font-medium">Nenhum chamado pendente.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTickets.map(ticket => (
              <div key={ticket.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-6 transition-colors hover:bg-slate-50 cursor-pointer">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">{ticket.id}</span>
                    {getStatusBadge(ticket.status)}
                    {ticket.priority === 'HIGH' && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                        <AlertCircle size={12} /> Urgente
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                    {ticket.subject}
                  </h3>
                  
                  <div className="flex items-center gap-4 mt-1">
                    {ticket.company && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <Building2 size={14} className="text-slate-400" />
                        <span className="text-slate-700 font-semibold">{ticket.company.name}</span>
                      </div>
                    )}
                    {ticket.employee && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <Users size={14} className="text-slate-400" />
                        {ticket.employee.name}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3">
                  <span className="text-xs font-medium text-slate-400">
                    Criado em {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
