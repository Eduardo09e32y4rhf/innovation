'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, Lock, Paperclip } from 'lucide-react';
import { StatusBadge } from './status-badge';
import { SlaBadge } from './sla-badge';
import {
  buildTimeline, formatFileSize, getPriorityLabel, ticketTitle,
  type SupportAttachment, type SupportTicket, type TimelineItem,
} from './support-model';

export interface TicketConversationProps {
  ticket: SupportTicket;
  loading?: boolean;
  error?: string | null;
  currentUserId?: string;
  /** Plataforma: inclui notas internas na linha do tempo. */
  includeInternal?: boolean;
  /** Celular: mostra o botão voltar (a conversa ocupa a tela toda). */
  onBack?: () => void;
  onDownload: (attachment: SupportAttachment) => void;
  /** Botões de ação do cabeçalho (encerrar, reabrir, barra da plataforma). */
  actions?: React.ReactNode;
  /** Caixa de resposta (fica fixa no rodapé). */
  footer?: React.ReactNode;
  /** Opcionais: só aparecem quando vierem. */
  refundBlock?: React.ReactNode;
  ratingBlock?: React.ReactNode;
}

const dateTime = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function AttachmentChip({ a, onDownload }: { a: SupportAttachment; onDownload: (a: SupportAttachment) => void }) {
  const blocked = a.status === 'REJECTED';
  const pending = a.status === 'QUARANTINED';
  return (
    <button type="button" disabled={blocked || pending} onClick={() => onDownload(a)}
      aria-label={`Baixar anexo ${a.originalName}`}
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-lg border border-border bg-bg-elev px-2 py-1.5 text-left text-xs text-fg hover:bg-bg-sub disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
      <Download size={14} aria-hidden className="shrink-0" />
      <span className="min-w-0 truncate font-semibold">{a.originalName}</span>
      <span className="shrink-0 text-slate-500">{pending ? 'verificando' : blocked ? 'bloqueado' : formatFileSize(a.sizeBytes)}</span>
    </button>
  );
}

function Entry({ item, mine, onDownload }: { item: TimelineItem; mine: boolean; onDownload: (a: SupportAttachment) => void }) {
  if (item.kind === 'event') {
    return (
      <li className="flex justify-center px-2">
        <span className="max-w-full break-words rounded-full bg-bg-sub px-3 py-1 text-center text-[11px] text-slate-500">
          {item.label}{item.actor ? ` por ${item.actor}` : ''} · {dateTime(item.at)}
        </span>
      </li>
    );
  }
  if (item.kind === 'attachment') {
    return (
      <li className="flex justify-center px-2">
        <span className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-slate-500"><Paperclip size={12} aria-hidden />Anexo · {dateTime(item.at)}<AttachmentChip a={item.attachment} onDownload={onDownload} /></span>
      </li>
    );
  }
  const m = item.message;
  const tone = item.internal ? 'border border-amber-300 bg-amber-50 text-amber-950' : mine ? 'bg-brand text-white' : 'border border-border bg-bg-elev text-fg';
  return (
    <li className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <article className={`max-w-[92%] min-w-0 rounded-2xl px-3.5 py-2.5 sm:max-w-[80%] ${tone}`} aria-label={`Mensagem de ${m.author?.name || 'participante'}`}>
        <header className={`mb-1 flex flex-wrap items-center gap-x-2 text-[11px] ${mine && !item.internal ? 'text-white/80' : 'text-slate-500'}`}>
          <strong className="font-bold">{mine ? 'Você' : m.author?.name || 'Atendimento'}</strong>
          {item.internal && <span className="inline-flex items-center gap-1 font-bold text-amber-800"><Lock size={11} aria-hidden />Nota interna</span>}
          <time dateTime={m.createdAt}>{dateTime(m.createdAt)}</time>
        </header>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{m.message}</p>
        {!!m.attachments?.length && <div className="mt-2 flex flex-col items-start gap-1">{m.attachments.map((a) => <AttachmentChip key={a.id} a={a} onDownload={onDownload} />)}</div>}
      </article>
    </li>
  );
}

/** Conversa do chamado: cabeçalho, linha do tempo única (mensagens + eventos) e rodapé com a caixa de resposta. */
export function TicketConversation(p: TicketConversationProps) {
  const { ticket } = p;
  const timeline = useMemo(() => buildTimeline(ticket, { includeInternal: p.includeInternal }), [ticket, p.includeInternal]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef<{ id: string; n: number } | null>(null);
  const [announce, setAnnounce] = useState('');

  useEffect(() => {
    const last = lastCount.current;
    const el = scrollRef.current;
    const messages = timeline.filter((i) => i.kind === 'message');
    if (last && last.id === ticket.id && messages.length > last.n) {
      const latest = messages[messages.length - 1];
      if (latest.kind === 'message' && latest.message.authorUserId !== p.currentUserId) {
        setAnnounce(`Nova mensagem de ${latest.message.author?.name || 'atendimento'}.`);
      }
    }
    lastCount.current = { id: ticket.id, n: messages.length };
    if (el) el.scrollTo({ top: el.scrollHeight });
  }, [timeline, ticket.id, p.currentUserId]);

  const meta: Array<[string, string]> = [
    ['Prioridade', getPriorityLabel(ticket.priority)],
    ['Aberto em', dateTime(ticket.createdAt)],
    ...(ticket.createdBy?.name ? [['Solicitante', ticket.createdBy.name] as [string, string]] : []),
    ...(ticket.company?.name ? [['Empresa', ticket.company.name] as [string, string]] : []),
    ['Responsável', ticket.assignedTo?.name || 'Aguardando atendente'],
  ];

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-bg" aria-label={`Chamado ${ticket.ticketNumber || ''}`}>
      <header className="shrink-0 border-b border-border bg-bg-elev px-3 py-3 sm:px-4">
        <div className="flex items-start gap-2">
          {p.onBack && (
            <button type="button" onClick={p.onBack} aria-label="Voltar para a lista de chamados"
              className="-ml-1 flex h-10 w-10 shrink-0 md:hidden items-center justify-center rounded-lg text-slate-700 hover:bg-bg-sub focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
              <ArrowLeft size={20} aria-hidden />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] font-bold text-slate-500">{ticket.ticketNumber || ticket.id.slice(0, 8)}</p>
            <h2 className="break-words text-base font-extrabold leading-snug text-fg [overflow-wrap:anywhere]">{ticketTitle(ticket)}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1"><StatusBadge status={ticket.status} /><SlaBadge ticket={ticket} /></div>
          </div>
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs lg:grid-cols-3">
          {meta.map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-slate-500">{k}</dt><dd className="truncate font-semibold text-fg" title={v}>{v}</dd></div>)}
        </dl>
        {p.actions && <div className="mt-2 flex flex-wrap items-center gap-2">{p.actions}</div>}
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-4">
        {p.error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{p.error}</p>}
        {ticket.description && (
          <div className="mb-4 rounded-xl border border-dashed border-border bg-bg-elev p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Pedido original</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-fg [overflow-wrap:anywhere]">{ticket.description}</p>
          </div>
        )}
        {p.loading && !timeline.length && <p className="py-6 text-center text-sm text-slate-500" role="status">Carregando conversa...</p>}
        <ol className="flex flex-col gap-3" aria-label="Histórico do chamado">
          {timeline.map((item) => (
            <Entry key={item.id} item={item} onDownload={p.onDownload}
              mine={item.kind === 'message' && !!p.currentUserId && item.message.authorUserId === p.currentUserId} />
          ))}
        </ol>
        {!p.loading && !timeline.length && <p className="py-6 text-center text-sm text-slate-500">Ainda não há mensagens. Nossa equipe responde dentro do prazo indicado acima.</p>}
        {p.refundBlock}
        {p.ratingBlock}
        <div className="sr-only" aria-live="polite" role="status">{announce}</div>
      </div>
      {p.footer}
    </section>
  );
}
