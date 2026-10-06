'use client';

import { Copy, Download, FileCheck2, Link2, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';
import { jobsApi } from '../jobs-api';
import { Pill, inputClass } from './bits';
import { DOC_STATUS_LABEL, currentByLabel, forwardReadiness, parseItemsInput, publicDocumentsUrl, requestedLabels, type CreatedRequest } from './documents-model';

const fail = (cause: unknown, fallback: string) => toast.error(cause instanceof ApiError ? cause.message : fallback);
const tone = { PENDING: 'default', RECEIVED: 'info', APPROVED: 'success', RETURNED: 'warning' } as const;
const dateTime = (value: string) => new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Coleta e conferencia de documentos da candidatura. "Encaminhar" entrega o candidato ao RH da empresa:
 * nunca cria funcionario, usuario, ponto ou folha (admissao e decisao do RH da empresa).
 */
export function CandidateDocuments({ applicationId, onChanged }: { applicationId: string; onChanged: () => void }) {
  const query = useQuery(() => jobsApi.documents(applicationId), [applicationId]);
  const [itemsText, setItemsText] = useState('');
  const [days, setDays] = useState(7);
  const [created, setCreated] = useState<CreatedRequest | null>(null);
  const [returning, setReturning] = useState<{ id: string; reason: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const data = query.data;

  async function run(action: () => Promise<unknown>, success?: string) {
    if (busy) return;
    setBusy(true);
    try { await action(); if (success) toast.success(success); query.refetch(); onChanged(); }
    catch (cause) { fail(cause, 'Não foi possível concluir a ação.'); }
    finally { setBusy(false); }
  }

  if (query.loading && !data) return <LoadingState label="Carregando documentos…" />;
  if (query.error) return <ErrorState message={query.error} onRetry={query.refetch} />;
  if (!data) return null;

  const labels = requestedLabels(data.requests);
  const current = currentByLabel(data.documents);
  const readiness = forwardReadiness(data.requests, data.documents);
  const forwarded = Boolean(data.forwardedAt);
  const link = created ? publicDocumentsUrl(typeof window === 'undefined' ? '' : window.location.origin, created.path) : '';

  async function copy() {
    try { await navigator.clipboard.writeText(link); toast.success('Link copiado.'); } catch { toast.error('Não foi possível copiar. Selecione e copie manualmente.'); }
  }

  return (
    <div className="space-y-5">
      {forwarded && <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">Encaminhado ao RH da empresa em {dateTime(data.forwardedAt!)}. A admissão é decisão do RH da empresa.</p>}

      <section className="space-y-3" aria-labelledby="doc-request-title">
        <h3 id="doc-request-title" className="text-sm font-semibold">Solicitar documentos</h3>
        {!forwarded && (
          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="doc-items">Documentos (um por linha)</label>
            <textarea id="doc-items" rows={3} className={inputClass} value={itemsText} onChange={(event) => setItemsText(event.target.value)} placeholder={'Ex.: Documento de identificação\nComprovante de residência'} />
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm font-medium">Validade do link
                <select className="input-v2 ml-2" value={days} onChange={(event) => setDays(Number(event.target.value))}>
                  {[3, 7, 15, 30].map((value) => <option key={value} value={value}>{value} dias</option>)}
                </select>
              </label>
              <Button isLoading={busy} disabled={!parseItemsInput(itemsText).length}
                onClick={() => run(async () => { setCreated(await jobsApi.createDocumentRequest(applicationId, parseItemsInput(itemsText), days)); setItemsText(''); })}>
                <Link2 size={16} aria-hidden="true" /> Gerar link
              </Button>
            </div>
          </div>
        )}
        {created && (
          <div role="status" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <p>Link gerado. <strong>Ele só aparece agora</strong>: copie e envie ao candidato por um canal seguro. Vale até {dateTime(created.expiresAt)}.</p>
            <p className="select-all break-all rounded border border-amber-300 bg-white p-2 font-mono text-xs" data-testid="document-link">{link}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copy}><Copy size={14} aria-hidden="true" /> Copiar</Button>
              <Button variant="ghost" size="sm" onClick={() => setCreated(null)}>Já copiei</Button>
            </div>
          </div>
        )}
        {data.requests.length > 0 && (
          <ul className="space-y-2 text-sm">
            {data.requests.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                <span className="min-w-0 break-words">{request.items.join(', ')}</span>
                <span className="flex items-center gap-2">
                  <Pill tone={request.state === 'ACTIVE' ? 'success' : 'default'}>{request.state === 'ACTIVE' ? `Ativo até ${dateTime(request.expiresAt)}` : request.state === 'EXPIRED' ? 'Expirado' : 'Revogado'}</Pill>
                  {request.state === 'ACTIVE' && !forwarded && (
                    <button type="button" className="btn-icon text-rose-600" aria-label="Revogar link" disabled={busy} onClick={() => run(() => jobsApi.revokeDocumentRequest(request.id), 'Link revogado.')}><Trash2 size={15} aria-hidden="true" /></button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {labels.length > 0 && (
        <section className="space-y-3" aria-labelledby="doc-review-title">
          <h3 id="doc-review-title" className="text-sm font-semibold">Conferência</h3>
          <ul className="space-y-2">
            {labels.map((label) => {
              const doc = current.get(label);
              const status = doc?.status ?? 'PENDING';
              return (
                <li key={label} className="space-y-2 rounded-lg border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{label}</span>
                    <Pill tone={tone[status]}>{DOC_STATUS_LABEL[status]}</Pill>
                  </div>
                  {doc?.status === 'RETURNED' && doc.returnReason && <p className="text-xs text-fg-sub">Motivo: {doc.returnReason}</p>}
                  {doc && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => jobsApi.downloadDocument(doc.id, doc.fileName).catch((cause) => fail(cause, 'Não foi possível baixar o documento.'))}><Download size={14} aria-hidden="true" /> Baixar</Button>
                      {doc.status === 'RECEIVED' && !forwarded && (
                        <>
                          <Button size="sm" isLoading={busy} onClick={() => run(() => jobsApi.reviewDocument(doc.id, 'APPROVED'), 'Documento aprovado.')}><FileCheck2 size={14} aria-hidden="true" /> Aprovar</Button>
                          <Button variant="outline" size="sm" onClick={() => setReturning({ id: doc.id, reason: '' })}><RotateCcw size={14} aria-hidden="true" /> Devolver</Button>
                        </>
                      )}
                    </div>
                  )}
                  {returning?.id === doc?.id && doc && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium" htmlFor={`return-${doc.id}`}>Motivo da devolução (o candidato verá)</label>
                      <textarea id={`return-${doc.id}`} rows={2} className={inputClass} value={returning.reason} onChange={(event) => setReturning({ id: doc.id, reason: event.target.value })} />
                      <div className="flex gap-2">
                        <Button size="sm" isLoading={busy} disabled={returning.reason.trim().length < 5} onClick={() => run(async () => { await jobsApi.reviewDocument(doc.id, 'RETURNED', returning.reason.trim()); setReturning(null); }, 'Documento devolvido.')}>Confirmar devolução</Button>
                        <Button variant="ghost" size="sm" onClick={() => setReturning(null)}>Cancelar</Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="space-y-2 rounded-lg border border-border p-3" aria-labelledby="doc-forward-title">
        <h3 id="doc-forward-title" className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={15} aria-hidden="true" /> Seleção e encaminhamento</h3>
        <p className="text-xs text-fg-sub">Encaminhar entrega o candidato ao RH da empresa com os documentos aprovados. Não cria funcionário nem acesso: a admissão é decidida pelo RH da empresa.</p>
        {!forwarded && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" isLoading={busy} disabled={Boolean(data.selectedAt)} onClick={() => run(() => jobsApi.selectApplication(applicationId), 'Candidato selecionado.')}>{data.selectedAt ? 'Candidato selecionado' : 'Selecionar candidato'}</Button>
            <Button isLoading={busy} disabled={!data.selectedAt || !readiness.ready} onClick={() => run(() => jobsApi.forwardApplication(applicationId), 'Encaminhado ao RH da empresa.')}>Encaminhar ao RH da empresa</Button>
          </div>
        )}
        {!forwarded && data.selectedAt && !readiness.ready && (
          <p className="text-xs text-amber-900" role="status">
            {readiness.total === 0 ? 'Solicite ao menos um documento.' : [readiness.missing.length ? `Faltam: ${readiness.missing.join(', ')}.` : '', readiness.pending.length ? `Falta conferir: ${readiness.pending.join(', ')}.` : '', readiness.returned.length ? `Devolvidos: ${readiness.returned.join(', ')}.` : ''].filter(Boolean).join(' ')}
          </p>
        )}
        {!forwarded && !data.selectedAt && <p className="text-xs text-fg-sub">Selecione o candidato para habilitar o encaminhamento.</p>}
      </section>
    </div>
  );
}