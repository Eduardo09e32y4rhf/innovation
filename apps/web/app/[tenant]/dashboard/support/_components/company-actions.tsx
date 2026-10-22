'use client';
import React from 'react';
import { RotateCcw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/app/lib/api';
import { useAction } from '@/app/hooks/use-action';
import { useConfirm } from '@/app/components/ui/confirm-provider';
import { isFinalStatus, type SupportTicket } from '@/app/components/support/support-model';

const BTN = 'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-bg-elev px-3 text-xs font-bold text-fg hover:bg-bg-sub disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand';

/** Encerrar (com confirmação) ou reabrir o chamado, do ponto de vista da empresa. */
export function CompanyActions({ ticket, onChanged }: { ticket: SupportTicket; onChanged: () => void }) {
  const confirm = useConfirm();
  const action = useAction(async (kind: 'close' | 'reopen') => {
    if (kind === 'close' && !(await confirm({
      title: 'Encerrar chamado?', description: 'Você poderá reabrir o chamado depois, caso precise enviar novas informações.',
      confirmText: 'Encerrar chamado', cancelText: 'Continuar atendimento', variant: 'primary',
    }))) return;
    try {
      if (kind === 'close') await api.support.close(ticket.id); else await api.support.reopen(ticket.id);
      toast.success(kind === 'close' ? 'Chamado encerrado.' : 'Chamado reaberto.');
      onChanged();
    } catch (err) { toast.error((err as Error)?.message || 'Não foi possível concluir a ação.'); }
  });

  if (ticket.status === 'DUPLICATE' || ticket.status === 'CANCELLED') return null;
  return isFinalStatus(ticket.status) ? (
    <button type="button" className={BTN} disabled={action.busy} onClick={() => void action.run('reopen')}><RotateCcw size={14} aria-hidden />Reabrir chamado</button>
  ) : (
    <button type="button" className={BTN} disabled={action.busy} onClick={() => void action.run('close')}><XCircle size={14} aria-hidden />Encerrar chamado</button>
  );
}
