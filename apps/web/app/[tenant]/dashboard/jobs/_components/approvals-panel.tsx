'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Modal } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';
import { workflowApi, type PendingApproval } from '../workflow-api';

/** Requisições de vaga que esperam a decisão do perfil logado (gestor, RH ou financeiro). */
export function ApprovalsPanel({ base, onChanged }: { base: string; onChanged: () => void }) {
  const pending = useQuery(() => workflowApi.pending(), []);
  const [target, setTarget] = useState<PendingApproval | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const items = pending.data ?? [];
  if (!items.length) return null;

  async function decide(approve: boolean) {
    if (!target) return;
    setBusy(true);
    try {
      await workflowApi.decide(target.id, { approve, note: note.trim() || undefined });
      toast.success(approve ? 'Etapa aprovada.' : 'Requisição recusada e devolvida ao rascunho.');
      setTarget(null); setNote(''); pending.refetch(); onChanged();
    } catch (cause) { toast.error(cause instanceof ApiError ? cause.message : 'Não foi possível decidir.'); }
    finally { setBusy(false); }
  }

  return (
    <section aria-label="Requisições aguardando você" className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4">
      <h2 className="text-sm font-semibold text-amber-950">Requisições de vaga aguardando você ({items.length})</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3">
            <span className="min-w-0"><Link href={`${base}/${item.id}`} className="block truncate text-sm font-semibold hover:underline">{item.title}</Link><span className="block text-xs text-fg-sub">{item.department ?? 'Sem área'} · {item.openings} vaga(s) · etapa {item.stepLabel}</span></span>
            <Button size="sm" onClick={() => { setTarget(item); setNote(''); }}>Decidir</Button>
          </li>
        ))}
      </ul>
      <Modal isOpen={Boolean(target)} onClose={() => !busy && setTarget(null)} title={`Aprovar vaga: ${target?.title ?? ''}`} description={`Etapa ${target?.stepLabel ?? ''}. Ao aprovar a última etapa, a vaga abre sozinha.`}>
        <div className="space-y-3">
          <label className="block space-y-1 text-sm font-medium">Observação (obrigatória para recusar)<textarea className="input-v2 min-h-20 w-full" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></label>
          <div className="flex justify-end gap-2"><Button variant="outline" isLoading={busy} disabled={note.trim().length < 3} onClick={() => decide(false)}>Recusar</Button><Button isLoading={busy} onClick={() => decide(true)}>Aprovar</Button></div>
        </div>
      </Modal>
    </section>
  );
}