'use client';

import React, { useState } from 'react';
import { Check, Copy, FileText, MessageSquare, Paperclip, Lock, Clock } from 'lucide-react';

export interface TimelineEntry {
  id: string;
  kind: 'EVENT' | 'MESSAGE' | 'ATTACHMENT';
  at: string;
  label: string;
  actor: { name: string | null; role?: string | null } | null;
  detail: string | null;
  visibility: 'PUBLIC' | 'INTERNAL';
}

const when = (value: string) => new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function icon(entry: TimelineEntry) {
  if (entry.visibility === 'INTERNAL') return <Lock size={14} />;
  if (entry.kind === 'MESSAGE') return <MessageSquare size={14} />;
  if (entry.kind === 'ATTACHMENT') return <Paperclip size={14} />;
  return <FileText size={14} />;
}

/** Historico completo do atendimento, do primeiro registro ao ultimo. */
export function TicketTimeline({ entries }: { entries?: TimelineEntry[] }) {
  const list = entries ?? [];
  return (
    <div className="card-v2 mt-4 p-4">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500"><Clock size={14} /> Histórico completo ({list.length})</p>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Nenhum registro ainda.</p>
      ) : (
        <ol className="mt-3 space-y-0" aria-label="Histórico do chamado">
          {list.map((entry, index) => (
            <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
              {index < list.length - 1 && <span aria-hidden="true" className="absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-px bg-slate-200" />}
              <span className={`relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${entry.visibility === 'INTERNAL' ? 'bg-amber-100 text-amber-700' : entry.kind === 'MESSAGE' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>{icon(entry)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">
                  {entry.label}
                  {entry.actor?.name && <span className="font-medium text-slate-500"> · {entry.actor.name}</span>}
                </p>
                <p className="text-[11px] font-medium text-slate-400"><time dateTime={entry.at}>{when(entry.at)}</time></p>
                {entry.detail && <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-slate-700">{entry.detail}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Numero do protocolo com botao de copiar (o cliente passa esse numero ao atendente). */
export function ProtocolCopy({ protocol }: { protocol?: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!protocol) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(protocol); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { /* sem permissao de area de transferencia: o numero continua visivel */ }
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono">{protocol}</span>
      <button type="button" onClick={copy} aria-label={copied ? 'Protocolo copiado' : 'Copiar protocolo'} className="inline-flex h-6 w-6 items-center justify-center rounded text-current opacity-70 hover:opacity-100">
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </span>
  );
}
