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
import { TicketWizardSlideover } from './_components/ticket-wizard-slideover';

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
      return <span className="chip-warning inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold"><AlertCircle size={14} className="shrink-0" /> Aberto</span>;
    case 'TRIAGE':
    case 'IN_PROGRESS':
      return <span className="chip-brand inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold"><Clock size={14} className="shrink-0" /> Em andamento</span>;
    case 'WAITING_CUSTOMER':
      return <span className="chip inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-accent"><Clock size={14} className="shrink-0" /> Aguardando cliente</span>;
    case 'RESOLVED':
    case 'CLOSED':
      return <span className="chip-success inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold"><CheckCircle2 size={14} className="shrink-0" /> Resolvido / Fechado</span>;
    default:
      return <span className="chip inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold">{status}</span>;
  }
}

function CustomerSupportPage() {
  const { user } = useAuth();
  const role = String(user?.profile || user?.role || '').toUpperCase();
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
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

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
    try {
      await api.support.close(selectedTicket.id);
      toast.success('Chamado encerrado.');
      const updated = await api.support.get(selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      loadTickets();
      setShowCloseConfirm(false);
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
    <div className="w-full px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
      <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="card-v2 relative flex flex-col gap-4 overflow-hidden p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand/10 blur-3xl" />
        <div>
          <h1 className="relative flex items-center gap-3 text-2xl font-black tracking-tight text-fg">
            <div className="flex h-11 w-11 items-center justify-center rounded-v2 bg-brand text-white shadow-v2-md">
              <LifeBuoy size={24} />
            </div>
            Central de Suporte ao Cliente
          </h1>
          <p className="relative mt-1 text-sm font-medium text-fg-mut">
            {isAdminOrRh
              ? 'Gerencie e acompanhe os chamados de suporte da sua empresa.'
              : 'Acompanhe seus chamados de suporte e tire dúvidas direto com nossa equipe.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadTickets}
            className="btn-v2-outline"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-brand' : 'text-fg-sub'} />
            Atualizar
          </button>
          <button onClick={() => setShowModal(true)} className="btn-v2-primary">
            <Plus size={16} /> Abrir novo chamado
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card-v2 p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Chamados abertos</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{stats?.open ?? filteredTickets.filter((ticket) => !['RESOLVED', 'CLOSED'].includes(ticket.status)).length}</p>
        </div>
        <div className="card-v2 p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Resolvidos</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{stats?.resolved ?? filteredTickets.filter((ticket) => ticket.status === 'RESOLVED').length}</p>
        </div>
        <div className="card-v2 p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Fechados</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{stats?.closed ?? filteredTickets.filter((ticket) => ticket.status === 'CLOSED').length}</p>
        </div>
      </div>

      <div className="card-v2 flex flex-col justify-between gap-4 p-4 md:flex-row md:items-center">
        <div className="relative w-full md:max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, assunto, empresa ou responsável..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-v2 h-11 w-full pl-10"
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
            className="input-v2 h-11 min-w-56"
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

      <div className="card-v2 flex-1 overflow-hidden">
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

                  <h3 className="text-base font-bold text-fg transition-colors group-hover:text-brand">
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

                <div className="flex shrink-0 items-center gap-2 text-xs font-bold text-brand md:flex-col md:items-end">
                  <span className="text-fg-sub">Abrir detalhes</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-brand transition-transform group-hover:translate-x-1">
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
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-border bg-bg-sub shadow-v2-xl">
            <header className="border-b border-border bg-fg px-6 py-4 text-white">
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
                  aria-label="Fechar detalhes do chamado"
                  className="flex h-9 w-9 items-center justify-center rounded-v2 bg-white/10 text-white hover:bg-white/15"
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

              <div className="card-v2 mt-4 p-4">
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

              <div className="card-v2 mt-4 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Descrição inicial do problema</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                  {selectedTicket.description || 'Sem descrição informada.'}
                </p>
              </div>

              <div className="card-v2 mt-4 p-4">
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
                        className="flex items-center justify-between gap-2 rounded-v2 border border-border bg-bg-sub p-3 text-left transition-all hover:border-brand/30 hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-slate-800">{attachment.originalName}</span>
                          <span className="mt-1 block text-[10px] text-slate-500">
                            {(Number(attachment.sizeBytes || 0) / 1024).toFixed(1)} KB ·{' '}
                            {attachment.status === 'CLEAN' ? 'Verificado' : attachment.status === 'QUARANTINED' ? 'Em verificação' : 'Bloqueado'}
                          </span>
                        </span>
                        <Download size={14} className="shrink-0 text-brand" />
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
              <div className="space-y-3 border-t border-border bg-bg-elev p-4 md:p-6">
                <label className="block text-xs font-bold text-slate-700">Adicionar nova resposta ou informação complementar</label>
                <textarea
                  rows={3}
                  placeholder="Escreva sua mensagem aqui..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="input-v2 min-h-24 w-full resize-none p-3"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">Sua resposta será enviada diretamente à equipe de suporte.</span>
                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyText.trim()}
                    className="btn-v2-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send size={14} />
                    {sendingReply ? 'Enviando...' : 'Enviar resposta'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCloseConfirm(true)}
                    className="btn-v2-outline"
                  >
                    Encerrar chamado
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="btn-v2-outline border-brand/20 bg-brand/10 text-brand"
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
                    className="btn-v2-outline"
                  >
                    Reabrir chamado
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="btn-v2-primary"
                  >
                    Abrir novo chamado
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      <TicketWizardSlideover
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        creating={creating}
        onCreate={async (data) => {
          setCreating(true);
          try {
            const ticket = await api.support.create({
              category: data.category as any,
              title: data.title.trim(),
              description: data.description.trim(),
              impact: data.priority,
            });
            for (const file of data.files) {
              await api.support.uploadAttachment(ticket.id, file);
            }
            toast.success('Chamado aberto com sucesso.');
            setShowModal(false);
            loadTickets();
          } catch (err: any) {
            toast.error(err?.message || 'Erro ao criar o chamado.');
          } finally {
            setCreating(false);
          }
        }}
      />
      {showCloseConfirm && selectedTicket && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[3px]">
          <div className="card-v2 w-full max-w-md bg-bg-elev p-6 shadow-v2-xl">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600"><CheckCircle2 size={18} /></span>
              <div><h2 className="text-sm font-black text-fg">Encerrar este chamado?</h2><p className="mt-1 text-xs leading-5 text-fg-mut">Você poderá reabrir o chamado depois se precisar enviar novas informações.</p></div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCloseConfirm(false)} className="btn-v2-outline">Continuar atendendo</button>
              <button type="button" onClick={() => void handleCloseTicket()} className="btn-v2-primary bg-emerald-600 hover:bg-emerald-700">Encerrar chamado</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default function SupportPage() {
  const { user } = useAuth();
  const role = String(user?.role || user?.profile || '').toUpperCase();
  return role === 'DEV' ? <PlatformSupportPage /> : <CustomerSupportPage />;
}
