'use client';
import React, { useRef, useState } from 'react';
import { RotateCcw, Star } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/app/lib/api';
import { useAction } from '@/app/hooks/use-action';
import type { SupportTicket } from './support-model';
import { STAR_LABELS, canRateTicket, canReopenResolved, nextStarScore, showRatingBlock } from './refund-model';

function Stars({ value, label }: { value: number; label: string }) {
  return (
    <span role="img" aria-label={label} className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={18} aria-hidden className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />)}
    </span>
  );
}

/** Avaliação do atendimento (1 a 5 estrelas, por teclado) e botão Reabrir. Só para quem abriu o chamado. */
export function RatingBlock({ ticket, userId, onChanged }: { ticket: SupportTicket; userId?: string; onChanged: () => void }) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const submit = useAction(async () => {
    if (score < 1) { toast.error('Escolha de 1 a 5 estrelas.'); return; }
    try { await api.support.rate(ticket.id, { score, comment: comment.trim() || undefined }); toast.success('Obrigado pela avaliação!'); onChanged(); }
    catch (err) { toast.error((err as Error)?.message || 'Não foi possível enviar a avaliação.'); }
  });
  const reopen = useAction(async () => {
    try { await api.support.reopenResolved(ticket.id); toast.success('Chamado reaberto.'); onChanged(); }
    catch (err) { toast.error((err as Error)?.message || 'Não foi possível reabrir o chamado.'); }
  });

  if (!showRatingBlock(ticket, userId)) return null;
  const rated = ticket.satisfactionScore ?? null;
  const onKey = (e: React.KeyboardEvent) => {
    const next = nextStarScore(score, e.key);
    if (next === null) return;
    e.preventDefault(); setScore(next); refs.current[next - 1]?.focus();
  };

  return (
    <section aria-label="Avaliação do atendimento" className="mt-4 rounded-xl border border-border bg-bg-elev p-3">
      {rated !== null ? (
        <div className="space-y-1">
          <h3 className="text-sm font-extrabold text-fg">Sua avaliação</h3>
          <p className="flex items-center gap-2 text-sm"><Stars value={rated} label={`${rated} de 5 estrelas`} /><span className="font-semibold">{STAR_LABELS[rated - 1]}</span></p>
          {ticket.satisfactionComment && <p className="whitespace-pre-wrap break-words text-xs text-slate-600">{ticket.satisfactionComment}</p>}
        </div>
      ) : canRateTicket(ticket, userId) ? (
        <form onSubmit={(e) => { e.preventDefault(); void submit.run(); }} className="space-y-2">
          <h3 id={`rate-${ticket.id}`} className="text-sm font-extrabold text-fg">Como foi o atendimento?</h3>
          <div role="radiogroup" aria-labelledby={`rate-${ticket.id}`} onKeyDown={onKey} className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} ref={(el) => { refs.current[n - 1] = el; }} type="button" role="radio" aria-checked={score === n}
                aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}: ${STAR_LABELS[n - 1]}`} tabIndex={score === n || (score === 0 && n === 1) ? 0 : -1}
                onClick={() => setScore(n)}
                className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-bg-sub focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                <Star size={24} aria-hidden className={n <= score ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
              </button>
            ))}
          </div>
          <label htmlFor={`rate-c-${ticket.id}`} className="block text-xs font-semibold text-slate-600">Comentário (opcional)</label>
          <textarea id={`rate-c-${ticket.id}`} rows={2} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} className="input-v2 w-full resize-none py-2 text-sm" />
          <button type="submit" disabled={submit.busy || score < 1} className="inline-flex min-h-9 items-center rounded-lg bg-brand px-3 text-xs font-bold text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">Enviar avaliação</button>
        </form>
      ) : null}
      {canReopenResolved(ticket) && (
        <div className={rated !== null ? 'mt-3 border-t border-border pt-3' : 'mt-3'}>
          <p className="text-xs text-slate-600">O problema voltou? Você pode reabrir este chamado até 7 dias após a resolução.</p>
          <button type="button" disabled={reopen.busy} onClick={() => void reopen.run()}
            className="mt-1 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold text-fg hover:bg-bg-sub disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"><RotateCcw size={14} aria-hidden />Reabrir</button>
        </div>
      )}
    </section>
  );
}
