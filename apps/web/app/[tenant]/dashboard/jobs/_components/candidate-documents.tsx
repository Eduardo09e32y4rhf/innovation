'use client';

import { Copy, Download, FileCheck2, Link2, RefreshCw, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui';
import { DocumentPicker } from './document-picker';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';
import { jobsApi } from '../jobs-api';
import { Pill, inputClass } from './bits';
import { DOC_STATUS_LABEL, asksExpiry, currentByLabel, needsExpiry, forwardReadiness, parseItemsInput, publicDocumentsUrl, requestedLabels, type CreatedRequest } from './documents-model';

const fail = (cause: unknown, fallback: string) => toast.error(cause instanceof ApiError ? cause.message : fallback);
const tone = { PENDING: 'default', RECEIVED: 'info', APPROVED: 'success', RETURNED: 'warning' } as const;
const dateTime = (value: string) => new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Coleta e conferencia de documentos da candidatura. "Encaminhar" entrega o candidato ao RH da empresa:
 * nunca cria funcionario, usuario, ponto ou folha (admissao e decisao do RH da empresa).
 */
export function CandidateDocuments({ applicationId, onChanged }: { applicationId: string; onChanged: () => void }) {
  const query = useQuery(() => jobsApi.documents(applicationId), [applicationId]);
  const kit = useQuery(() => jobsApi.documentKit(applicationId), [applicationId]);
  const [itemsText, setItemsText] = useState('');
  const [days, setDays] = useState(7);
  const [sendEmail, setSendEmail] = useState(true);
  const [created, setCreated] = useState<CreatedRequest | null>(null);
  const [returning, setReturning] = useState<{ id: string; reason: string } | null>(null);
  const [approving, setApproving] = useState<{ id: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const data = query.data;
  const [prefilled, setPrefilled] = useState(false);
  // Ao abrir o candidato sem pedido anterior, a lista da vaga (ou o kit do contrato) ja vem preenchida.
  useEffect(() => {
    if (!prefilled && kit.data?.items.length && data && data.requests.length === 0) { setItemsText(kit.data.items.map((item) => item.label).join('\n')); setPrefilled(true); }
  }, [prefilled, kit.data, data]);

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
            <p className="text-sm font-medium">Escolha os documentos (CLT, PJ, estágio) ou digite outros abaixo</p>
            <textarea id="doc-items" aria-label="Documentos, um por linha" rows={3} className={inputClass} value={itemsText} onChange={(event) => setItemsText(event.target.value)} placeholder={'Ex.: Documento de identificação\nComprovante de residência'} />
            {!itemsText.trim() && (kit.data?.items.length ?? 0) > 0 && (
              <Button variant="outline" size="sm" onClick={() => setItemsText(kit.data!.items.map((item) => item.label).join('\n'))}>
                {kit.data!.configured ? 'Usar a lista de documentos da vaga' : `Usar o kit do contrato ${kit.data!.employmentType || 'CLT'}`} ({kit.data!.items.length})
              </Button>
            )}
            <DocumentPicker value={parseItemsInput(itemsText)} onChange={(items) => setItemsText(items.join('\n'))} />
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-[var(--color-brand)]" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} /> Enviar o link por e-mail ao candidato</label>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm font-medium">Validade do link
                <select className="input-v2 ml-2" value={days} onChange={(event) => setDays(Number(event.target.value))}>
                  {[3, 7, 15, 30].map((value) => <option key={value} value={value}>{value} dias</option>)}
                </select>
              </label>
              <Button isLoading={busy} disabled={!parseItemsInput(itemsText).length}
                onClick={() => run(async () => { setCreated(await jobsApi.createDocumentRequest(applicationId, parseItemsInput(itemsText), days, sendEmail)); setItemsText(''); })}>
                <Link2 size={16} aria-hidden="true" /> Gerar link
              </Button>
            </div>
          </div>
        )}
        {created && (
          <div role="status" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <p>{created.emailed ? <strong>E-mail enviado ao candidato com o link. </strong> : null}Link gerado. <strong>Ele só aparece agora</strong>: copie se quiser enviar por outro canal. Vale até {dateTime(created.expiresAt)}.</p>
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
                  {request.state !== 'REVOKED' && !forwarded && (
                    <button type="button" className="btn-icon" aria-label="Reemitir link (o anterior deixa de valer)" title="Reemitir link" disabled={busy} onClick={() => run(async () => { setCreated(await jobsApi.reissueDocumentRequest(request.id, days, sendEmail)); }, 'Link reemitido. Os documentos já enviados foram mantidos.')}><RefreshCw size={15} aria-hidden="true" /></button>
                  )}
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
                    <span className="font-medium">{label}{doc?.sensitive && <span className="ml-2 rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">Dado sensível</span>}</span>
                    <Pill tone={tone[status]}>{DOC_STATUS_LABEL[status]}</Pill>
                  </div>
                  {doc?.status === 'RETURNED' && doc.returnReason && <p className="text-xs text-fg-sub">Motivo: {doc.returnReason}</p>}
                  {doc?.restricted && <p className="text-xs text-amber-900" role="status">Dado sensível (saúde ou antecedentes): somente o RH pode abrir e conferir. A leitura fica registrada.</p>}
                  {doc && !doc.restricted && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => jobsApi.downloadDocument(doc.id, doc.fileName).catch((cause) => fail(cause, 'Não foi possível baixar o documento.'))}><Download size={14} aria-hidden="true" /> Baixar</Button>
                      {doc.status === 'RECEIVED' && !forwarded && (
                        <>
                          <Button size="sm" isLoading={busy} onClick={() => (asksExpiry(doc.docType) ? setApproving({ id: doc.id, expiresAt: '' }) : run(() => jobsApi.reviewDocument(doc.id, 'APPROVED'), 'Documento aprovado. O candidato foi avisado por e-mail.'))}><FileCheck2 size={14} aria-hidden="true" /> Aprovar</Button>
                          <Button variant="outline" size="sm" onClick={() => setReturning({ id: doc.id, reason: '' })}><RotateCcw size={14} aria-hidden="true" /> Devolver</Button>
                        </>
                      )}
                    </div>
                  )}
                  {doc?.status === 'APPROVED' && doc.expiresAt && <p className="text-xs text-fg-sub">Vence em {new Date(doc.expiresAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>}
                  {approving?.id === doc?.id && doc && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium" htmlFor={`expires-${doc.id}`}>Vencimento do documento{needsExpiry(doc.docType) ? ' (obrigatório)' : ' (opcional)'}</label>
                      <input id={`expires-${doc.id}`} type="date" className={inputClass} value={approving.expiresAt} onChange={(event) => setApproving({ id: doc.id, expiresAt: event.target.value })} />
                      <div className="flex gap-2">
                        <Button size="sm" isLoading={busy} disabled={needsExpiry(doc.docType) && !approving.expiresAt} onClick={() => run(async () => { await jobsApi.reviewDocument(doc.id, 'APPROVED', undefined, approving.expiresAt || undefined); setApproving(null); }, 'Documento aprovado. O candidato foi avisado por e-mail.')}>Confirmar aprovação</Button>
                        <Button variant="ghost" size="sm" onClick={() => setApproving(null)}>Cancelar</Button>
                      </div>
                    </div>
                  )}
                  {returning?.id === doc?.id && doc && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium" htmlFor={`return-${doc.id}`}>Motivo da devolução (o candidato verá)</label>
                      <textarea id={`return-${doc.id}`} rows={2} className={inputClass} value={returning.reason} onChange={(event) => setReturning({ id: doc.id, reason: event.target.value })} />
                      <div className="flex gap-2">
                        <Button size="sm" isLoading={busy} disabled={returning.reason.trim().length < 5} onClick={() => run(async () => { await jobsApi.reviewDocument(doc.id, 'RETURNED', returning.reason.trim()); setReturning(null); }, 'Documento devolvido. O candidato recebeu o motivo e um link novo por e-mail.')}>Confirmar devolução</Button>
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