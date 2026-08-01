'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/app/contexts/AuthContext';
import { api } from '@/app/lib/api';
import {
  ArrowUpRight,
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Headset,
  Lock,
  MessageSquare,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  UserCheck,
  Users,
  Upload,
  X,
} from 'lucide-react';

interface SupportAttachment {
  id: string;
  originalName: string;
  attachmentType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  declaredMimeType?: string;
  sizeBytes: number;
  status: 'QUARANTINED' | 'CLEAN' | 'REJECTED';
  createdAt: string;
}

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
  attachments?: SupportAttachment[];
}

type TriageTab = 'all' | 'unassigned' | 'critical' | 'sla_at_risk' | 'reopened' | 'waiting_customer' | 'waiting_deploy';

const WORKFLOW_STATUSES = [
  { value: 'NEW', label: 'Novo' },
  { value: 'TRIAGE', label: 'Em triagem' },
  { value: 'IN_PROGRESS', label: 'Em atendimento' },
  { value: 'WAITING_CUSTOMER', label: 'Aguardando cliente' },
  { value: 'WAITING_DEPLOY', label: 'Aguardando deploy' },
  { value: 'RESOLVED', label: 'Resolvido' },
  { value: 'CLOSED', label: 'Fechado' },
  { value: 'REOPENED', label: 'Reaberto' },
] as const;

function formatFileSize(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export default function PlatformSupportPage() {
  const { user, isDev } = useAuth();
  const router = useRouter();

  const [tickets, setTickets] = useState<PlatformTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TriageTab>('all');
  const [selectedTicket, setSelectedTicket] = useState<PlatformTicket | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const loadTickets = useCallback(async () => {
    if (!isDev) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.platformSupport.list();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load platform tickets', err);
      setError((err as any)?.message || 'Nao foi possivel carregar os chamados da plataforma.');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [isDev]);

  useEffect(() => {
    if (user && !isDev) {
      router.push('/dashboard');
      return;
    }
    void loadTickets();
  }, [user, isDev, router, loadTickets]);

  const handleSelectTicket = async (ticket: PlatformTicket) => {
    setSelectedTicket(ticket);
    setLoadingDetail(true);
    setReplyText('');
    setIsInternalNote(false);

    try {
      const fullTicket = await api.platformSupport.get(ticket.id);
      if (fullTicket?.id) {
        setSelectedTicket(fullTicket);
      }
    } catch (err) {
      console.error('Erro ao carregar detalhes do chamado', err);
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
      void loadTickets();
      toast.success(isInternalNote ? 'Nota interna enviada.' : 'Resposta enviada.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar resposta.');
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
      void loadTickets();
      toast.success('Chamado assumido com sucesso.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao assumir chamado.');
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
      void loadTickets();
      toast.success('Status atualizado.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar status.');
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
      void loadTickets();
      toast.success('Chamado resolvido.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao resolver chamado.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUploadAttachments = async (files: FileList | null) => {
    if (!selectedTicket || !files?.length) return;
    setUploadingAttachment(true);
    try {
      for (const file of Array.from(files).slice(0, 5)) {
        await api.support.uploadAttachment(selectedTicket.id, file);
      }
      const updated = await api.platformSupport.get(selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      toast.success('Anexo enviado.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar anexo.');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDownloadAttachment = async (attachment: SupportAttachment) => {
    if (!selectedTicket) return;
    try {
      await api.support.downloadAttachment(selectedTicket.id, attachment.id);
      toast.success('Download iniciado.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao baixar anexo.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
      case 'OPEN':
        return <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-800"><AlertCircle size={12} /> Aberto</span>;
      case 'TRIAGE':
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-800"><Clock size={12} /> Em atendimento</span>;
      case 'WAITING_CUSTOMER':
        return <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-purple-800"><Clock size={12} /> Aguardando cliente</span>;
      case 'WAITING_DEPLOY':
        return <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-800"><RefreshCw size={12} className="animate-spin" /> Aguardando deploy</span>;
      case 'RESOLVED':
      case 'CLOSED':
        return <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800"><CheckCircle2 size={12} /> Resolvido</span>;
      case 'REOPENED':
        return <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-800"><AlertCircle size={12} /> Reaberto</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700">{status}</span>;
    }
  };

  const formatSlaRemaining = (ticket: PlatformTicket) => {
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      return <span className="text-xs font-semibold text-slate-400">SLA encerrado</span>;
    }

    if (ticket.slaBreached || (ticket.resolutionDueAt && new Date(ticket.resolutionDueAt).getTime() < Date.now())) {
      return <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700"><AlertCircle size={13} /> SLA vencido</span>;
    }

    if (!ticket.resolutionDueAt) {
      return <span className="text-xs font-medium text-slate-400">SLA normal</span>;
    }

    const diffMs = new Date(ticket.resolutionDueAt).getTime() - Date.now();
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);

    if (hours < 2) {
      return <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800"><Clock size={13} /> Vence em {hours}h {minutes}m</span>;
    }

    return <span className="text-xs font-medium text-slate-600">Vence em {hours}h {minutes}m</span>;
  };

  const pendingCount = tickets.filter((ticket) => ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED').length;

  const triageTabs = useMemo(
    () => [
      { id: 'all' as const, label: 'Todos', count: tickets.length },
      { id: 'unassigned' as const, label: 'Sem responsável', count: tickets.filter((ticket) => !ticket.assignedToUserId && !ticket.assignedTo).length, accent: 'rose' as const },
      { id: 'critical' as const, label: 'Críticos / altos', count: tickets.filter((ticket) => ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH').length, accent: 'rose' as const },
      { id: 'sla_at_risk' as const, label: 'SLA em risco', count: tickets.filter((ticket) => ticket.slaBreached || (ticket.resolutionDueAt && new Date(ticket.resolutionDueAt).getTime() < Date.now() + 7200000)).length, accent: 'amber' as const },
      { id: 'reopened' as const, label: 'Reabertos', count: tickets.filter((ticket) => ticket.status === 'REOPENED' || ticket.status === 'OPEN').length },
      { id: 'waiting_customer' as const, label: 'Aguardando cliente', count: tickets.filter((ticket) => ticket.status === 'WAITING_CUSTOMER').length },
      { id: 'waiting_deploy' as const, label: 'Aguardando deploy', count: tickets.filter((ticket) => ticket.status === 'WAITING_DEPLOY').length },
    ],
    [tickets]
  );

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      (ticket.subject || ticket.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (ticket.ticketNumber || ticket.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (ticket.company?.name || '').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    switch (activeTab) {
      case 'unassigned':
        return !ticket.assignedToUserId && !ticket.assignedTo;
      case 'critical':
        return ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH';
      case 'sla_at_risk':
        return ticket.slaBreached || (ticket.resolutionDueAt && new Date(ticket.resolutionDueAt).getTime() < Date.now() + 7200000);
      case 'reopened':
        return ticket.status === 'REOPENED' || ticket.status === 'OPEN';
      case 'waiting_customer':
        return ticket.status === 'WAITING_CUSTOMER';
      case 'waiting_deploy':
        return ticket.status === 'WAITING_DEPLOY';
      default:
        return true;
    }
  });

  if (!isDev) return null;

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-6 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-500/20">
              <Headset size={24} />
            </div>
            Central de Suporte Operacional
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Triagem, SLA e atendimento corporativo de todos os chamados da plataforma.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadTickets}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-slate-900/15 transition-all hover:bg-slate-800"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <div className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 shadow-sm">
            <div className="h-2 w-2 rounded-full animate-pulse bg-purple-600" />
            <span className="text-xs font-bold text-purple-900">{pendingCount} Pendentes</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-2 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {triageTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? tab.accent === 'rose'
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                      : tab.accent === 'amber'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                        : 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                    : 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.accent === 'rose'
                        ? 'bg-rose-100 text-rose-700'
                        : tab.accent === 'amber'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xl">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por numero do chamado, assunto ou empresa..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
          />
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-600">
          <Filter size={14} />
          <span>Exibindo {filteredTickets.length} de {tickets.length} chamados</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-purple-600" />
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 p-6 text-slate-400">
            <Headset size={48} className="text-slate-200" />
            <p className="text-sm font-medium text-center">{error}</p>
            <button
              type="button"
              onClick={loadTickets}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800"
            >
              Tentar novamente
            </button>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 p-6 text-slate-400">
            <Headset size={48} className="text-slate-200" />
            <p className="text-sm font-medium text-center">Nenhum chamado corresponde aos filtros atuais na fila.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTickets.map((ticket) => {
              const lastMsg = ticket.messages?.length ? ticket.messages[ticket.messages.length - 1] : null;

              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => void handleSelectTicket(ticket)}
                  className="group flex w-full cursor-pointer flex-col justify-between gap-4 border-b border-slate-100 p-4 text-left transition-all hover:bg-purple-50/40 hover:shadow-sm md:flex-row md:items-center md:p-5"
                >
                  <div className="flex max-w-2xl flex-col gap-2.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-black tracking-wider text-slate-700">
                        {ticket.ticketNumber || ticket.id}
                      </span>
                      {getStatusBadge(ticket.status)}
                      {ticket.priority === 'CRITICAL' && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-white animate-pulse">
                          <ShieldAlert size={12} /> Crítico 24/7
                        </span>
                      )}
                      {ticket.priority === 'HIGH' && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-rose-700">
                          <AlertCircle size={12} /> Prioridade alta
                        </span>
                      )}
                      {formatSlaRemaining(ticket)}
                    </div>

                    <h3 className="line-clamp-1 text-base font-bold text-slate-900 transition-colors group-hover:text-purple-600">
                      {ticket.subject || ticket.title || 'Chamado sem titulo'}
                    </h3>

                    {lastMsg && (
                      <p className="line-clamp-1 rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs italic text-slate-500">
                        <span className="font-bold text-slate-700">{lastMsg.author?.name || 'Autor'}:</span> &ldquo;{lastMsg.message}&rdquo;
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 pt-0.5 text-xs font-medium text-slate-500">
                      {ticket.company && (
                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
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

                  <div className="flex items-center justify-between gap-3 shrink-0 md:flex-col md:items-end">
                    <div className="flex flex-col items-end gap-1">
                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        <Calendar size={12} /> {new Date(ticket.createdAt).toLocaleDateString('pt-BR')} as {new Date(ticket.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="mt-1 flex items-center gap-1.5">
                        <UserCheck size={14} className={ticket.assignedTo || ticket.assignedToUserId ? 'text-emerald-600' : 'text-slate-300'} />
                        <span className={`text-xs font-bold ${ticket.assignedTo || ticket.assignedToUserId ? 'text-slate-800' : 'italic text-slate-400'}`}>
                          {ticket.assignedTo?.name || 'Sem responsável'}
                        </span>
                      </div>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-sm transition-all group-hover:bg-purple-600 group-hover:text-white">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl animate-in slide-in-from-right duration-300 md:flex-row">
            <div className="flex h-full flex-1 flex-col border-r border-slate-200/80 bg-slate-50/50">
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 p-4 text-white md:p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-lg bg-white/10 px-2.5 py-1 font-mono text-xs font-black text-white">
                    {selectedTicket.ticketNumber || selectedTicket.id}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                  {formatSlaRemaining(selectedTicket)}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="rounded-full p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="border-b border-slate-100 bg-white p-4 shadow-sm md:p-6">
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Titulo e descricao</span>
                  <h2 className="text-lg font-black text-slate-900">
                    {selectedTicket.subject || selectedTicket.title}
                  </h2>
                </div>
                <p className="mt-3 whitespace-pre-line rounded-xl border border-slate-200/60 bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-700">
                  {selectedTicket.description || 'Sem descricao detalhada fornecida.'}
                </p>
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600">
                        <Paperclip size={14} /> Prints e anexos
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">PNG, JPG, WEBP, PDF, TXT ou video. Maximo de 20 MB por arquivo.</p>
                    </div>
                    <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-black text-purple-700 hover:bg-purple-100 ${uploadingAttachment ? 'pointer-events-none opacity-60' : ''}`}>
                      <Upload size={14} />
                      {uploadingAttachment ? 'Enviando...' : 'Adicionar arquivos'}
                      <input
                        type="file"
                        multiple
                        accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.mp4,.webm"
                        className="sr-only"
                        onChange={(event) => {
                          void handleUploadAttachments(event.target.files);
                          event.currentTarget.value = '';
                        }}
                      />
                    </label>
                  </div>
                  {selectedTicket.attachments?.length ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {selectedTicket.attachments.map((attachment) => (
                        <button
                          key={attachment.id}
                          type="button"
                          onClick={() => void handleDownloadAttachment(attachment)}
                          disabled={attachment.status === 'REJECTED'}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left hover:border-purple-300 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-bold text-slate-800">{attachment.originalName}</span>
                            <span className="mt-1 block text-[10px] text-slate-500">
                              {formatFileSize(Number(attachment.sizeBytes || 0))} · {attachment.status === 'CLEAN' ? 'Verificado' : attachment.status === 'QUARANTINED' ? 'Em verificacao' : 'Bloqueado'}
                            </span>
                          </span>
                          <Download size={15} className="shrink-0 text-purple-600" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">Nenhum print ou documento anexado.</p>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
                {loadingDetail ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-purple-600" />
                  </div>
                ) : !selectedTicket.messages?.length ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs font-medium italic text-slate-400">
                    Nenhuma resposta registrada neste chamado ate o momento.
                  </div>
                ) : (
                  selectedTicket.messages.map((message) => {
                    const isNote = message.visibility === 'INTERNAL' || message.visibility === 'INTERNAL_NOTE';

                    return (
                      <div
                        key={message.id}
                        className={`rounded-2xl border p-4 transition-all ${
                          isNote ? 'ml-6 border-amber-300/80 bg-amber-50/90 shadow-sm' : 'mr-6 border-slate-200 bg-white shadow-sm'
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${isNote ? 'bg-amber-500' : 'bg-purple-600'}`} />
                            <span className="text-xs font-black text-slate-900">
                              {message.author?.name || 'Equipe Innovation'}
                            </span>
                            {isNote ? (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-200/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-900">
                                <Lock size={10} /> Nota interna
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                                <MessageSquare size={10} /> Resposta publica
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-slate-400">
                            {new Date(message.createdAt).toLocaleDateString('pt-BR')} as {new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`whitespace-pre-line text-sm leading-relaxed ${isNote ? 'font-medium text-amber-950' : 'text-slate-700'}`}>
                          {message.message}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="space-y-3 border-t border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(false)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                        !isInternalNote
                          ? 'border-purple-600 bg-purple-600 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <MessageSquare size={14} /> Resposta publica
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsInternalNote(true)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                        isInternalNote
                          ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Lock size={14} /> Nota interna DEV
                      </span>
                    </button>
                  </div>
                  {isInternalNote && (
                    <span className="text-[11px] font-bold italic text-amber-700">
                      O cliente nao sera notificado.
                    </span>
                  )}
                </div>

                <textarea
                  rows={3}
                  placeholder={
                    isInternalNote
                      ? 'Digite uma anotacao tecnica interna para a equipe DEV...'
                      : 'Digite a resposta oficial que sera enviada por e-mail e exibida ao cliente...'
                  }
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  className={`w-full rounded-xl border p-3 text-sm font-medium outline-none transition-all ${
                    isInternalNote
                      ? 'border-amber-300 bg-amber-50/50 text-amber-950 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10'
                      : 'border-slate-200 bg-white text-slate-900 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10'
                  }`}
                />

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">Pressione Enviar para registrar no historico oficial.</span>
                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyText.trim()}
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black text-white shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                      isInternalNote
                        ? 'bg-amber-600 shadow-amber-600/20 hover:bg-amber-700'
                        : 'bg-purple-600 shadow-purple-600/20 hover:bg-purple-700'
                    }`}
                  >
                    <Send size={14} />
                    {sendingReply ? 'Enviando...' : isInternalNote ? 'Salvar nota interna' : 'Enviar resposta publica'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col justify-between overflow-y-auto border-l border-slate-200 bg-slate-50 p-6 space-y-6 md:w-80">
              <div className="space-y-6">
                <div>
                  <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">Acoes rapidas</h3>
                  <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    {!selectedTicket.assignedToUserId && !selectedTicket.assignedTo ? (
                      <button
                        type="button"
                        onClick={handleAssignToMe}
                        disabled={updatingStatus}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-purple-600/15 transition-all hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <UserCheck size={15} /> Assumir este chamado
                      </button>
                    ) : (
                      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50 p-3 text-center">
                        <span className="block text-[11px] font-bold text-emerald-800">Responsavel atribuido</span>
                        <span className="mt-0.5 block text-xs font-black text-emerald-950">
                          {selectedTicket.assignedTo?.name || 'Equipe tecnica'}
                        </span>
                      </div>
                    )}

                    <label className="block pt-1 text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Etapa atual
                      <select
                        value={selectedTicket.status}
                        onChange={(event) => void handleUpdateStatus(event.target.value)}
                        disabled={updatingStatus}
                        className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 disabled:opacity-60"
                      >
                        {WORKFLOW_STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleResolveTicket}
                        disabled={updatingStatus || selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED'}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} /> Resolver
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleUpdateStatus('REOPENED')}
                        disabled={updatingStatus || !['RESOLVED', 'CLOSED'].includes(selectedTicket.status)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        <RotateCcw size={14} /> Reabrir
                      </button>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-200" />

                <div>
                  <h3 className="mb-3 flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    <span>Empresa / Cliente</span>
                    {selectedTicket.company?.id && (
                      <Link
                        href={`/dashboard/platform/companies/${selectedTicket.company.id}`}
                        className="inline-flex items-center gap-0.5 text-[11px] font-bold text-purple-600 hover:text-purple-700"
                      >
                        Abrir <ArrowUpRight size={12} />
                      </Link>
                    )}
                  </h3>
                  {selectedTicket.company ? (
                    <div className="space-y-1 rounded-xl border border-slate-200/60 bg-white p-3.5">
                      <p className="text-sm font-black text-slate-900">{selectedTicket.company.name}</p>
                      {selectedTicket.company.document && <p className="font-mono text-xs text-slate-500">{selectedTicket.company.document}</p>}
                    </div>
                  ) : (
                    <p className="text-xs font-medium italic text-slate-400">Empresa nao vinculada</p>
                  )}
                </div>

                <div>
                  <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">Solicitante</h3>
                  {selectedTicket.createdBy ? (
                    <div className="space-y-1 rounded-xl border border-slate-200/60 bg-white p-3.5">
                      <p className="text-sm font-bold text-slate-900">{selectedTicket.createdBy.name}</p>
                      {selectedTicket.createdBy.email && <p className="text-xs text-slate-600">{selectedTicket.createdBy.email}</p>}
                      {selectedTicket.createdBy.role && (
                        <span className="mt-1 inline-block rounded bg-slate-200 px-2 py-0.5 text-[10px] font-black uppercase text-slate-700">
                          Perfil {selectedTicket.createdBy.role}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs font-medium italic text-slate-400">Usuario nao identificado</p>
                  )}
                </div>

                <div>
                  <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-500">Prazos SLA</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between rounded bg-slate-100 p-2">
                      <span className="font-medium text-slate-500">1a resposta:</span>
                      <span className="font-bold text-slate-700">
                        {selectedTicket.firstResponseDueAt
                          ? new Date(selectedTicket.firstResponseDueAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                          : 'Concluido / N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between rounded bg-slate-100 p-2">
                      <span className="font-medium text-slate-500">Resolucao final:</span>
                      <span className="font-bold text-slate-700">
                        {selectedTicket.resolutionDueAt
                          ? new Date(selectedTicket.resolutionDueAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400">
                Innovation RH Connect - SLA Monitor
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
