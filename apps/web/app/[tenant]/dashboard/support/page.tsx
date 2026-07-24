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
import { ErrorState, LoadingState, EmptyState } from '@/app/components/data-states';

interface Ticket {
  id: string;
  ticketNumber?: string;
  title?: string;
  subject?: string;
  status: 'NEW' | 'TRIAGE' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED' | 'OPEN';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' | 'MEDIUM';
  createdAt: string;
  updatedAt: string;
  createdBy?: { name: string };
  affectedUser?: { name: string };
}

export default function SupportPage() {
  const { user } = useAuth();
  const role = String(user?.role || user?.profile || '').toUpperCase();
  const isFuncionario = role === 'FUNCIONARIO';
  const isAdminOrRh = role === 'ADMIN' || role === 'RH';

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('DOUBT');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  const loadTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.support.list(statusFilter);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar os chamados de suporte.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;
    setCreating(true);
    try {
      await api.support.create({
        category: newCategory as any,
        title: newTitle.trim(),
        description: newDescription.trim()
      });
      setShowModal(false);
      setNewTitle('');
      setNewDescription('');
      loadTickets();
    } catch (err: any) {
      alert(err?.message || 'Erro ao criar o chamado.');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
      case 'OPEN':
        return <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200"><AlertCircle size={14}/> Aberto</span>;
      case 'TRIAGE':
      case 'IN_PROGRESS':
        return <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200"><Clock size={14}/> Em Andamento</span>;
      case 'WAITING_CUSTOMER':
        return <span className="flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200"><Clock size={14}/> Aguardando Você</span>;
      case 'RESOLVED':
      case 'CLOSED':
        return <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200"><CheckCircle2 size={14}/> Resolvido</span>;
      default:
        return <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  const filteredTickets = tickets.filter(t => {
    const titleText = t.title || t.subject || '';
    const numberText = t.ticketNumber || t.id || '';
    return titleText.toLowerCase().includes(search.toLowerCase()) || 
           numberText.toLowerCase().includes(search.toLowerCase());
  });

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
        
        {!isFuncionario && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition-all hover:bg-brand-700 hover:scale-105 active:scale-95"
          >
            <Plus size={18} />
            Novo Chamado
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between rounded-2xl border border-slate-200/60 bg-white/50 p-4 backdrop-blur-xl">
        <div className="relative w-full md:max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por código ou assunto..." 
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
            <option value="NEW">Novos</option>
            <option value="IN_PROGRESS">Em Andamento</option>
            <option value="WAITING_CUSTOMER">Aguardando Resposta</option>
            <option value="RESOLVED">Resolvidos</option>
            <option value="CLOSED">Fechados</option>
          </select>
        </div>
      </div>

      <div className="flex-1 rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <LoadingState label="Carregando chamados..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadTickets} />
        ) : filteredTickets.length === 0 ? (
          <EmptyState message="Nenhum chamado de suporte encontrado." />
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTickets.map(ticket => (
              <div key={ticket.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-6 transition-colors hover:bg-slate-50 cursor-pointer">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400">{ticket.ticketNumber || ticket.id}</span>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <h3 className="text-base font-bold text-slate-800 group-hover:text-brand-600 transition-colors">
                    {ticket.title || ticket.subject}
                  </h3>
                  {ticket.createdBy && (
                    <p className="text-sm font-medium text-slate-500">
                      Por: <span className="text-slate-700">{ticket.createdBy.name}</span>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Abrir Novo Chamado</h3>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoria</label>
                <select 
                  value={newCategory} 
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-medium outline-none focus:border-brand-500"
                >
                  <option value="DOUBT">Dúvida no uso</option>
                  <option value="INCIDENT">Problema / Erro no sistema</option>
                  <option value="BILLING">Faturamento / Financeiro</option>
                  <option value="FEATURE_REQUEST">Sugestão de melhoria</option>
                  <option value="SECURITY">Segurança</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assunto / Título</label>
                <input 
                  type="text"
                  required
                  placeholder="Resuma o problema ou dúvida em poucas palavras"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descrição detalhada</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Descreva detalhadamente o que aconteceu..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {creating ? 'Enviando...' : 'Criar Chamado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
