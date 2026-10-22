'use client';
import React, { useState } from 'react';
import { CheckCircle2, Copy, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/app/lib/api';
import { useAction } from '@/app/hooks/use-action';
import { useConfirm } from '@/app/components/ui/confirm-provider';
import { PLATFORM_STATUS_OPTIONS, PRIORITY_OPTIONS, isFinalStatus, type SupportTicket } from './support-model';

const BTN = 'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-bg-elev px-3 text-xs font-bold text-fg hover:bg-bg-sub disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand';

/** Ações exclusivas da plataforma: atribuir, prioridade, situação, resolver e marcar como duplicado. */
export function PlatformActions({ ticket, userId, onChanged }: { ticket: SupportTicket; userId?: string; onChanged: () => void }) {
  const confirm = useConfirm();
  const [dupOpen, setDupOpen] = useState(false);
  const [dupOf, setDupOf] = useState('');

  const run = useAction(async (label: string, fn: () => Promise<unknown>) => {
    try { await fn(); toast.success(label); onChanged(); }
    catch (err) { toast.error((err as Error)?.message || 'Não foi possível concluir a ação.'); }
  });

  const markDuplicate = async () => {
    const code = dupOf.trim().toUpperCase();
    if (!code) { toast.error('Informe o código do chamado original.'); return; }
    if (!(await confirm({
      title: 'Marcar como duplicado?', confirmText: 'Marcar duplicado', variant: 'primary',
      description: `O cliente será avisado de que este chamado segue junto com ${code} e este será encerrado como duplicado.`,
    }))) return;
    await run.run('Chamado marcado como duplicado.', async () => {
      const candidates = await api.platformSupport.list(ticket.company?.id ? { companyId: ticket.company.id } : undefined);
      const original = (Array.isArray(candidates) ? candidates : []).find((t: SupportTicket) => String(t.ticketNumber || '').toUpperCase() === code);
      if (!original) throw new Error(`Não encontramos o chamado ${code} nesta empresa.`);
      if (original.id === ticket.id) throw new Error('Um chamado não pode ser duplicado de si mesmo.');
      await api.platformSupport.markDuplicate(ticket.id, original.id);
      setDupOpen(false); setDupOf('');
    });
  };

  const mine = Boolean(userId) && ticket.assignedToUserId === userId;
  const finished = isFinalStatus(ticket.status);
  const currentStatus = ticket.status === 'TRIAGE' || ticket.status === 'OPEN' ? 'NEW' : ticket.status;

  return (
    <details className="group w-full" open={undefined}>
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center rounded-lg border border-border bg-bg-elev px-3 text-xs font-bold text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">Ações do atendimento</summary>
    <div className="mt-2 flex w-full flex-wrap items-end gap-2">
      <button type="button" className={BTN} disabled={run.busy || mine} onClick={() => void run.run('Chamado atribuído a você.', () => api.platformSupport.assign(ticket.id, userId))}>
        <UserCheck size={14} aria-hidden />{mine ? 'Atribuído a você' : 'Atribuir a mim'}
      </button>
      <label className="text-[11px] font-semibold text-slate-500">Prioridade
        <select className="input-v2 mt-0.5 block h-9 w-full min-w-[7rem] py-0 text-xs" value={ticket.priority === 'MEDIUM' ? 'NORMAL' : ticket.priority} disabled={run.busy}
          onChange={(e) => void run.run('Prioridade atualizada.', () => api.platformSupport.updatePriority(ticket.id, e.target.value))}>
          {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label className="text-[11px] font-semibold text-slate-500">Situação
        <select className="input-v2 mt-0.5 block h-9 w-full min-w-[9rem] py-0 text-xs" value={currentStatus} disabled={run.busy}
          onChange={(e) => void run.run('Situação atualizada.', () => api.platformSupport.updateStatus(ticket.id, e.target.value))}>
          {!PLATFORM_STATUS_OPTIONS.some((o) => o.value === currentStatus) && <option value={currentStatus}>{currentStatus}</option>}
          {PLATFORM_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      {!finished && (
        <button type="button" className={BTN} disabled={run.busy} onClick={() => void run.run('Chamado resolvido.', () => api.platformSupport.resolve(ticket.id))}>
          <CheckCircle2 size={14} aria-hidden />Resolver
        </button>
      )}
      {!finished && (
        <button type="button" className={BTN} aria-expanded={dupOpen} onClick={() => setDupOpen((v) => !v)}><Copy size={14} aria-hidden />Duplicado</button>
      )}
      {dupOpen && !finished && (
        <form className="flex w-full flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); void markDuplicate(); }}>
          <label className="min-w-0 flex-1 text-[11px] font-semibold text-slate-500">Código do chamado original
            <input className="input-v2 mt-0.5 block h-9 w-full text-xs" value={dupOf} onChange={(e) => setDupOf(e.target.value)} placeholder="Ex.: SUP-000123" maxLength={40} />
          </label>
          <button type="submit" className={BTN} disabled={run.busy}>Confirmar duplicado</button>
        </form>
      )}
    </div>
    </details>
  );
}
