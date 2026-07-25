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
  Filter,
  X,
  Send,
  RefreshCw,
  Lock
} from 'lucide-react';
import { ErrorState, LoadingState, EmptyState } from '@/app/components/data-states';

interface SupportMessage {
  id: string;
  ticketId: string;
  authorUserId: string;
  message: string;
  visibility?: string;
  createdAt: string;
  author?: { name: string; email?: string };
}

interface Ticket {
  id: string;
  ticketNumber?: string;
  title?: string;
  subject?: string;
  description?: string;
  status: 'NEW' | 'TRIAGE' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED' | 'OPEN' | 'REOPENED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' | 'MEDIUM';
  createdAt: string;
  updatedAt: string;
  createdBy?: { name: string };
  affectedUser?: { name: string };
  messages?: SupportMessage[];
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
  
  // Modal criação
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('OTHER');
  const [creating, setCreating] = useState(false);

  // Drawer de Detalhes e Conversa
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

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
      // Dados demonstrativos se offline / sem backend rodando
      setTickets([
        {
          id: 'tkt-c1',
          ticketNumber: 'SUP-2026-0001',
          title: 'Dúvida na configuração da escala de 12x36',
          subject: 'Dúvida na configuração da escala de 12x36',
          description: 'Gostaríamos de saber como configurar o adicional noturno automático na escala 12x36.',
          status: 'WAITING_CUSTOMER',
          priority: 'NORMAL',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          createdBy: { name: user?.name || 'Você' },
          messages: [
            {
              id: 'm-c1',
              ticketId: 'tkt-c1',
              authorUserId: 'dev-1',
              message: 'Olá! Para a escala 12x36, basta acessar Configurações -> Escalas e marcar a caixa "Considerar prorrogação noturna após às 05h". Ficou alguma dúvida?',
              visibility: 'PUBLIC',
              createdAt: new Date(Date.now() - 3600000).toISOString(),
              author: { name: 'Suporte Técnico Innovation' }
            }
          ]
        },
        {
          id: 'tkt-c2',
          ticketNumber: 'SUP-2026-0002',
          title: 'Solicitação de novo layout no espelho de ponto',
          subject: 'Solicitação de novo layout no espelho de ponto',
          description: 'Gostaríamos que o logotipo da empresa saísse centralizado no relatório de espelho em PDF.',
          status: 'IN_PROGRESS',
          priority: 'LOW',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          updatedAt: new Date(Date.now() - 43200000).toISOString(),
          createdBy: { name: user?.name || 'Você' }
        }
      ]);
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

  const handleSelectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setLoadingDetail(true);
    setReplyText('');
    try {
      const fullTicket = await api.support.get(ticket.id);
      if (fullTicket && fullTicket.id) {
        setSelectedTicket(fullTicket);
      }
    } catch (e) {
      console.error('Erro ao carregar conversa do chamado', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await api.support.reply(selectedTicket.id, { message: replyText.trim() });
      setReplyText('');
      const updated = await api.support.get(selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      loadTickets();
    } catch (err: any) {
      alert(err?.message || 'Erro ao responder chamado.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    if (!confirm('Deseja realmente encerrar este chamado?')) return;
    try {
      await api.support.close(selectedTicket.id);
      const updated = await api.support.get(selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      loadTickets();
    } catch (err: any) {
      alert(err?.message || 'Erro ao fechar chamado.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
      case 'OPEN':
        return <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200"><AlertCircle size={14} className="text-amber-600 shrink-0"/> Aberto</span>;
      case 'TRIAGE':
      case 'IN_PROGRESS':
        return <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 border border-blue-200"><Clock size={14} className="text-blue-600 shrink-0"/> Em Andamento</span>;
      case 'WAITING_CUSTOMER':
        return <span className="flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-800 border border-purple-200 animate-pulse"><Clock size={14} className="text-purple-600 shrink-0"/> Aguardando Sua Resposta</span>;
      case 'RESOLVED':
      case 'CLOSED':
        return <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200"><CheckCircle2 size={14} className="text-emerald-600 shrink-0"/> Resolvido / Fechado</span>;
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
      
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-500/20">
              <LifeBuoy size={24} />
            </div>
            Central de Suporte ao Cliente
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {isAdminOrRh 
              ? 'Gerencie e acompanhe os chamados de suporte da sua empresa.' 
              : 'Acompanhe seus chamados de suporte e tire dúvidas direto com nossa equipe.'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={loadTickets}
            className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-brand-600' : 'text-slate-400'} />
            Atualizar
          </button>
          {!isFuncionario && (
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition-all hover:bg-brand-700 hover:scale-105 active:scale-95"
            >
              <Plus size={18} />
              Abrir Novo Chamado
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
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
            <option value="">Todos os chamados</option>
            <option value="NEW">Novos</option>
            <option value="IN_PROGRESS">Em Andamento</option>
            <option value="WAITING_CUSTOMER">Aguardando Sua Resposta</option>
            <option value="RESOLVED">Resolvidos</option>
            <option value="CLOSED">Fechados</option>
          </select>
        </div>
      </div>

      {/* Lista de Chamados */}
      <div className="flex-1 rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <LoadingState label="Carregando seus chamados..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadTickets} />
        ) : filteredTickets.length === 0 ? (
          <EmptyState message="Nenhum chamado de suporte encontrado para sua conta." />
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTickets.map(ticket => (
              <div 
                key={ticket.id} 
                onClick={() => handleSelectTicket(ticket)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-6 transition-all hover:bg-slate-50 cursor-pointer"
              >
                <div className="flex flex-col gap-2 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-700 tracking-wider">
                      {ticket.ticketNumber || ticket.id}
                    </span>
                    {getStatusBadge(ticket.status)}
                    {ticket.priority === 'CRITICAL' && (
                      <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 uppercase tracking-wider">
                        Urgência Máxima
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                    {ticket.title || ticket.subject}
                  </h3>

                  {ticket.createdBy && (
                    <p className="text-xs font-medium text-slate-500">
                      Solicitado por: <span className="font-bold text-slate-700">{ticket.createdBy.name}</span> em {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0">
                  <span className="text-xs font-medium text-slate-400">
                    Última atividade: {new Date(ticket.updatedAt).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-bold text-brand-600 group-hover:translate-x-1 transition-all">
                    <span>Ver conversa</span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DRAWER DO CHAMADO SELECIONADO */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            
            {/* Topo do Drawer */}
            <div className="flex items-center justify-between p-4 md:p-6 bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-white/20 px-2.5 py-1 text-xs font-mono font-black text-white">
                  {selectedTicket.ticketNumber || selectedTicket.id}
                </span>
                <span className="text-xs font-bold text-slate-200">
                  Criado em {new Date(selectedTicket.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sub-cabeçalho */}
            <div className="p-4 md:p-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {selectedTicket.title || selectedTicket.subject}
                </h2>
                <div className="mt-2 flex items-center gap-2">
                  {getStatusBadge(selectedTicket.status)}
                </div>
              </div>

              {(selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED') && (
                <button
                  type="button"
                  onClick={handleCloseTicket}
                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm"
                >
                  Encerrar Chamado
                </button>
              )}
            </div>

            {/* Descrição e Histórico de Mensagens */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
              <div className="p-4 rounded-2xl bg-slate-100/80 border border-slate-200/60 mb-6">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                  Descrição Inicial do Problema
                </span>
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line font-sans">
                  {selectedTicket.description || 'Sem descrição detalhada fornecida no momento da abertura.'}
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Histórico de Respostas
                </h4>

                {loadingDetail ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600"></div>
                  </div>
                ) : !selectedTicket.messages || selectedTicket.messages.length === 0 ? (
                  <div className="text-center py-8 text-xs font-medium text-slate-400 italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    Nenhuma resposta registrada. Nossa equipe técnica analisará seu chamado em breve.
                  </div>
                ) : (
                  selectedTicket.messages
                    .filter(msg => msg.visibility !== 'INTERNAL' && msg.visibility !== 'INTERNAL_NOTE')
                    .map(msg => {
                      const isMe = msg.authorUserId === user?.id || (msg.author && msg.author.name === user?.name);
                      return (
                        <div 
                          key={msg.id} 
                          className={`p-4 rounded-2xl border transition-all ${
                            isMe 
                              ? 'bg-brand-50/70 border-brand-200/80 ml-8' 
                              : 'bg-white border-slate-200 shadow-sm mr-8'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${isMe ? 'bg-brand-600' : 'bg-slate-700'}`} />
                              <span className="text-xs font-black text-slate-900">
                                {msg.author?.name || (isMe ? 'Você' : 'Suporte Técnico Innovation')}
                              </span>
                            </div>
                            <span className="text-[11px] font-medium text-slate-400">
                              {new Date(msg.createdAt).toLocaleDateString('pt-BR')} às {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                            {msg.message}
                          </p>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Caixa de Envio de Nova Mensagem */}
            {(selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED') ? (
              <div className="p-4 md:p-6 bg-white border-t border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Adicionar nova resposta ou informação complementar
                </label>
                <textarea
                  rows={3}
                  placeholder="Escreva sua mensagem aqui..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Sua resposta será enviada diretamente à equipe de suporte.
                  </span>
                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyText.trim()}
                    className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-700 disabled:opacity-50"
                  >
                    <Send size={14} />
                    {sendingReply ? 'Enviando...' : 'Enviar Resposta'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-100 border-t border-slate-200 text-center text-xs font-bold text-slate-600">
                Este chamado está resolvido ou encerrado. Caso necessite de ajuda, por favor abra um novo chamado.
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Abrir Novo Chamado</h3>
                <p className="text-xs text-slate-500 mt-0.5">Nossa equipe responderá o mais rápido possível.</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Assunto ou Tipo de Solicitação</label>
                <select 
                  value={newCategory} 
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 bg-white"
                >
                  <option value="OTHER">Dúvida sobre uso ou funcionalidade</option>
                  <option value="BUG">Problema técnico ou erro no sistema</option>
                  <option value="BILLING">Faturamento, plano ou financeiro</option>
                  <option value="FEATURE_REQUEST">Sugestão de nova melhoria ou recurso</option>
                  <option value="SECURITY">Acesso, permissões ou segurança</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Título Curto</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Erro ao emitir espelho de ponto da filial SP"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Descrição Detalhada</label>
                <textarea 
                  required
                  rows={5}
                  placeholder="Explique o que aconteceu, passo a passo para reproduzir o problema, ou a dúvida específica..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="rounded-xl bg-brand-600 px-6 py-2.5 text-xs font-black text-white hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all disabled:opacity-50"
                >
                  {creating ? 'Registrando...' : 'Criar Chamado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
