/**
 * Historico completo do chamado, estilo central de atendimento: tudo que aconteceu, em ordem, com quem fez e quando.
 * Junta eventos (abertura, mudanca de status/prioridade, atribuicao, encerramento), respostas e anexos.
 */
export type TimelineKind = 'EVENT' | 'MESSAGE' | 'ATTACHMENT';

export interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  at: Date | string;
  label: string;
  actor: { name: string | null; role?: string | null } | null;
  /** Texto da resposta ou detalhe do evento. */
  detail: string | null;
  /** Mensagens internas so existem para quem pode ve-las. */
  visibility: 'PUBLIC' | 'INTERNAL';
}

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Aberto', TRIAGE: 'Em triagem', IN_PROGRESS: 'Em andamento', WAITING_CUSTOMER: 'Aguardando o cliente',
  WAITING_DEPLOY: 'Aguardando atualização', RESOLVED: 'Resolvido', CLOSED: 'Fechado', REOPENED: 'Reaberto',
};
const PRIORITY_LABEL: Record<string, string> = { LOW: 'Baixa', NORMAL: 'Normal', HIGH: 'Alta', CRITICAL: 'Crítica' };

const statusName = (value: unknown) => STATUS_LABEL[String(value)] ?? String(value ?? '—');
const priorityName = (value: unknown) => PRIORITY_LABEL[String(value)] ?? String(value ?? '—');
const pick = (json: unknown, key: string) => (json && typeof json === 'object' ? (json as Record<string, unknown>)[key] : undefined);

/** Eventos que ja aparecem como mensagem ou anexo: nao duplicar na linha do tempo. */
const COVERED_BY_OTHER_ENTRIES = new Set(['PUBLIC_REPLY', 'INTERNAL_NOTE']);

function describeEvent(event: any): { label: string; detail: string | null } | null {
  const type = String(event.eventType);
  switch (type) {
    case 'TICKET_CREATED': return { label: 'Chamado aberto', detail: null };
    case 'STATUS_CHANGED': {
      const from = pick(event.previousValue, 'status');
      const to = pick(event.newValue, 'status');
      return { label: 'Situação alterada', detail: from ? `${statusName(from)} → ${statusName(to)}` : `Nova situação: ${statusName(to)}` };
    }
    case 'PRIORITY_CHANGED': {
      const from = pick(event.previousValue, 'priority');
      const to = pick(event.newValue, 'priority');
      return { label: 'Prioridade alterada', detail: from ? `${priorityName(from)} → ${priorityName(to)}` : `Nova prioridade: ${priorityName(to)}` };
    }
    case 'ASSIGNED': return { label: 'Responsável definido', detail: null };
    case 'TICKET_RESOLVED': return { label: 'Chamado resolvido', detail: null };
    case 'TICKET_CLOSED': return { label: 'Chamado encerrado', detail: null };
    case 'TICKET_REOPENED': return { label: 'Chamado reaberto', detail: null };
    case 'REFUND_APPROVED': return { label: 'Reembolso aprovado', detail: null };
    case 'REFUND_REJECTED': return { label: 'Reembolso recusado', detail: null };
    case 'PASSWORD_RESET_REQUESTED': return { label: 'Redefinição de senha solicitada', detail: null };
    default: return { label: type.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()), detail: null };
  }
}

export function buildTimeline(ticket: any, options: { includeInternal: boolean }): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const event of ticket.events ?? []) {
    if (COVERED_BY_OTHER_ENTRIES.has(String(event.eventType))) continue;
    const described = describeEvent(event);
    if (!described) continue;
    entries.push({
      id: `event:${event.id}`, kind: 'EVENT', at: event.createdAt, label: described.label, detail: described.detail,
      actor: event.actor ? { name: event.actor.name ?? null, role: event.actor.role ?? null } : null, visibility: 'PUBLIC',
    });
  }

  for (const message of ticket.messages ?? []) {
    const internal = message.visibility === 'INTERNAL';
    if (internal && !options.includeInternal) continue;
    const name = message.author?.name ?? message.authorName ?? null;
    entries.push({
      id: `message:${message.id}`, kind: 'MESSAGE', at: message.createdAt,
      label: internal ? 'Nota interna' : 'Resposta', detail: message.message ?? null,
      actor: { name, role: message.author?.role ?? null }, visibility: internal ? 'INTERNAL' : 'PUBLIC',
    });
  }

  for (const attachment of ticket.attachments ?? []) {
    if (attachment.status === 'REJECTED' || attachment.deletedAt) continue;
    entries.push({
      id: `attachment:${attachment.id}`, kind: 'ATTACHMENT', at: attachment.createdAt, label: 'Anexo enviado',
      detail: attachment.originalName ?? null, actor: null, visibility: 'PUBLIC',
    });
  }

  // Ordem cronologica; no empate o evento vem antes da resposta (a abertura sempre abre a historia).
  const rank: Record<TimelineKind, number> = { EVENT: 0, MESSAGE: 1, ATTACHMENT: 2 };
  return entries.sort((a, b) => +new Date(a.at) - +new Date(b.at) || rank[a.kind] - rank[b.kind]);
}
