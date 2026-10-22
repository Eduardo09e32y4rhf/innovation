'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { Button, Modal } from '@/app/components/ui';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import api, { type FiscalAdjustment, type FiscalAdjustmentAction } from '@/app/lib/api';
import { money, shortDate } from '../../../faturas/_format';

const KIND_LABEL: Record<FiscalAdjustment['kind'], string> = { MANUAL_REVIEW: 'Revisão manual', CANCEL_PENDING: 'Cancelamento pendente' };

/** Fila de notas fiscais que exigem ação humana: cancelamento que falhou, estorno parcial e chargeback. */
/** `readOnly`: lista os ajustes sem os botões de resolver. */
export function AjustesFiscaisView({ readOnly = false }: { readOnly?: boolean }) {
  const list = useQuery(() => api.platform.finance.fiscalAdjustments(), []);
  const [target, setTarget] = useState<FiscalAdjustment | null>(null);
  const [note, setNote] = useState('');

  const resolve = useMutation(
    (input: { invoiceId: string; action: FiscalAdjustmentAction; note?: string }) => api.platform.finance.resolveFiscalAdjustment(input.invoiceId, { action: input.action, note: input.note }),
    {
      onSuccess: () => { toast.success('Ajuste registrado.'); setTarget(null); setNote(''); list.refetch(); },
      onError: (message) => toast.error(message),
    },
  );
  const run = (item: FiscalAdjustment, action: FiscalAdjustmentAction, text?: string) => void resolve.mutate({ invoiceId: item.invoiceId, action, note: text });

  const items = list.data ?? [];
  return (
    <div className="space-y-4 p-3 sm:p-5 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-fg">Ajustes fiscais</h2>
          <p className="text-sm text-fg-mut">Notas fiscais que precisam de uma decisão: o cancelamento no Asaas falhou, houve estorno parcial ou chargeback.</p>
        </div>
        <button type="button" onClick={() => list.refetch()} disabled={list.loading} className="btn btn-outline inline-flex items-center gap-1.5 text-sm">
          <RefreshCw size={14} className={list.loading ? 'animate-spin' : ''} aria-hidden="true" /> Atualizar
        </button>
      </header>
      {list.loading && !list.data && <LoadingState label="Carregando ajustes..." />}
      {list.error && <ErrorState message={list.error} onRetry={list.refetch} />}
      {!list.loading && !list.error && items.length === 0 && <p className="card-v2 p-8 text-center text-sm text-fg-mut">Nenhum ajuste fiscal pendente.</p>}
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="card-v2 space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-fg">{item.company?.name ?? 'Empresa'}</p>
                <p className="text-xs text-fg-mut">{item.description || 'Fatura'} · {money(item.amount)} · desde {shortDate(item.createdAt)}</p>
              </div>
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700">{KIND_LABEL[item.kind]}</span>
            </div>
            <p className="rounded-xl bg-bg-sub p-3 text-sm">{item.reason}</p>
            {!readOnly && <div className="flex flex-wrap justify-end gap-2">
              {item.kind === 'CANCEL_PENDING' && <Button variant="outline" isLoading={resolve.loading} onClick={() => run(item, 'RETRY_CANCEL')}>Tentar cancelar de novo</Button>}
              {item.invoiceStatus && ['CANCELED', 'ERROR', 'CANCELLATION_DENIED'].includes(item.invoiceStatus) && <Button variant="outline" isLoading={resolve.loading} onClick={() => run(item, 'REISSUE')}>Reemitir nota</Button>}
              <Button onClick={() => { setTarget(item); setNote(''); }}>Marcar como resolvido</Button>
            </div>}
          </li>
        ))}
      </ul>
      <Modal isOpen={Boolean(target)} onClose={() => !resolve.loading && setTarget(null)} title="Marcar como resolvido" description={target?.company?.name}
        footer={<div className="flex justify-end gap-2"><Button variant="outline" disabled={resolve.loading} onClick={() => setTarget(null)}>Voltar</Button><Button isLoading={resolve.loading} disabled={note.trim().length < 5} onClick={() => target && run(target, 'MARK_RESOLVED', note.trim())}>Confirmar</Button></div>}>
        <label className="block text-sm font-medium">Como foi resolvido? *
          <textarea className="input-v2 mt-1 min-h-24 w-full" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <p className="mt-2 text-xs text-fg-mut">Fica registrado no histórico de auditoria com o seu usuário.</p>
      </Modal>
    </div>
  );
}
