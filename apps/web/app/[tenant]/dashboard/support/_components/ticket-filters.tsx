'use client';

import React, { useState } from 'react';
import { CalendarDays, Hash, X } from 'lucide-react';
import { Button } from '@/app/components/ui';

export interface TicketFilters {
  protocol: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_TICKET_FILTERS: TicketFilters = { protocol: '', dateFrom: '', dateTo: '' };

/** So o que foi preenchido vai para a API (protocolo = so digitos; datas AAAA-MM-DD, dia de Sao Paulo). */
export function ticketFilterParams(filters: TicketFilters) {
  const params: Record<string, string> = {};
  const protocol = filters.protocol.trim();
  if (protocol) params.protocol = protocol;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  return params;
}

export function hasTicketFilters(filters: TicketFilters) {
  return Boolean(filters.protocol.trim() || filters.dateFrom || filters.dateTo);
}

/** Busca por protocolo e filtro por periodo de abertura, como numa central de atendimento. Aplica no botao ou no Enter. */
export function TicketFilterBar({ value, onApply, disabled }: { value: TicketFilters; onApply: (next: TicketFilters) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState<TicketFilters>(value);
  const invalidRange = Boolean(draft.dateFrom && draft.dateTo && draft.dateFrom > draft.dateTo);

  const apply = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (invalidRange) return;
    onApply({ ...draft, protocol: draft.protocol.trim() });
  };
  const clear = () => { setDraft(EMPTY_TICKET_FILTERS); onApply(EMPTY_TICKET_FILTERS); };

  return (
    <form onSubmit={apply} className="card-v2 flex flex-col gap-3 p-4 lg:flex-row lg:items-end" aria-label="Buscar por protocolo e período">
      <div className="w-full lg:max-w-xs">
        <label htmlFor="tf-protocol" className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-500">Número do protocolo</label>
        <div className="relative">
          <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="tf-protocol" inputMode="numeric" autoComplete="off" maxLength={40} placeholder="Ex.: 202610211020121"
            value={draft.protocol} disabled={disabled}
            onChange={(e) => setDraft({ ...draft, protocol: e.target.value })}
            className="input-v2 h-11 w-full pl-10 font-mono"
          />
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div>
          <label htmlFor="tf-from" className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-500">Aberto a partir de</label>
          <div className="relative">
            <CalendarDays size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="tf-from" type="date" value={draft.dateFrom} max={draft.dateTo || undefined} disabled={disabled} onChange={(e) => setDraft({ ...draft, dateFrom: e.target.value })} className="input-v2 h-11 w-full pl-10" />
          </div>
        </div>
        <div>
          <label htmlFor="tf-to" className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-500">Até</label>
          <div className="relative">
            <CalendarDays size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="tf-to" type="date" value={draft.dateTo} min={draft.dateFrom || undefined} disabled={disabled} onChange={(e) => setDraft({ ...draft, dateTo: e.target.value })} className="input-v2 h-11 w-full pl-10" />
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={disabled || invalidRange}>Buscar</Button>
        {(hasTicketFilters(value) || hasTicketFilters(draft)) && (
          <Button type="button" variant="outline" onClick={clear} disabled={disabled}><X size={16} /> Limpar</Button>
        )}
      </div>
      {invalidRange && <p role="alert" className="text-xs font-semibold text-rose-600 lg:basis-full">A data inicial não pode ser depois da data final.</p>}
    </form>
  );
}
