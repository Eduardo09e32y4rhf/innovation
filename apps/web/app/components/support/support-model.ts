/** Modelo e funções puras do suporte (sem React): status, prazo (SLA), não lido, ordenação e linha do tempo. */

export type TicketStatus =
  | 'NEW' | 'TRIAGE' | 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'WAITING_DEPLOY'
  | 'RESOLVED' | 'CLOSED' | 'REOPENED' | 'DUPLICATE' | 'CANCELLED';
export type TicketPriority = 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type StatusTone = 'info' | 'brand' | 'warning' | 'violet' | 'success' | 'neutral' | 'danger';

export interface SupportPerson { id?: string; name?: string; email?: string; role?: string }
export interface SupportAttachment {
  id: string; originalName: string; attachmentType?: string; declaredMimeType?: string;
  sizeBytes: number | string; status?: 'QUARANTINED' | 'CLEAN' | 'REJECTED'; createdAt?: string; messageId?: string | null;
}
export interface SupportMessage {
  id: string; ticketId?: string; authorUserId?: string; message: string;
  visibility?: 'PUBLIC' | 'INTERNAL' | 'INTERNAL_NOTE' | string; createdAt: string;
  author?: SupportPerson; attachments?: SupportAttachment[];
}
export interface SupportEvent { id: string; eventType: string; createdAt: string; actor?: SupportPerson }
export interface SupportTicket {
  id: string; ticketNumber?: string; title?: string; subject?: string; description?: string;
  status: TicketStatus; priority: TicketPriority; category?: string;
  createdAt: string; updatedAt: string;
  firstResponseDueAt?: string | null; firstRespondedAt?: string | null; resolutionDueAt?: string | null;
  resolvedAt?: string | null; slaBreached?: boolean;
  assignedToUserId?: string | null; assignedTo?: SupportPerson | null;
  createdBy?: SupportPerson | null; company?: { id?: string; name?: string } | null;
  createdByUserId?: string | null; closedAt?: string | null; duplicateOfId?: string | null;
  invoiceId?: string | null; refundKind?: 'TOTAL' | 'PARTIAL' | null; refundAmount?: number | string | null;
  refundStatus?: string | null; refundReason?: string | null; refundDecisionById?: string | null; refundDecisionReason?: string | null;
  satisfactionScore?: number | null; satisfactionComment?: string | null; satisfactionAt?: string | null;
  messages?: SupportMessage[]; attachments?: SupportAttachment[]; events?: SupportEvent[];
}

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Recebido', TRIAGE: 'Recebido', OPEN: 'Recebido', IN_PROGRESS: 'Em análise',
  WAITING_CUSTOMER: 'Aguardando você', WAITING_DEPLOY: 'Em correção', RESOLVED: 'Resolvido',
  CLOSED: 'Encerrado', REOPENED: 'Reaberto', DUPLICATE: 'Duplicado', CANCELLED: 'Cancelado',
};
const STATUS_TONE: Record<string, StatusTone> = {
  NEW: 'info', TRIAGE: 'info', OPEN: 'info', IN_PROGRESS: 'brand', WAITING_CUSTOMER: 'warning',
  WAITING_DEPLOY: 'violet', RESOLVED: 'success', CLOSED: 'neutral', REOPENED: 'danger',
  DUPLICATE: 'neutral', CANCELLED: 'neutral',
};
const PRIORITY_LABEL: Record<string, string> = { LOW: 'Baixa', NORMAL: 'Normal', MEDIUM: 'Normal', HIGH: 'Alta', CRITICAL: 'Crítica' };
const PRIORITY_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, NORMAL: 2, MEDIUM: 2, LOW: 1 };
const FINAL_STATUSES = ['RESOLVED', 'CLOSED', 'DUPLICATE', 'CANCELLED'];

export const PLATFORM_STATUS_OPTIONS: Array<{ value: TicketStatus; label: string }> = [
  { value: 'NEW', label: 'Recebido' }, { value: 'IN_PROGRESS', label: 'Em análise' },
  { value: 'WAITING_CUSTOMER', label: 'Aguardando cliente' }, { value: 'WAITING_DEPLOY', label: 'Em correção' },
  { value: 'RESOLVED', label: 'Resolvido' }, { value: 'CLOSED', label: 'Encerrado' }, { value: 'REOPENED', label: 'Reaberto' },
];
export const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Baixa' }, { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'Alta' }, { value: 'CRITICAL', label: 'Crítica' },
] as const;

export function getStatusLabel(status: string): string { return STATUS_LABEL[status] ?? status; }
export function getStatusTone(status: string): StatusTone { return STATUS_TONE[status] ?? 'neutral'; }
export function getPriorityLabel(priority: string): string { return PRIORITY_LABEL[priority] ?? priority; }
export function isFinalStatus(status: string): boolean { return FINAL_STATUSES.includes(status); }
export function ticketTitle(t: Pick<SupportTicket, 'title' | 'subject'>): string { return t.title || t.subject || 'Chamado sem assunto'; }

export type SlaKind = 'none' | 'done' | 'ok' | 'risk' | 'breached' | 'paused';
export interface SlaInfo { kind: SlaKind; label: string; dueAt?: string }
const RISK_WINDOW_MS = 2 * 3600_000;

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 60_000));
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

/** Prazo de resposta: antes da primeira resposta vale firstResponseDueAt; depois, o prazo de solução. */
export function getSlaInfo(t: Pick<SupportTicket, 'status' | 'firstResponseDueAt' | 'firstRespondedAt' | 'resolutionDueAt' | 'slaBreached'>, now = Date.now()): SlaInfo {
  if (isFinalStatus(t.status)) return { kind: 'done', label: 'Prazo encerrado' };
  if (t.status === 'WAITING_CUSTOMER') return { kind: 'paused', label: 'Prazo pausado' };
  const waitingFirst = !t.firstRespondedAt && t.firstResponseDueAt;
  const dueAt = (waitingFirst ? t.firstResponseDueAt : t.resolutionDueAt) || undefined;
  const what = waitingFirst ? 'Resposta' : 'Solução';
  if (!dueAt) return t.slaBreached ? { kind: 'breached', label: 'Prazo vencido' } : { kind: 'none', label: 'Sem prazo definido' };
  const due = new Date(dueAt).getTime();
  if (Number.isNaN(due)) return { kind: 'none', label: 'Sem prazo definido' };
  const diff = due - now;
  if (diff < 0 || t.slaBreached) return { kind: 'breached', label: `${what} atrasada há ${formatDuration(-diff)}`, dueAt };
  if (diff <= RISK_WINDOW_MS) return { kind: 'risk', label: `${what} em ${formatDuration(diff)}`, dueAt };
  return { kind: 'ok', label: `${what} em ${formatDuration(diff)}`, dueAt };
}

export type SeenMap = Record<string, string>;

/** Não lido: o chamado mudou depois da última vez que a pessoa o abriu. Sem registro de leitura, conta como lido. */
export function isUnread(t: Pick<SupportTicket, 'id' | 'updatedAt'>, seen: SeenMap, selectedId?: string | null): boolean {
  if (t.id === selectedId) return false;
  const last = seen[t.id];
  if (!last) return false;
  return new Date(t.updatedAt).getTime() > new Date(last).getTime();
}
export function countUnread(tickets: Array<Pick<SupportTicket, 'id' | 'updatedAt'>>, seen: SeenMap, selectedId?: string | null): number {
  return tickets.filter((t) => isUnread(t, seen, selectedId)).length;
}
/** Primeira carga: registra tudo como visto para não marcar o histórico inteiro como novo. */
export function seedSeen(tickets: Array<Pick<SupportTicket, 'id' | 'updatedAt'>>, seen: SeenMap): SeenMap {
  const next = { ...seen };
  for (const t of tickets) if (!next[t.id]) next[t.id] = t.updatedAt;
  return next;
}

/** Ordem da lista: abertos antes dos finalizados, não lidos primeiro, maior prioridade, mais recente. */
export function sortTickets<T extends Pick<SupportTicket, 'id' | 'status' | 'priority' | 'updatedAt'>>(tickets: T[], seen: SeenMap = {}): T[] {
  return [...tickets].sort((a, b) => {
    const fin = Number(isFinalStatus(a.status)) - Number(isFinalStatus(b.status));
    if (fin) return fin;
    const unread = Number(isUnread(b, seen)) - Number(isUnread(a, seen));
    if (unread) return unread;
    const pr = (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
    if (pr) return pr;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

const EVENT_LABEL: Record<string, string> = {
  TICKET_CREATED: 'Chamado aberto', TICKET_RESOLVED: 'Chamado resolvido', TICKET_CLOSED: 'Chamado encerrado',
  TICKET_REOPENED: 'Chamado reaberto', ASSIGNED: 'Chamado atribuído a um atendente',
  PRIORITY_CHANGED: 'Prioridade alterada', STATUS_CHANGED: 'Situação alterada',
  TICKET_DUPLICATE: 'Marcado como duplicado', TICKET_RATED: 'Atendimento avaliado',
  REFUND_REQUESTED: 'Reembolso solicitado', REFUND_FIRST_APPROVAL: 'Reembolso aprovado, aguardando 2ª aprovação',
  REFUND_SECOND_APPROVED: 'Reembolso aprovado', REFUND_APPROVED: 'Reembolso aprovado', REFUND_REJECTED: 'Reembolso recusado',
  REFUND_PROCESSING: 'Reembolso em processamento', REFUND_CONFIRMED: 'Reembolso confirmado', REFUND_FAILED: 'Reembolso não concluído',
  PASSWORD_RESET_REQUESTED: 'Redefinição de senha solicitada',
};
export function getEventLabel(eventType: string): string { return EVENT_LABEL[eventType] ?? 'Atualização do chamado'; }

export type TimelineItem =
  | { kind: 'message'; id: string; at: string; message: SupportMessage; internal: boolean }
  | { kind: 'event'; id: string; at: string; label: string; actor?: string }
  | { kind: 'attachment'; id: string; at: string; attachment: SupportAttachment };

/** Linha do tempo única: mensagens, eventos e anexos soltos, em ordem cronológica. Notas internas só se pedido. */
export function buildTimeline(t: SupportTicket, opts: { includeInternal?: boolean } = {}): TimelineItem[] {
  const items: TimelineItem[] = [];
  const inMessage = new Set<string>();
  for (const m of t.messages ?? []) {
    const internal = m.visibility === 'INTERNAL' || m.visibility === 'INTERNAL_NOTE';
    if (internal && !opts.includeInternal) continue;
    (m.attachments ?? []).forEach((a) => inMessage.add(a.id));
    items.push({ kind: 'message', id: `m-${m.id}`, at: m.createdAt, message: m, internal });
  }
  for (const e of t.events ?? []) {
    if (e.eventType === 'PUBLIC_REPLY' || e.eventType === 'INTERNAL_NOTE') continue; // já aparecem como mensagem
    items.push({ kind: 'event', id: `e-${e.id}`, at: e.createdAt, label: getEventLabel(e.eventType), actor: e.actor?.name });
  }
  for (const a of t.attachments ?? []) {
    if (inMessage.has(a.id) || !a.createdAt || a.status === 'REJECTED') continue;
    items.push({ kind: 'attachment', id: `a-${a.id}`, at: a.createdAt, attachment: a });
  }
  return items.sort((x, y) => new Date(x.at).getTime() - new Date(y.at).getTime() || x.id.localeCompare(y.id));
}

/** Quantas mensagens públicas há — usado para anunciar (aria-live) mensagem nova. */
export function countMessages(t?: SupportTicket | null): number { return t?.messages?.length ?? 0; }

export function formatFileSize(value: number | string): string {
  const n = Number(value) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export type TicketFilter = 'all' | 'open' | 'unassigned' | 'critical' | 'sla_risk' | 'reopened' | 'waiting_customer' | 'waiting_deploy' | 'final';
export const COMPANY_FILTERS: Array<{ value: TicketFilter; label: string }> = [
  { value: 'all', label: 'Todos os chamados' }, { value: 'open', label: 'Em andamento' },
  { value: 'waiting_customer', label: 'Aguardando você' }, { value: 'final', label: 'Resolvidos e encerrados' },
];
export const PLATFORM_FILTERS: Array<{ value: TicketFilter; label: string }> = [
  { value: 'all', label: 'Todos' }, { value: 'open', label: 'Em andamento' }, { value: 'unassigned', label: 'Sem responsável' },
  { value: 'critical', label: 'Críticos e altos' }, { value: 'sla_risk', label: 'Prazo em risco' }, { value: 'reopened', label: 'Reabertos' },
  { value: 'waiting_customer', label: 'Aguardando cliente' }, { value: 'waiting_deploy', label: 'Em correção' }, { value: 'final', label: 'Finalizados' },
];

export function matchesFilter(t: SupportTicket, filter: string, now = Date.now()): boolean {
  switch (filter) {
    case 'open': return !isFinalStatus(t.status);
    case 'final': return isFinalStatus(t.status);
    case 'unassigned': return !isFinalStatus(t.status) && !t.assignedToUserId && !t.assignedTo;
    case 'critical': return !isFinalStatus(t.status) && (t.priority === 'CRITICAL' || t.priority === 'HIGH');
    case 'sla_risk': { const k = getSlaInfo(t, now).kind; return k === 'risk' || k === 'breached'; }
    case 'reopened': return t.status === 'REOPENED';
    case 'waiting_customer': return t.status === 'WAITING_CUSTOMER';
    case 'waiting_deploy': return t.status === 'WAITING_DEPLOY';
    default: return true;
  }
}

export function matchesSearch(t: SupportTicket, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [t.ticketNumber, t.title, t.subject, t.company?.name, t.createdBy?.name].filter(Boolean).join(' ').toLowerCase().includes(q);
}
