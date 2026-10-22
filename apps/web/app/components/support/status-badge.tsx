'use client';
import React from 'react';
import { AlertCircle, CheckCircle2, Clock, Copy, Inbox, RotateCcw, Wrench, XCircle } from 'lucide-react';
import { getStatusLabel, getStatusTone, type StatusTone } from './support-model';

const TONE_CLASS: Record<StatusTone, string> = {
  info: 'bg-sky-100 text-sky-800 border-sky-200',
  brand: 'bg-blue-100 text-blue-800 border-blue-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  violet: 'bg-violet-100 text-violet-800 border-violet-200',
  success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  danger: 'bg-rose-100 text-rose-800 border-rose-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

function StatusIcon({ status }: { status: string }) {
  const props = { size: 12, 'aria-hidden': true, className: 'shrink-0' } as const;
  switch (status) {
    case 'IN_PROGRESS': return <Clock {...props} />;
    case 'WAITING_CUSTOMER': return <AlertCircle {...props} />;
    case 'WAITING_DEPLOY': return <Wrench {...props} />;
    case 'RESOLVED': return <CheckCircle2 {...props} />;
    case 'CLOSED': return <CheckCircle2 {...props} />;
    case 'REOPENED': return <RotateCcw {...props} />;
    case 'DUPLICATE': return <Copy {...props} />;
    case 'CANCELLED': return <XCircle {...props} />;
    default: return <Inbox {...props} />;
  }
}

/** Selo de situação do chamado, em linguagem do cliente. */
export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold ${TONE_CLASS[getStatusTone(status)]} ${className}`}>
      <StatusIcon status={status} />
      {getStatusLabel(status)}
    </span>
  );
}
