'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronsLeft, ChevronsRight, LifeBuoy } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@/app/hooks/use-data';
import { TicketList } from './ticket-list';
import { TicketConversation } from './ticket-conversation';
import { ReplyBox, type ReplyInput } from './reply-box';
import {
  countUnread, isFinalStatus, matchesFilter, matchesSearch, seedSeen, sortTickets,
  type SeenMap, type SupportAttachment, type SupportTicket, type TicketFilter,
} from './support-model';

export const SUPPORT_POLL_MS = 15_000;

export interface WorkspaceApi {
  list: () => Promise<SupportTicket[]>;
  get: (id: string) => Promise<SupportTicket>;
  /** Envia mensagem (e anexos). Rejeitar mantém o texto na caixa. */
  reply: (ticket: SupportTicket, input: ReplyInput) => Promise<void>;
  download: (ticket: SupportTicket, attachment: SupportAttachment) => Promise<unknown>;
}

export interface SupportWorkspaceProps {
  /** Muda a chave de "não lido" e liga as opções da plataforma. */
  mode: 'company' | 'platform';
  userId?: string;
  api: WorkspaceApi;
  filters: Array<{ value: TicketFilter; label: string }>;
  /** Botões do cabeçalho da conversa; recebe `refresh` para recarregar lista e conversa. */
  renderActions?: (ticket: SupportTicket, refresh: () => void) => React.ReactNode;
  refundBlock?: (ticket: SupportTicket, refresh: () => void) => React.ReactNode;
  ratingBlock?: (ticket: SupportTicket, refresh: () => void) => React.ReactNode;
  /** Id para abrir direto (ex.: link com ?ticket=). */
  initialTicketId?: string | null;
  emptyListText?: string;
  onListLoaded?: (tickets: SupportTicket[]) => void;
}

function readSeen(key: string): SeenMap {
  try { return JSON.parse(window.localStorage.getItem(key) || '{}') as SeenMap; } catch { return {}; }
}
function writeSeen(key: string, value: SeenMap) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* armazenamento indisponível */ }
}

/**
 * Área de trabalho do suporte, a MESMA para empresa e plataforma.
 * >=1024px: lista | conversa. 768-1023px: lista recolhível. <768px: lista e, ao tocar, conversa em tela cheia.
 */
export function SupportWorkspace(p: SupportWorkspaceProps) {
  const seenKey = `support-seen:${p.mode}:${p.userId ?? 'anon'}`;
  const [seen, setSeen] = useState<SeenMap>({});
  const [selectedId, setSelectedId] = useState<string | null>(p.initialTicketId ?? null);
  const [listOpen, setListOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const list = useQuery(() => p.api.list(), [], { pollMs: SUPPORT_POLL_MS });
  const detail = useQuery(() => p.api.get(selectedId as string), [selectedId], { enabled: Boolean(selectedId), pollMs: SUPPORT_POLL_MS });
  const tickets = useMemo(() => (Array.isArray(list.data) ? list.data : []), [list.data]);
  const onListLoaded = p.onListLoaded;

  useEffect(() => { setSeen(readSeen(seenKey)); }, [seenKey]);
  useEffect(() => {
    if (!list.data) return;
    onListLoaded?.(tickets);
    setSeen((prev) => {
      let next = seedSeen(tickets, prev);
      const open = tickets.find((t) => t.id === selectedId);
      if (open && next[open.id] !== open.updatedAt) next = { ...next, [open.id]: open.updatedAt };
      if (next === prev || JSON.stringify(next) === JSON.stringify(prev)) return prev;
      writeSeen(seenKey, next);
      return next;
    });
  }, [list.data, tickets, selectedId, seenKey, onListLoaded]);

  const ticket: SupportTicket | undefined = detail.data && detail.data.id === selectedId ? detail.data : undefined;
  useEffect(() => {
    if (!ticket) return;
    setSeen((prev) => {
      const current = prev[ticket.id];
      if (current && new Date(current).getTime() >= new Date(ticket.updatedAt).getTime()) return prev;
      const next = { ...prev, [ticket.id]: ticket.updatedAt };
      writeSeen(seenKey, next);
      return next;
    });
  }, [ticket, seenKey]);

  const visible = useMemo(
    () => sortTickets(tickets.filter((t) => matchesFilter(t, filter) && matchesSearch(t, search)), seen),
    [tickets, filter, search, seen],
  );
  const summary = tickets.find((t) => t.id === selectedId);
  const current = ticket ?? summary;
  const unread = countUnread(tickets, seen, selectedId);

  const refresh = useCallback(() => { list.refetch(); if (selectedId) detail.refetch(); }, [list, detail, selectedId]);

  const select = (t: SupportTicket) => { setSelectedId(t.id); setListOpen(false); };

  const send = async (input: ReplyInput) => {
    if (!current) return;
    try { await p.api.reply(current, input); toast.success(input.internal ? 'Nota interna salva.' : 'Mensagem enviada.'); refresh(); }
    catch (err) { toast.error((err as Error)?.message || 'Não foi possível enviar. Tente novamente.'); throw err; }
  };

  const download = async (a: SupportAttachment) => {
    if (!current) return;
    try { await p.api.download(current, a); } catch (err) { toast.error((err as Error)?.message || 'Não foi possível baixar o anexo.'); }
  };

  const finished = current ? isFinalStatus(current.status) : false;
  const canReplyNow = Boolean(ticket) && (p.mode === 'platform' || !finished);

  return (
    <div className="flex h-[calc(100dvh-13rem)] min-h-[28rem] w-full min-w-0 overflow-hidden rounded-v2-xl border border-border bg-bg-elev md:h-[calc(100dvh-11rem)]">
      <aside
        aria-label="Chamados"
        className={`min-w-0 flex-col border-border md:w-80 md:shrink-0 md:border-r lg:flex lg:w-96 ${selectedId ? 'hidden' : 'flex w-full'} ${listOpen ? 'md:flex' : 'md:hidden'}`}
      >
        {unread > 0 && <p role="status" className="shrink-0 bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand">{unread} {unread === 1 ? 'chamado com novidade' : 'chamados com novidades'}</p>}
        {list.error && !list.data ? (
          <div className="p-4 text-sm" role="alert"><p className="text-rose-700">{list.error}</p><button type="button" onClick={() => list.refetch()} className="mt-2 font-bold text-brand underline">Tentar de novo</button></div>
        ) : !list.data ? (
          <p className="p-6 text-center text-sm text-slate-500" role="status">Carregando chamados...</p>
        ) : (
          <TicketList tickets={visible} total={tickets.length} selectedId={selectedId} seen={seen} onSelect={select}
            search={search} onSearch={setSearch} statusFilter={filter} onStatusFilter={setFilter}
            filterOptions={p.filters} showCompany={p.mode === 'platform'} emptyText={tickets.length ? 'Nenhum chamado com esses filtros.' : p.emptyListText} />
        )}
      </aside>

      <div className={`min-w-0 flex-1 flex-col bg-bg ${selectedId ? 'fixed inset-0 z-40 flex md:static md:z-auto' : 'hidden md:flex'}`}>
        <div className="hidden shrink-0 items-center border-b border-border bg-bg-elev px-2 py-1 md:flex lg:hidden">
          <button type="button" onClick={() => setListOpen((v) => !v)} aria-expanded={listOpen}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-slate-700 hover:bg-bg-sub focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
            {listOpen ? <ChevronsLeft size={16} aria-hidden /> : <ChevronsRight size={16} aria-hidden />}
            {listOpen ? 'Recolher lista' : `Mostrar lista${unread ? ` (${unread} novos)` : ''}`}
          </button>
        </div>
        {!current ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-slate-500">
            <LifeBuoy size={36} aria-hidden className="text-slate-300" />
            <p className="text-sm font-semibold">Selecione um chamado para ver a conversa.</p>
          </div>
        ) : (
          <TicketConversation
            ticket={current} loading={detail.loading && !ticket} error={detail.error}
            currentUserId={p.userId} includeInternal={p.mode === 'platform'}
            onBack={() => { setSelectedId(null); setListOpen(true); }}
            onDownload={download}
            actions={ticket ? p.renderActions?.(ticket, refresh) : undefined}
            refundBlock={ticket ? p.refundBlock?.(ticket, refresh) : undefined}
            ratingBlock={ticket ? p.ratingBlock?.(ticket, refresh) : undefined}
            footer={<ReplyBox key={current.id} sticky onSubmit={send} disabled={!canReplyNow} allowInternal={p.mode === 'platform'}
              disabledReason={!ticket ? 'Carregando o chamado...' : finished ? 'Este chamado está finalizado. Reabra para enviar novas mensagens.' : undefined} />}
          />
        )}
      </div>
    </div>
  );
}
