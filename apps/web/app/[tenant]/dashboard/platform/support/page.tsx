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
  Users,
  UserCheck,
  Send,
  Lock,
  MessageSquare,
  X,
  ExternalLink,
  Calendar,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SupportMessage {
  id: string;
  ticketId: string;
  authorUserId: string;
  message: string;
  visibility: 'PUBLIC' | 'INTERNAL' | 'INTERNAL_NOTE';
  createdAt: string;
  author?: { name: string; email?: string; role?: string };
}

interface PlatformTicket {
  id: string;
  ticketNumber?: string;
  subject?: string;
  title?: string;
  description?: string;
  status: 'NEW' | 'TRIAGE' | 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'WAITING_DEPLOY' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
  priority: 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
  updatedAt: string;
  firstResponseDueAt?: string;
  resolutionDueAt?: string;
  slaBreached?: boolean;
  assignedToUserId?: string;
  assignedTo?: { id: string; name: string; email?: string };
  createdBy?: { id: string; name: string; email?: string; role?: string };
  employee?: { name: string };
  company?: { name: string; id: string; document?: string };
  messages?: SupportMessage[];
}

type TriageTab = 'all' | 'unassigned' | 'critical' | 'sla_at_risk' | 'reopened' | 'waiting_customer' | 'waiting_deploy';

export default function PlatformSupportPage() {
  const { user, isDev } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<PlatformTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TriageTab>('all');
  
  // Detalhe do chamado selecionado
  const [selectedTicket, setSelectedTicket] = useState<PlatformTicket | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (user && !isDev) {
      router.push('/dashboard');
      return;
    }
    loadTickets();
  }, [user, isDev, router]);

  const loadTickets = async () => {
    if (!isDev) return;
    setLoading(true);
    try {
      const data = await api.platformSupport.list();
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load platform tickets', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTicket = async (ticket: PlatformTicket) => {
    setSelectedTicket(ticket);
    setLoadingDetail(true);
    setReplyText('');
    setIsInternalNote(false);
    try {
      const fullTicket = await api.platformSupport.get(ticket.id);
      if (fullTicket && fullTicket.id) {
        setSelectedTicket(fullTicket);
      }
    } catch (e) {
      console.error('Erro ao carregar detalhes do chamado', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSendingReply(true);
    try {
      if (isInternalNote) {
        await api.platformSupport.internalNote(selectedTicket.id, { message: replyText.trim() });
      } else {
        await api.platformSupport.reply(selectedTicket.id, { message: replyText.trim() });
      }
      setReplyText('');
      const updated = await api.platformSupport.get(selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      loadTickets();
    } catch (err: any) {
      alert(err?.message || 'Erro ao enviar resposta.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleAssignToMe = async () => {
    if (!selectedTicket || !user) return;
    setUpdatingStatus(true);
    try {
      await api.platformSupport.assign(selectedTicket.id, user.id);
      const updated = await api.platformSupport.get(selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      loadTickets();
    } catch (err: any) {
      alert(err?.message || 'Erro ao assumir chamado.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicket) return;
    setUpdatingStatus(true);
    try {
      await api.platformSupport.updateStatus(selectedTicket.id, newStatus);
      const updated = await api.platformSupport.get(selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      loadTickets();
    } catch (err: any) {
      alert(err?.message || 'Erro ao atualizar status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket) return;
    setUpdatingStatus(true);
    try {
      await api.platformSupport.resolve(selectedTicket.id);
      const updated = await api.platformSupport.get(selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      loadTickets();
    } catch (err: any) {
      alert(err?.message || 'Erro ao resolver chamado.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
      case 'OPEN':
        return <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 uppercase tracking-wider"><AlertCircle size={12} className="text-amber-600 shrink-0"/> Aberto</span>;
      case 'TRIAGE':
      case 'IN_PROGRESS':
        return <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-800 uppercase tracking-wider"><Clock size={12} className="text-blue-600 shrink-0"/> Em Atendimento</span>;
      case 'WAITING_CUSTOMER':
        return <span className="flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-bold text-purple-800 uppercase tracking-wider"><Clock size={12} className="text-purple-600 shrink-0"/> Aguardando Cliente</span>;
      case 'WAITING_DEPLOY':
        return <span className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-800 uppercase tracking-wider"><RefreshCw size={12} className="text-indigo-600 shrink-0 animate-spin"/> Aguardando Deploy</span>;
      case 'RESOLVED':
      case 'CLOSED':
        return <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 uppercase tracking-wider"><CheckCircle2 size={12} className="text-emerald-600 shrink-0"/> Resolvido</span>;
      case 'REOPENED':
        return <span className="flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-800 uppercase tracking-wider"><AlertCircle size={12} className="text-rose-600 shrink-0"/> Reaberto</span>;
      default:
        return <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 uppercase tracking-wider">{status}</span>;
    }
  };

  const formatSlaRemaining = (ticket: PlatformTicket) => {
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      return <span className="text-xs font-semibold text-slate-400">SLA Encerrado</span>;
    }
    if (ticket.slaBreached || (ticket.resolutionDueAt && new Date(ticket.resolutionDueAt).getTime() < Date.now())) {
      return <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700"><AlertCircle size={13}/> SLA Vencido</span>;
    }
    if (!ticket.resolutionDueAt) {
      return <span className="text-xs font-medium text-slate-400">SLA Normal</span>;
    }
    const diffMs = new Date(ticket.resolutionDueAt).getTime() - Date.now();
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    if (hours < 2) {
      return <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800"><Clock size={13}/> Vence em {hours}h {minutes}m</span>;
    }
    return <span className="text-xs font-medium text-slate-600">Vence em {hours}h {minutes}m</span>;
  };

  // Filtragem por aba e busca
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      (t.subject || t.title || '').toLowerCase().includes(search.toLowerCase()) || 
      (t.ticketNumber || t.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.company?.name && t.company.name.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;

    switch (activeTab) {
      case 'unassigned': return !t.assignedToUserId && !t.assignedTo;
      case 'critical': return t.priority === 'CRITICAL' || t.priority === 'HIGH';
      case 'sla_at_risk': return t.slaBreached || (t.resolutionDueAt && new Date(t.resolutionDueAt).getTime() < Date.now() + 7200000);
      case 'reopened': return t.status === 'REOPENED' || t.status === 'OPEN';
      case 'waiting_customer': return t.status === 'WAITING_CUSTOMER';
      case 'waiting_deploy': return t.status === 'WAITING_DEPLOY';
      default: return true;
    }
  });

  if (!isDev) return null;

  return (
    <div className="flex h-full flex-col gap-6 p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-500/20">
              <Headset size={24} />
            </div>
            Central de Suporte Operacional (DEV)
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Triagem, controle de SLA e atendimento corporativo a todas as empresas da plataforma.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={loadTickets}
            className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-purple-600' : 'text-slate-400'} />
            Atualizar
          </button>
          <div className="flex items-center gap-2 rounded-xl bg-purple-50 px-3.5 py-2 border border-purple-200/60 shadow-sm">
            <div className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
            <span className="text-xs font-bold text-purple-900">{tickets.filter(t => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length} Pendentes</span>
          </div>
        </div>
      </div>

      {/* Abas de Fila DEV */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 no-scrollbar">
        {[
          { id: 'all', label: 'Todos os chamados', count: tickets.length },
          { id: 'unassigned', label: 'Sem responsável', count: tickets.filter(t => !t.assignedToUserId && !t.assignedTo).length },
          { id: 'critical', label: 'Críticos / Altos', count: tickets.filter(t => t.priority === 'CRITICAL' || t.priority === 'HIGH').length, highlight: 'rose' },
          { id: 'sla_at_risk', label: 'SLA em risco / vencido', count: tickets.filter(t => t.slaBreached || (t.resolutionDueAt && new Date(t.resolutionDueAt).getTime() < Date.now() + 7200000)).length, highlight: 'amber' },
          { id: 'reopened', label: 'Reabertos / Abertos', count: tickets.filter(t => t.status === 'REOPENED' || t.status === 'OPEN').length },
          { id: 'waiting_customer', label: 'Aguardando cliente', count: tickets.filter(t => t.status === 'WAITING_CUSTOMER').length },
          { id: 'waiting_deploy', label: 'Aguardando deploy', count: tickets.filter(t => t.status === 'WAITING_DEPLOY').length },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TriageTab)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                isActive 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                isActive 
                  ? 'bg-white/20 text-white' 
                  : tab.highlight === 'rose' ? 'bg-rose-100 text-rose-700' 
                  : tab.highlight === 'amber' ? 'bg-amber-100 text-amber-700' 
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Barra de Busca */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por número do chamado, assunto ou empresa..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
          />
        </div>
        <span className="text-xs font-medium text-slate-400">
          Exibindo {filteredTickets.length} de {tickets.length} chamados
        </span>
      </div>

      {/* Lista Principal */}
      <div className="flex-1 rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-purple-600"></div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
            <Headset size={48} className="text-slate-200" />
            <p className="text-sm font-medium">Nenhum chamado corresponde aos filtros atuais na fila.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTickets.map(ticket => {
              const lastMsg = ticket.messages && ticket.messages.length > 0 ? ticket.messages[ticket.messages.length - 1] : null;
              return (
                <div 
                  key={ticket.id} 
                  onClick={() => handleSelectTicket(ticket)}
                  className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:p-5 transition-colors hover:bg-slate-50/80 cursor-pointer"
                >
                  <div className="flex flex-col gap-2.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700 font-mono tracking-wider">
                        {ticket.ticketNumber || ticket.id}
                      </span>
                      {getStatusBadge(ticket.status)}
                      {ticket.priority === 'CRITICAL' && (
                        <span className="flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-black text-white uppercase tracking-wider animate-pulse">
                          <ShieldAlert size={12} /> Crítico 24/7
                        </span>
                      )}
                      {ticket.priority === 'HIGH' && (
                        <span className="flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-black text-rose-700 uppercase tracking-wider">
                          <AlertCircle size={12} /> Prioridade Alta
                        </span>
                      )}
                      {formatSlaRemaining(ticket)}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors line-clamp-1">
                      {ticket.subject || ticket.title || 'Chamado sem título'}
                    </h3>
                    
                    {lastMsg && (
                      <p className="text-xs text-slate-500 line-clamp-1 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="font-bold text-slate-700">{lastMsg.author?.name || 'Autor'}:</span> &ldquo;{lastMsg.message}&rdquo;
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 pt-0.5">
                      {ticket.company && (
                        <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                          <Building2 size={14} className="text-purple-600" />
                          <span>{ticket.company.name}</span>
                        </div>
                      )}
                      {ticket.createdBy && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Users size={14} className="text-slate-400" />
                          <span>Solicitado por {ticket.createdBy.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between md:flex-col md:items-end gap-3 shrink-0">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                        <Calendar size={12} /> {new Date(ticket.createdAt).toLocaleDateString('pt-BR')} às {new Date(ticket.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <UserCheck size={14} className={ticket.assignedTo || ticket.assignedToUserId ? 'text-emerald-600' : 'text-slate-300'} />
                        <span className={`text-xs font-bold ${ticket.assignedTo || ticket.assignedToUserId ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                          {ticket.assignedTo?.name || 'Sem responsável'}
                        </span>
                      </div>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TELA DE DETALHE - DRAWER LATERAL / MODAL INTERATIVO */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in slide-in-from-right duration-300">
            
            {/* PAINEL ESQUERDO: MENSAGENS E HISTÓRICO */}
            <div className="flex-1 flex flex-col h-full border-r border-slate-200/80 bg-slate-50/50">
              
              {/* Topo do Detalhe */}
              <div className="flex items-center justify-between p-4 md:p-6 bg-white border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-black text-white font-mono">
                    {selectedTicket.ticketNumber || selectedTicket.id}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                  {formatSlaRemaining(selectedTicket)}
                </div>
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Título e Descrição Inicial */}
              <div className="p-4 md:p-6 bg-white border-b border-slate-100 shadow-sm">
                <h2 className="text-lg font-black text-slate-900">
                  {selectedTicket.subject || selectedTicket.title}
                </h2>
                <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 font-sans">
                  {selectedTicket.description || 'Sem descrição detalhada fornecida.'}
                </p>
              </div>

              {/* Lista de Mensagens */}
              <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
                {loadingDetail ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-purple-600"></div>
                  </div>
                ) : !selectedTicket.messages || selectedTicket.messages.length === 0 ? (
                  <div className="text-center py-8 text-xs font-medium text-slate-400 italic">
                    Nenhuma resposta registrada neste chamado até o momento.
                  </div>
                ) : (
                  selectedTicket.messages.map(msg => {
                    const isNote = msg.visibility === 'INTERNAL' || msg.visibility === 'INTERNAL_NOTE';
                    return (
                      <div 
                        key={msg.id} 
                        className={`p-4 rounded-2xl border transition-all ${
                          isNote 
                            ? 'bg-amber-50/90 border-amber-300/80 shadow-sm ml-6' 
                            : 'bg-white border-slate-200 shadow-sm mr-6'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${isNote ? 'bg-amber-500' : 'bg-purple-600'}`} />
                            <span className="text-xs font-black text-slate-900">
                              {msg.author?.name || 'Equipe Innovation'}
                            </span>
                            {isNote && (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-200/80 px-2 py-0.5 text-[10px] font-black text-amber-900 uppercase tracking-wider">
                                <Lock size={10} /> Nota Interna DEV (Oculta para o cliente)
                              </span>
                            )}
                            {!isNote && (
                              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                                <MessageSquare size={10} /> Resposta Pública
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-slate-400">
                            {new Date(msg.createdAt).toLocaleDateString('pt-BR')} às {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`text-sm leading-relaxed whitespace-pre-line ${isNote ? 'text-amber-950 font-medium' : 'text-slate-700'}`}>
                          {msg.message}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Caixa de Resposta */}
              <div className="p-4 bg-white border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(false)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        !isInternalNote 
                          ? 'bg-purple-600 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <MessageSquare size={14} /> Resposta Pública para o Cliente
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(true)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isInternalNote 
                          ? 'bg-amber-500 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Lock size={14} /> Anotação Interna DEV
                    </button>
                  </div>
                  {isInternalNote && (
                    <span className="text-[11px] font-bold text-amber-700 italic">
                      ⚠️ O cliente não será notificado nem verá esta mensagem.
                    </span>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder={isInternalNote ? "Digite uma anotação técnica interna para a equipe DEV..." : "Digite a resposta oficial que será enviada por e-mail e exibida ao cliente..."}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className={`w-full rounded-xl border p-3 text-sm font-medium outline-none transition-all ${
                      isInternalNote 
                        ? 'border-amber-300 bg-amber-50/50 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-amber-950' 
                        : 'border-slate-200 bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 text-slate-900'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Pressione Enviar para registrar no histórico oficial.
                  </span>
                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyText.trim()}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black text-white shadow-md transition-all disabled:opacity-50 ${
                      isInternalNote 
                        ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' 
                        : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
                    }`}
                  >
                    <Send size={14} />
                    {sendingReply ? 'Enviando...' : isInternalNote ? 'Salvar Nota Interna' : 'Enviar Resposta Pública'}
                  </button>
                </div>
              </div>
            </div>

            {/* PAINEL DIREITO: CONTEXTO, SLA E AÇÕES RÁPIDAS */}
            <div className="w-full md:w-80 bg-white p-6 flex flex-col justify-between overflow-y-auto space-y-6">
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                    Ações de Operação (DEV)
                  </h3>
                  
                  <div className="space-y-2.5">
                    {(!selectedTicket.assignedToUserId && !selectedTicket.assignedTo) ? (
                      <button
                        onClick={handleAssignToMe}
                        disabled={updatingStatus}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-50 border border-purple-200 px-4 py-2.5 text-xs font-black text-purple-700 hover:bg-purple-100 transition-all shadow-sm"
                      >
                        <UserCheck size={15} /> Assumir este chamado
                      </button>
                    ) : (
                      <div className="rounded-xl bg-emerald-50 border border-emerald-200/60 p-3 text-center">
                        <span className="text-[11px] font-bold text-emerald-800 block">Responsável Atribuído:</span>
                        <span className="text-xs font-black text-emerald-950 mt-0.5 block">
                          {selectedTicket.assignedTo?.name || 'Equipe Técnica'}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleUpdateStatus('IN_PROGRESS')}
                        disabled={updatingStatus || selectedTicket.status === 'IN_PROGRESS'}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      >
                        <Clock size={13} /> Em Atendimento
                      </button>
                      <button
                        onClick={() => handleUpdateStatus('WAITING_CUSTOMER')}
                        disabled={updatingStatus || selectedTicket.status === 'WAITING_CUSTOMER'}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      >
                        <Clock size={13} /> Aguard. Cliente
                      </button>
                    </div>

                    <button
                      onClick={handleResolveTicket}
                      disabled={updatingStatus || selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED'}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                    >
                      <CheckCircle2 size={15} /> Concluir e Resolver Chamado
                    </button>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Dados da Empresa */}
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                    <span>Empresa / Cliente</span>
                    {selectedTicket.company?.id && (
                      <Link 
                        href={`/dashboard/platform/companies/${selectedTicket.company.id}`} 
                        className="text-purple-600 hover:text-purple-700 inline-flex items-center gap-0.5 text-[11px] font-bold"
                      >
                        Abrir <ArrowUpRight size={12} />
                      </Link>
                    )}
                  </h3>
                  {selectedTicket.company ? (
                    <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/60 space-y-1">
                      <p className="text-sm font-black text-slate-900">{selectedTicket.company.name}</p>
                      {selectedTicket.company.document && (
                        <p className="text-xs font-mono text-slate-500">{selectedTicket.company.document}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-slate-400 italic">Empresa não vinculada</p>
                  )}
                </div>

                {/* Solicitante */}
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                    Solicitante
                  </h3>
                  {selectedTicket.createdBy ? (
                    <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/60 space-y-1">
                      <p className="text-sm font-bold text-slate-900">{selectedTicket.createdBy.name}</p>
                      {selectedTicket.createdBy.email && (
                        <p className="text-xs text-slate-600">{selectedTicket.createdBy.email}</p>
                      )}
                      {selectedTicket.createdBy.role && (
                        <span className="inline-block mt-1 rounded bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-700 uppercase">
                          Perfil {selectedTicket.createdBy.role}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-slate-400 italic">Usuário não identificado</p>
                  )}
                </div>

                {/* Prazos SLA */}
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                    Prazos SLA Corporativo
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2 rounded bg-slate-50">
                      <span className="text-slate-500 font-medium">1ª Resposta:</span>
                      <span className="font-bold text-slate-700">
                        {selectedTicket.firstResponseDueAt 
                          ? new Date(selectedTicket.firstResponseDueAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
                          : 'Concluído / N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-slate-50">
                      <span className="text-slate-500 font-medium">Resolução Final:</span>
                      <span className="font-bold text-slate-700">
                        {selectedTicket.resolutionDueAt 
                          ? new Date(selectedTicket.resolutionDueAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) 
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 text-center">
                Innovation RH Connect — SLA Monitor
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
