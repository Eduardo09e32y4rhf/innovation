'use client';
import React from 'react';
import { Search } from 'lucide-react';
import { StatusBadge } from './status-badge';
import { SlaBadge } from './sla-badge';
import { getPriorityLabel, isUnread, ticketTitle, type SeenMap, type SupportTicket } from './support-model';

export interface TicketListProps {
  tickets: SupportTicket[];
  selectedId: string | null;
  seen: SeenMap;
  onSelect: (ticket: SupportTicket) => void;
  search: string;
  onSearch: (value: string) => void;
  statusFilter: string;
  onStatusFilter: (value: string) => void;
  filterOptions: Array<{ value: string; label: string }>;
  showCompany?: boolean;
  emptyText?: string;
  total?: number;
}

function when(iso: string) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** Lista de chamados (busca, filtro e itens). Igual para a empresa e para a plataforma. */
export function TicketList(p: TicketListProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-2 border-b border-border p-3">
        <div className="relative">
          <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" aria-label="Buscar chamados" placeholder="Buscar por código ou assunto"
            value={p.search} onChange={(e) => p.onSearch(e.target.value)} className="input-v2 h-10 w-full pl-9 text-sm" />
        </div>
        <select aria-label="Filtrar por situação" value={p.statusFilter} onChange={(e) => p.onStatusFilter(e.target.value)} className="input-v2 h-10 w-full text-sm">
          {p.filterOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <p className="text-xs text-slate-500" role="status">{p.tickets.length}{p.total !== undefined && p.total !== p.tickets.length ? ` de ${p.total}` : ''} chamado(s)</p>
      </div>
      {p.tickets.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500">{p.emptyText ?? 'Nenhum chamado encontrado.'}</p>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto overflow-x-hidden" aria-label="Lista de chamados">
          {p.tickets.map((t) => {
            const unread = isUnread(t, p.seen, p.selectedId);
            const active = t.id === p.selectedId;
            return (
              <li key={t.id}>
                <button type="button" onClick={() => p.onSelect(t)} aria-current={active ? 'true' : undefined}
                  className={`flex w-full min-w-0 flex-col gap-1.5 px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${active ? 'bg-brand/10' : 'hover:bg-bg-sub'}`}>
                  <span className="flex min-w-0 items-center gap-2">
                    {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden />}
                    <span className="shrink-0 font-mono text-[11px] font-bold text-slate-500">{t.ticketNumber || t.id.slice(0, 8)}</span>
                    {unread && <span className="sr-only">Com novidades.</span>}
                    <span className="ml-auto shrink-0 text-[11px] text-slate-400">{when(t.updatedAt)}</span>
                  </span>
                  <span className={`line-clamp-2 break-words text-sm text-fg ${unread ? 'font-extrabold' : 'font-semibold'}`}>{ticketTitle(t)}</span>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <StatusBadge status={t.status} />
                    {(t.priority === 'CRITICAL' || t.priority === 'HIGH') && (
                      <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700">{getPriorityLabel(t.priority)}</span>
                    )}
                    <SlaBadge ticket={t} />
                  </span>
                  {p.showCompany && <span className="truncate text-[11px] text-slate-500">{t.company?.name || 'Sem empresa'}{t.assignedTo?.name ? ` · ${t.assignedTo.name}` : ' · Sem responsável'}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
