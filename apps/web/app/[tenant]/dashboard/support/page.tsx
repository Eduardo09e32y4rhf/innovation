'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { api } from '@/app/lib/api';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Filter,
  LifeBuoy,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  Upload,
  X,
} from 'lucide-react';
import { ErrorState, EmptyState, LoadingState } from '@/app/components/data-states';
import { toast } from 'sonner';
import PlatformSupportPage from '../platform/support/page';

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
  assignedTo?: { name: string };
  company?: { name: string; document?: string };
  category?: string;
  attachments?: Array<{
    id: string;
    originalName: string;
    sizeBytes: number;
    status: 'QUARANTINED' | 'CLEAN' | 'REJECTED';
  }>;
  messages?: SupportMessage[];
}

const STATUS_FLOW: Array<{ key: Ticket['status']; label: string }> = [
  { key: 'NEW', label: 'Aberto' },
  { key: 'TRIAGE', label: 'Triagem' },
  { key: 'IN_PROGRESS', label: 'Em andamento' },
  { key: 'WAITING_CUSTOMER', label: 'Cliente' },
  { key: 'RESOLVED', label: 'Resolvido' },
  { key: 'CLOSED', label: 'Fechado' },
];

function getStatusBadge(status: string) {
  switch (status) {
    case 'NEW':
    case 'OPEN':
      return <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800"><AlertCircle size={14} className="shrink-0 text-amber-600" /> Aberto</span>;
    case 'TRIAGE':
    case 'IN_PROGRESS':
      return <span className="flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800"><Clock size={14} className="shrink-0 text-sky-600" /> Em andamento</span>;
    case 'WAITING_CUSTOMER':
      return <span className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800"><Clock size={14} className="shrink-0 text-violet-600" /> Aguardando cliente</span>;
    case 'RESOLVED':
    case 'CLOSED':
      return <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"><CheckCircle2 size={14} className="shrink-0 text-emerald-600" /> Resolvido / Fechado</span>;
    default:
      return <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{status}</span>;
  }
}

function CustomerSupportPage() {
  const { user } = useAuth();
  const role = String(user?.role || user?.profile || '').toUpperCase();
  const isFuncionario = role === 'FUNCIONARIO';
  const isAdminOrRh = role === 'ADMIN' || role === 'RH';

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<{ open: number; resolved: number; closed: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('OTHER');
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, summary] = await Promise.all([
        api.support.list(statusFilter),
        api.support.stats().catch(() => null),
      ]);
      setTickets(Array.isArray(data) ? data : []);
      if (summary) setStats(summary);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar os chamados de suporte.');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const loadTicketDetail = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setLoadingDetail(true);
    setReplyText('');
    try {
      const fullTicket = await api.support.get(ticket.id);
      if (fullTicket?.id) setSelectedTicket(fullTicket);
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível carregar os detalhes do chamado.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    setCreating(true);
    try {
      const ticket = await api.support.create({
        category: newCategory as any,
        title: newTitle.trim(),
        description: newDescription.trim(),
      });

      for (const file of newFiles) {
        await api.support.uploadAttachment(ticket.id, file);
      }

      toast.success('Chamado aberto com sucesso.');
      setShowModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewFiles([]);
      loadTickets();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar o chamado.');
    } finally {
      setCreating(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await api.support.reply(selectedTicket.id, { message: replyText.trim() });
      toast.success('Resposta enviada.');
      setReplyText('');
      const updated = await api.support.get(selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      loadTickets();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao responder chamado.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    if (!confirm('Deseja realmente encerrar este chamado?')) return;
    try {
      await api.support.close(selectedTicket.id);
      toast.success('Chamado encerrado.');
      const updated = await api.support.get(selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      loadTickets();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao fechar chamado.');
    }
  };

  const handleReopenTicket = async () => {
    if (!selectedTicket) return;
    try {
      await api.support.reopen(selectedTicket.id);
      toast.success('Chamado reaberto.');
      const updated = await api.support.get(selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      loadTickets();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao reabrir chamado.');
    }
  };

  const handleDownloadAttachment = async (attachmentId: string) => {
    if (!selectedTicket) return;
    try {
      await api.support.downloadAttachment(selectedTicket.id, attachmentId);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao baixar anexo.');
    }
  };

  const filteredTickets = useMemo(() => {
    const q = search.toLowerCase();
    return tickets.filter((ticket) => {
      const searchable = [
        ticket.title,
        ticket.subject,
        ticket.ticketNumber,
        ticket.company?.name,
        ticket.createdBy?.name,
        ticket.assignedTo?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(q);
    });
  }, [tickets, search]);

  const ticketMeta = selectedTicket
    ? [
        { label: 'Quem abriu', value: selectedTicket.createdBy?.name || 'Não informado' },
        { label: 'Empresa', value: selectedTicket.company?.name || 'Não informada' },
        { label: 'Responsável', value: selectedTicket.assignedTo?.name || 'Sem responsável' },
        { label: 'Categoria', value: selectedTicket.category || 'Sem categoria' },
      ]
    : [];

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-6 overflow-x-hidden p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-500/20">
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
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-violet-600' : 'text-slate-400'} />
            Atualizar
          </button>
          {!isFuncionario && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition-all hover:scale-105 hover:bg-violet-700 active:scale-95"
            >
              <Plus size={18} />
              Abrir Novo Chamado
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Chamados abertos</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{stats?.open ?? filteredTickets.filter((ticket) => !['RESOLVED', 'CLOSED'].includes(ticket.status)).length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Resolvidos</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{stats?.resolved ?? filteredTickets.filter((ticket) => ticket.status === 'RESOLVED').length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Fechados</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{stats?.closed ?? filteredTickets.filter((ticket) => ticket.status === 'CLOSED').length}</p>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="relative w-full md:max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, assunto, empresa ou responsável..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
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
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
          >
            <option value="">Todos os chamados</option>
            <option value="NEW">Novos</option>
            <option value="IN_PROGRESS">Em andamento</option>
            <option value="WAITING_CUSTOMER">Aguardando sua resposta</option>
            <option value="RESOLVED">Resolvidos</option>
            <option value="CLOSED">Fechados</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {loading ? (
          <LoadingState label="Carregando seus chamados..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadTickets} />
        ) : filteredTickets.length === 0 ? (
          <EmptyState message="Nenhum chamado de suporte encontrado para sua conta." />
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => void loadTicketDetail(ticket)}
                className="group flex w-full flex-col gap-4 p-4 text-left transition-all hover:bg-slate-50 md:flex-row md:items-center md:justify-between md:p-6"
              >
                <div className="flex flex-col gap-2 max-w-4xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold tracking-wider text-slate-700">
                      {ticket.ticketNumber || ticket.id}
                    </span>
                    {getStatusBadge(ticket.status)}
                    {ticket.priority === 'CRITICAL' && (
                      <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
                        Urgência máxima
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 transition-colors group-hover:text-violet-600">
                    {ticket.title || ticket.subject}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                    <span>
                      Solicitado por: <span className="font-bold text-slate-700">{ticket.createdBy?.name || 'Não informado'}</span>
                    </span>
                    <span>
                      Empresa: <span className="font-bold text-slate-700">{ticket.company?.name || 'Não informada'}</span>
                    </span>
                    <span>
                      Responsável: <span className="font-bold text-slate-700">{ticket.assignedTo?.name || 'Sem responsável'}</span>
                    </span>
                    <span>
                      Atualizado em {new Date(ticket.updatedAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 text-xs font-bold text-violet-600 md:flex-col md:items-end">
                  <span className="text-slate-400">Abrir detalhes</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-50 text-violet-600 transition-transform group-hover:translate-x-1">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedTicket && (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setSelectedTicket(null)} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl">
            <header className="border-b border-slate-100 bg-slate-950 px-6 py-4 text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">
                    {selectedTicket.ticketNumber || selectedTicket.id}
                  </p>
                  <h2 className="text-lg font-black">{selectedTicket.title || selectedTicket.subject}</h2>
                  <p className="mt-1 text-xs text-slate-300">
                    Atualizado em {new Date(selectedTicket.updatedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-wrap items-center gap-3">
                {getStatusBadge(selectedTicket.status)}
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                  {selectedTicket.priority === 'CRITICAL' ? 'Prioridade crítica' : `Prioridade ${selectedTicket.priority.toLowerCase()}`}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {ticketMeta.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{item.label}</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Processo do chamado</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STATUS_FLOW.map((step) => {
                    const active = selectedTicket.status === step.key;
                    const completed =
                      ['RESOLVED', 'CLOSED'].includes(selectedTicket.status) && ['RESOLVED', 'CLOSED'].includes(step.key);
                    return (
                      <span
                        key={step.key}
                        className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                          active || completed
                            ? 'border-violet-200 bg-violet-600 text-white'
                            : 'border-slate-200 bg-white text-slate-500'
                        }`}
                      >
                        {step.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Descrição inicial do problema</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                  {selectedTicket.description || 'Sem descrição informada.'}
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
                  <Paperclip size={14} /> Prints e anexos
                </p>
                {selectedTicket.attachments?.length ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {selectedTicket.attachments.map((attachment) => (
                      <button
                        key={attachment.id}
                        type="button"
                        onClick={() => void handleDownloadAttachment(attachment.id)}
                        disabled={attachment.status === 'REJECTED'}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition-all hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-slate-800">{attachment.originalName}</span>
                          <span className="mt-1 block text-[10px] text-slate-500">
                            {(Number(attachment.sizeBytes || 0) / 1024).toFixed(1)} KB ·{' '}
                            {attachment.status === 'CLEAN' ? 'Verificado' : attachment.status === 'QUARANTINED' ? 'Em verificação' : 'Bloqueado'}
                          </span>
                        </span>
                        <Download size={14} className="shrink-0 text-violet-600" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                    Nenhum print anexado.
                  </p>
                )}
              </div>

              <div className="mt-4 space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Histórico de respostas</h4>
                {loadingDetail ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600" />
                  </div>
                ) : !selectedTicket.messages || selectedTicket.messages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs font-medium text-slate-400 italic">
                    Nenhuma resposta registrada. Nossa equipe técnica analisará seu chamado em breve.
                  </div>
                ) : (
                  selectedTicket.messages
                    .filter((msg) => msg.visibility !== 'INTERNAL' && msg.visibility !== 'INTERNAL_NOTE')
                    .map((msg) => {
                      const isMe = msg.authorUserId === user?.id || (msg.author && msg.author.name === user?.name);
                      return (
                        <div
                          key={msg.id}
                          className={`rounded-2xl border p-4 ${
                            isMe ? 'ml-8 border-violet-200 bg-violet-50/70' : 'mr-8 border-slate-200 bg-white shadow-sm'
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${isMe ? 'bg-violet-600' : 'bg-slate-700'}`} />
                              <span className="text-xs font-black text-slate-900">
                                {msg.author?.name || (isMe ? 'Você' : 'Suporte Técnico')}
                              </span>
                            </div>
                            <span className="text-[11px] font-medium text-slate-400">
                              {new Date(msg.createdAt).toLocaleDateString('pt-BR')} às{' '}
                              {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{msg.message}</p>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {(selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED') ? (
              <div className="border-t border-slate-200 bg-white p-4 md:p-6 space-y-3">
                <label className="block text-xs font-bold text-slate-700">Adicionar nova resposta ou informação complementar</label>
                <textarea
                  rows={3}
                  placeholder="Escreva sua mensagem aqui..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">Sua resposta será enviada diretamente à equipe de suporte.</span>
                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyText.trim()}
                    className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-700 disabled:opacity-50"
                  >
                    <Send size={14} />
                    {sendingReply ? 'Enviando...' : 'Enviar resposta'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseTicket}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                  >
                    Encerrar chamado
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-black text-violet-700 hover:bg-violet-100"
                  >
                    Abrir novo chamado
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-slate-200 bg-slate-100 p-4 text-center text-xs font-bold text-slate-600">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleReopenTicket}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                  >
                    Reabrir chamado
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white hover:bg-violet-700"
                  >
                    Abrir novo chamado
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-in zoom-in-95 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Abrir novo chamado</h3>
                <p className="mt-0.5 text-xs text-slate-500">Nossa equipe responderá o mais rápido possível.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Assunto ou tipo de solicitação</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                >
                  <option value="OTHER">Dúvida sobre uso ou funcionalidade</option>
                  <option value="BUG">Problema técnico ou erro no sistema</option>
                  <option value="BILLING">Faturamento, plano ou financeiro</option>
                  <option value="FEATURE_REQUEST">Sugestão de nova melhoria ou recurso</option>
                  <option value="SECURITY">Acesso, permissões ou segurança</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Título curto</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Erro ao emitir espelho de ponto da filial SP"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Descrição detalhada</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Explique o que aconteceu, o passo a passo para reproduzir o problema e o impacto para a operação."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Prints ou documentos</label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-violet-300 bg-violet-50 p-4 text-xs font-black text-violet-700 hover:bg-violet-100">
                  <Upload size={16} />
                  {newFiles.length ? `${newFiles.length} arquivo(s) selecionado(s)` : 'Selecionar até 5 arquivos'}
                  <input
                    type="file"
                    multiple
                    accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.mp4,.webm"
                    className="sr-only"
                    onChange={(event) => setNewFiles(Array.from(event.target.files ?? []).slice(0, 5))}
                  />
                </label>
                <p className="mt-1.5 text-[10px] text-slate-400">Limite de 20 MB por arquivo. Formatos executáveis são bloqueados.</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl px-5 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-violet-600 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-violet-500/30 transition-all hover:bg-violet-700 disabled:opacity-50"
                >
                  {creating ? 'Registrando...' : 'Criar chamado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  const { user } = useAuth();
  const role = String(user?.role || user?.profile || '').toUpperCase();
  return role === 'DEV' ? <PlatformSupportPage /> : <CustomerSupportPage />;
}
