'use client';

import { useCallback, useEffect, useState } from 'react';
import { CAREERS_API_URL } from '../../_lib/public-jobs';
import { STATUS_LABEL, canUpload, explainUploadError, validateDocumentFile, type DocumentRequestView } from './documents-client';

async function readJson(response: Response) {
  try { return await response.json(); } catch { return null; }
}

export function DocumentUpload({ token }: { token: string }) {
  const [view, setView] = useState<DocumentRequestView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, { ok: boolean; text: string }>>({});

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const response = await fetch(`${CAREERS_API_URL}/public/candidate-documents/${encodeURIComponent(token)}`, { cache: 'no-store', referrerPolicy: 'no-referrer' });
      if (!response.ok) {
        const body = await readJson(response);
        setLoadError(explainUploadError(response.status, body?.message));
        setView(null);
        return;
      }
      setView(await response.json());
    } catch {
      setLoadError('Não foi possível carregar agora. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function send(label: string, file: File | null) {
    const problem = validateDocumentFile(file);
    if (problem) { setMessages((m) => ({ ...m, [label]: { ok: false, text: problem } })); return; }
    setBusy(label);
    setMessages((m) => ({ ...m, [label]: { ok: true, text: 'Enviando e verificando o arquivo…' } }));
    try {
      const form = new FormData();
      form.append('label', label);
      form.append('file', file as File);
      const response = await fetch(`${CAREERS_API_URL}/public/candidate-documents/${encodeURIComponent(token)}/upload`, { method: 'POST', body: form, referrerPolicy: 'no-referrer' });
      if (!response.ok) {
        const body = await readJson(response);
        setMessages((m) => ({ ...m, [label]: { ok: false, text: explainUploadError(response.status, typeof body?.message === 'string' ? body.message : undefined) } }));
        return;
      }
      setMessages((m) => ({ ...m, [label]: { ok: true, text: 'Documento recebido. Ele será conferido pela equipe de seleção.' } }));
      await load();
    } catch {
      setMessages((m) => ({ ...m, [label]: { ok: false, text: 'Não foi possível enviar agora. Tente novamente.' } }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-semibold">Envio de documentos</h1>
      {loading && <p role="status" className="mt-6 text-sm">Carregando…</p>}
      {!loading && loadError && (
        <div role="alert" className="mt-6 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          <p>{loadError}</p>
          <button type="button" onClick={() => { setLoading(true); void load(); }} className="mt-3 min-h-11 rounded-lg border border-rose-400 px-4 font-medium">Tentar novamente</button>
        </div>
      )}
      {view && (
        <>
          <p className="mt-2 text-sm text-fg-sub">
            {view.company} · {view.jobTitle}. Este link vale até {new Date(view.expiresAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.
            Aceitamos PDF, PNG ou JPEG de até 5 MB.
          </p>
          <ul className="mt-6 space-y-4">
            {view.items.map((item) => {
              const inputId = `doc-${item.label.replace(/[^a-zA-Z0-9]+/g, '-')}`;
              const message = messages[item.label];
              return (
                <li key={item.label} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-medium">{item.label}</h2>
                    <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium">{STATUS_LABEL[item.status]}</span>
                  </div>
                  {item.status === 'RETURNED' && item.returnReason && <p className="mt-2 text-sm text-rose-800">Motivo: {item.returnReason}</p>}
                  {canUpload(item.status) ? (
                    <div className="mt-3 space-y-2">
                      <label htmlFor={inputId} className="block text-sm font-medium">{item.status === 'PENDING' ? 'Escolher arquivo' : 'Enviar novamente'}</label>
                      <input id={inputId} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" disabled={busy !== null} className="block w-full min-h-11 text-base sm:text-sm"
                        onChange={(event) => { const file = event.target.files?.[0] ?? null; if (file) void send(item.label, file); event.target.value = ''; }} />
                    </div>
                  ) : <p className="mt-3 text-sm">Documento aprovado. Nada mais a fazer aqui.</p>}
                  {message && <p role={message.ok ? 'status' : 'alert'} className={`mt-2 text-sm ${message.ok ? 'text-fg-sub' : 'text-rose-800'}`}>{message.text}</p>}
                </li>
              );
            })}
          </ul>
          <p className="mt-6 text-xs text-fg-sub">Seus documentos são usados somente no processo seletivo e ficam em armazenamento privado.</p>
        </>
      )}
    </main>
  );
}