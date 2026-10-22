'use client';
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, PauseCircle } from 'lucide-react';
import { getSlaInfo, type SlaKind, type SupportTicket } from './support-model';

const KIND_CLASS: Record<SlaKind, string> = {
  none: 'text-slate-500',
  done: 'text-slate-400',
  ok: 'text-slate-600',
  paused: 'text-slate-500',
  risk: 'rounded-md bg-amber-100 px-1.5 py-0.5 text-amber-800',
  breached: 'rounded-md bg-rose-100 px-1.5 py-0.5 text-rose-700',
};

/** Selo de prazo de resposta (SLA). Recalcula a cada minuto sem nova busca. */
export function SlaBadge({ ticket, showWhenDone = false }: { ticket: Pick<SupportTicket, 'status' | 'firstResponseDueAt' | 'firstRespondedAt' | 'resolutionDueAt' | 'slaBreached'>; showWhenDone?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const info = getSlaInfo(ticket, now);
  if ((info.kind === 'done' || info.kind === 'none') && !showWhenDone) return null;
  const Icon = info.kind === 'breached' || info.kind === 'risk' ? AlertTriangle : info.kind === 'paused' ? PauseCircle : Clock;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${KIND_CLASS[info.kind]}`} title={info.dueAt ? `Prazo: ${new Date(info.dueAt).toLocaleString('pt-BR')}` : undefined}>
      <Icon size={12} aria-hidden className="shrink-0" />
      {info.label}
    </span>
  );
}
