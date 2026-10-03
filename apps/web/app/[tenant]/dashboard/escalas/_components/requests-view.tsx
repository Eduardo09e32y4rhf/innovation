'use client';

import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { hubApi } from '../_lib/hub-api';
import { REQUEST_STATUS_LABEL, REQUEST_STATUS_TONE, describeRequest, errorMessage, fmtDate } from '../_lib/format';
import type { ScheduleRequestItem } from '../_lib/types';

export function StepsTrail({ item }: { item: ScheduleRequestItem }) {
  if (!item.steps?.length) return null;
  return (
    <ol className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      {item.peer && <li className={`rounded-full px-2 py-0.5 ${item.status === 'AWAITING_PEER' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}`}>Colega: {item.peer.name}{item.status === 'AWAITING_PEER' ? ' (aguardando)' : ' ✓'}</li>}
      {item.steps.map((step, index) => (
        <li key={index} className={`rounded-full px-2 py-0.5 ${step.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : step.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-zinc-100 text-zinc-600'}`}>
          {step.step === 'MANAGER' ? 'Gestor' : 'RH'}: {step.status === 'APPROVED' ? `aprovou${step.byName ? ` (${step.byName})` : ''}` : step.status === 'REJECTED' ? 'reprovou' : 'pendente'}
        </li>
      ))}
    </ol>
  );
}

export function RequestsView({ onNew }: { onNew: () => void }) {
  const list = useQuery(() => hubApi.requests('mine'), [], { pollMs: 60000 });

  async function act(action: () => Promise<unknown>, success: string) {
    try { await action(); toast.success(success); list.refetch(); }
    catch (cause) { toast.error(errorMessage(cause, 'Não foi possível concluir.')); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-base font-semibold">Minhas solicitações</h2><p className="text-sm text-fg-sub">Acompanhe pedidos de troca, nova escala, ajuste e justificativa.</p></div>
        <Button onClick={onNew}><Plus size={16} aria-hidden="true" /> Nova solicitação</Button>
      </div>
      {list.error && <ErrorState message={list.error} onRetry={list.refetch} />}
      {list.loading && !list.data ? <LoadingState label="Carregando solicitações…" /> : !list.data ? null : list.data.length === 0 ? <EmptyState message="Você ainda não fez solicitações." /> : (
        <ul className="space-y-3">
          {list.data.map((item) => (
            <li key={item.id} className="card-v2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{item.typeLabel}{!item.mine && item.requester ? ` — ${item.requester.name}` : ''}</p>
                  <p className="text-sm text-fg-sub">{describeRequest(item.type, item.payload)}</p>
                  {item.reason && <p className="mt-1 text-xs italic text-fg-sub">“{item.reason}”</p>}
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${REQUEST_STATUS_TONE[item.status]}`}>{REQUEST_STATUS_LABEL[item.status]}</span>
              </div>
              <StepsTrail item={item} />
              {item.status === 'REJECTED' && item.decisionNote && <p className="mt-2 rounded-lg bg-rose-50 p-2.5 text-sm text-rose-800"><strong>Motivo:</strong> {item.decisionNote}</p>}
              <p className="mt-2 text-xs text-fg-sub">Enviada em {fmtDate(item.createdAt)}</p>
              {(item.canCancel || item.canRespondPeer) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.canRespondPeer && <>
                    <Button size="sm" onClick={() => act(() => hubApi.respondPeer(item.id, 'ACCEPT'), 'Troca aceita. Segue para aprovação.')}>Aceitar troca</Button>
                    <Button size="sm" variant="outline" onClick={() => act(() => hubApi.respondPeer(item.id, 'DECLINE'), 'Troca recusada.')}>Recusar</Button>
                  </>}
                  {item.canCancel && <Button size="sm" variant="ghost" onClick={() => act(() => hubApi.cancelRequest(item.id), 'Solicitação cancelada.')}>Cancelar pedido</Button>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
