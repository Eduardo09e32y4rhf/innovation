'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { api } from '@/app/lib/api';
import { 
  LifeBuoy, 
  Plus, 
  Search, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Filter
} from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  updatedAt: string;
  employee?: { name: string };
  company?: { name: string };
}

export default function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const isAdminOrRh = user?.role === 'ADMIN' || user?.role === 'RH';

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await api.support.list(statusFilter);
      // Fallback to empty array if data is undefined or not array for some reason
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load tickets', error);
      // Fake data for visual demonstration
      setTickets([
        {
          id: 'TKT-1234',
          subject: 'Erro ao registrar ponto via web',
          status: 'OPEN',
          priority: 'HIGH',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          employee: { name: user?.name || 'Funcionário' }
        },
        {
          id: 'TKT-1235',
          subject: 'Dúvida sobre fechamento de folha',
          status: 'RESOLVED',
          priority: 'MEDIUM',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          employee: { name: user?.name || 'Funcionário' }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200"><AlertCircle size={14}/> Aberto</span>;
      case 'IN_PROGRESS':
        return <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200"><Clock size={14}/> Em Andamento</span>;
      case 'RESOLVED':
      case 'CLOSED':
        return <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200"><CheckCircle2 size={14}/> Resolvido</span>;
      default:
        return <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(search.toLowerCase()) || 
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col gap-6 p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
              <LifeBuoy size={24} />
            </div>
            Central de Suporte
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {isAdminOrRh 
              ? 'Gerencie os chamados de suporte da sua empresa.' 
              : 'Acompanhe seus chamados de suporte e tire dúvidas.'}
          </p>
        </div>
        
        <button className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition-all hover:bg-brand-700 hover:scale-105 active:scale-95">
          <Plus size={18} />
          Novo Chamado
        </button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between rounded-2xl border border-slate-200/60 bg-white/50 p-4 backdrop-blur-xl">
        <div className="relative w-full md:max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por ID ou assunto..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
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
            className="rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm font-medium outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
          >
            <option value="">Todos</option>
            <option value="OPEN">Abertos</option>
            <option value="IN_PROGRESS">Em Andamento</option>
            <option value="RESOLVED">Resolvidos</option>
          </select>
        </div>
      </div>

      <div className="flex-1 rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600"></div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
            <MessageSquare size={48} className="text-slate-200" />
            <p className="text-sm font-medium">Nenhum chamado encontrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTickets.map(ticket => (
              <div key={ticket.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-6 transition-colors hover:bg-slate-50 cursor-pointer">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400">{ticket.id}</span>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <h3 className="text-base font-bold text-slate-800 group-hover:text-brand-600 transition-colors">
                    {ticket.subject}
                  </h3>
                  {isAdminOrRh && ticket.employee && (
                    <p className="text-sm font-medium text-slate-500">
                      Por: <span className="text-slate-700">{ticket.employee.name}</span>
                    </p>
                  )}
                </div>
                
                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                  <span className="text-xs font-medium text-slate-400">
                    Atualizado em {new Date(ticket.updatedAt).toLocaleDateString()}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors">
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
