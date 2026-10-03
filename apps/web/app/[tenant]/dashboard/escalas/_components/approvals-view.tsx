'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Modal } from '@/app/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { hubApi } from '../_lib/hub-api';
import { REQUEST_STATUS_LABEL, describeRequest, errorMessage, fmtDate, fmtMinutes } from '../_lib/format';
import { StepsTrail } from './requests-view';

function RejectModal({ isOpen, count, onClose, onConfirm }: { isOpen: boolean; count: number; onClose: () => void; onConfirm: (note: string) => Promise<void> }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal isOpen={isOpen} onClose={() => !busy && onClose()} title="Reprovar solicitação" description={count > 1 ? `${count} solicitações serão reprovadas.` : 'O funcionário será avisado com o motivo.'}>
      <form className="space-y-3" onSubmit={async (event) => { event.preventDefault(); if (!note.trim()) return; setBusy(true); try { await onConfirm(note.trim()); setNote(''); } finally { setBusy(false); } }}>
        <label className="block space-y-1.5 text-sm font-medium">Motivo *<textarea autoFocus className="input-v2 min-h-24 w-full" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button type="submit" variant="danger" isLoading={busy} disabled={!note.trim()}>Reprovar</Button></div>
      </form>
    </Modal>
  );
}

export function ApprovalsView({ onChanged }: { onChanged: () => void }) {
  const data = useQuery(() => hubApi.approvals(), [], { pollMs: 60000 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejecting, setRejecting] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => { data.refetch(); onChanged(); };
  const toggle = (id: string) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  async function decide(ids: string[], action: 'APPROVE' | 'REJECT', note?: string) {
    setBusy(true);
    try {
      const result = await hubApi.bulkDecide(ids, action, note);
      if (result.failed) toast.error(`${result.failed} pedido(s) não puderam ser decididos: ${result.results.find((item) => !item.ok)?.message ?? ''}`);
      if (result.approved) toast.success(action === 'APPROVE' ? `${result.approved} aprovada(s).` : `${result.approved} reprovada(s).`);
      setSelected(new Set()); setRejecting(null); refresh();
    } catch (cause) { toast.error(errorMessage(cause, 'Falha ao decidir.')); }
    finally { setBusy(false); }
  }

  async function track(action: () => Promise<unknown>, success: string) {
    try { await action(); toast.success(success); refresh(); }
    catch (cause) { toast.error(errorMessage(cause, 'Não foi possível concluir.')); }
  }

  if (data.loading && !data.data) return <LoadingState label="Carregando aprovações…" />;
  if (data.error) return <ErrorState message={data.error} onRetry={data.refetch} />;
  const value = data.data;
  if (!value) return null;
  const empty = !value.requests.length && !value.punches.length && !value.overtime.length;
  if (empty) return <EmptyState message="Nada aguardando sua decisão. 🎉" />;

  return (
    <div className="space-y-6">
      {value.requests.length > 0 && (
        <section aria-label="Solicitações" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Solicitações ({value.requests.length})</h2>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelected(selected.size === value.requests.length ? new Set() : new Set(value.requests.map((item) => item.id)))}>{selected.size === value.requests.length ? 'Limpar seleção' : 'Selecionar todas'}</Button>
              <Button size="sm" disabled={!selected.size || busy} isLoading={busy} onClick={() => decide([...selected], 'APPROVE')}>Aprovar selecionadas ({selected.size})</Button>
              <Button size="sm" variant="danger" disabled={!selected.size || busy} onClick={() => setRejecting([...selected])}>Reprovar</Button>
            </div>
          </div>
          <ul className="space-y-3">
            {value.requests.map((item) => (
              <li key={item.id} className="card-v2 p-4">
                <div className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 h-4 w-4" aria-label={`Selecionar pedido de ${item.requester?.name}`} checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.requester?.name} <span className="font-normal text-fg-sub">· {item.requester?.department ?? 'Sem setor'}</span></p>
                    <p className="text-sm">{item.typeLabel}: {describeRequest(item.type, item.payload)}</p>
                    {item.peer && <p className="text-xs text-fg-sub">Com {item.peer.name}</p>}
                    {item.reason && <p className="mt-1 text-xs italic text-fg-sub">“{item.reason}”</p>}
                    <StepsTrail item={item} />
                    <p className="mt-1 text-xs text-fg-sub">{REQUEST_STATUS_LABEL[item.status]} · enviada em {fmtDate(item.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <Button size="sm" disabled={busy} onClick={() => decide([item.id], 'APPROVE')}>Aprovar</Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejecting([item.id])}>Reprovar</Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {value.punches.length > 0 && (
        <section aria-label="Pontos para aprovar" className="space-y-3">
          <h2 className="text-base font-semibold">Pontos fora do local ou manuais ({value.punches.length})</h2>
          <ul className="space-y-2">
            {value.punches.map((item) => (
              <li key={item.id} className="card-v2 flex flex-wrap items-center justify-between gap-3 p-3">
                <div><p className="text-sm font-medium">{item.employee?.name} · {fmtDate(item.date)}</p><p className="text-xs text-fg-sub">{item.reason ?? item.observation ?? 'Registro pendente'}</p></div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => track(() => hubApi.approveManualTrack(item.id, true), 'Ponto aprovado.')}>Aprovar</Button>
                  <Button size="sm" variant="outline" onClick={() => track(() => hubApi.approveManualTrack(item.id, false), 'Ponto reprovado.')}>Reprovar</Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {value.overtime.length > 0 && (
        <section aria-label="Horas extras" className="space-y-3">
          <h2 className="text-base font-semibold">Horas extras ({value.overtime.length})</h2>
          <ul className="space-y-2">
            {value.overtime.map((item) => (
              <li key={item.id} className="card-v2 flex flex-wrap items-center justify-between gap-3 p-3">
                <div><p className="text-sm font-medium">{item.employee?.name} · {fmtDate(item.date)}</p><p className="text-xs text-fg-sub">50%: {fmtMinutes(item.overtime50)} · 100%: {fmtMinutes(item.overtime100)}{item.exceedsLimit ? ' · acima do limite' : ''}</p></div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => track(() => hubApi.approveOvertime(item.id, true), 'Hora extra aprovada.')}>Aprovar</Button>
                  <Button size="sm" variant="outline" onClick={() => track(() => hubApi.approveOvertime(item.id, false), 'Hora extra reprovada.')}>Reprovar</Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <RejectModal isOpen={Boolean(rejecting)} count={rejecting?.length ?? 0} onClose={() => setRejecting(null)} onConfirm={async (note) => decide(rejecting!, 'REJECT', note)} />
    </div>
  );
}
