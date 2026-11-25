'use client';

import { useCallback, useEffect, useState } from 'react';
import { CAREERS_API_URL } from '../../_lib/public-jobs';
import { STATUS_LABEL, canUpload, explainCodeError, explainUploadError, isValidCode, validateDocumentFile, type DocumentRequestView } from './documents-client';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
import { useI18n } from '@/app/contexts/I18nContext';
import { useLanguage } from '@/app/contexts/LanguageContext';

async function readJson(response: Response) {
  try { return await response.json(); } catch { return null; }
}

export function DocumentUpload({ token }: { token: string }) {
  const { t } = useI18n();
  const { language } = useLanguage();
  const [view, setView] = useState<DocumentRequestView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [code, setCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeMessage, setCodeMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function askCode() {
    setCodeBusy(true);
    setCodeMessage(null);
    try {
      const response = await fetch(`${CAREERS_API_URL}/public/candidate-documents/${encodeURIComponent(token)}/code`, { method: 'POST', referrerPolicy: 'no-referrer' });
      const body = await readJson(response);
      setCodeMessage(response.ok ? { ok: true, text: t('Enviamos um código de 6 números para {email}. Ele vale por 10 minutos.', { email: body?.emailHint ?? t('o seu e-mail') }) } : { ok: false, text: t(explainCodeError(response.status, typeof body?.message === 'string' ? body.message : undefined)) });
    } catch {
      setCodeMessage({ ok: false, text: t('Não foi possível pedir o código agora. Tente novamente.') });
    } finally {
      setCodeBusy(false);
    }
  }

  async function confirmCode() {
    if (!isValidCode(code)) { setCodeMessage({ ok: false, text: t('Digite os 6 números do código.') }); return; }
    setCodeBusy(true);
    setCodeMessage(null);
    try {
      const response = await fetch(`${CAREERS_API_URL}/public/candidate-documents/${encodeURIComponent(token)}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code.trim() }), referrerPolicy: 'no-referrer' });
      if (!response.ok) {
        const body = await readJson(response);
        setCodeMessage({ ok: false, text: t(explainCodeError(response.status, typeof body?.message === 'string' ? body.message : undefined)) });
        return;
      }
      setCode('');
      await load();
    } catch {
      setCodeMessage({ ok: false, text: t('Não foi possível validar o código agora. Tente novamente.') });
    } finally {
      setCodeBusy(false);
    }
  }

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const response = await fetch(`${CAREERS_API_URL}/public/candidate-documents/${encodeURIComponent(token)}`, { cache: 'no-store', referrerPolicy: 'no-referrer' });
      if (!response.ok) {
        const body = await readJson(response);
        setLoadError(t(explainUploadError(response.status, body?.message)));
        setView(null);
        return;
      }
      setView(await response.json());
    } catch {
      setLoadError(t('Não foi possível carregar agora. Verifique sua conexão e tente novamente.'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function send(label: string, file: File | null) {
    const problem = validateDocumentFile(file);
    if (problem) { setMessages((m) => ({ ...m, [label]: { ok: false, text: t(problem) } })); return; }
    setBusy(label);
    setMessages((m) => ({ ...m, [label]: { ok: true, text: t('Enviando e verificando o arquivo…') } }));
    try {
      const form = new FormData();
      form.append('label', label);
      form.append('file', file as File);
      const response = await fetch(`${CAREERS_API_URL}/public/candidate-documents/${encodeURIComponent(token)}/upload`, { method: 'POST', body: form, referrerPolicy: 'no-referrer' });
      if (!response.ok) {
        const body = await readJson(response);
        setMessages((m) => ({ ...m, [label]: { ok: false, text: t(explainUploadError(response.status, typeof body?.message === 'string' ? body.message : undefined)) } }));
        return;
      }
      setMessages((m) => ({ ...m, [label]: { ok: true, text: t('Documento recebido. Ele será conferido pela equipe de seleção.') } }));
      await load();
    } catch {
      setMessages((m) => ({ ...m, [label]: { ok: false, text: t('Não foi possível enviar agora. Tente novamente.') } }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <div className="mb-6 flex justify-end"><LanguageSwitcher /></div>
      <h1 className="text-2xl font-semibold">{t('Envio de documentos')}</h1>
      {loading && <p role="status" className="mt-6 text-sm">{t('Carregando…')}</p>}
      {!loading && loadError && (
        <div role="alert" className="mt-6 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          <p>{loadError}</p>
          <button type="button" onClick={() => { setLoading(true); void load(); }} className="mt-3 min-h-11 rounded-lg border border-rose-400 px-4 font-medium">{t('Tentar novamente')}</button>
        </div>
      )}
      {view && (
        <>
          <p className="mt-2 text-sm text-fg-sub">
            {view.company} · {view.jobTitle}. {t('Este link vale até')} {new Date(view.expiresAt).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' })}.
            {t('Cada documento mostra os formatos aceitos (até 5 MB).')}
          </p>
          {view.verification?.required && !view.verification.verified && (
            <section aria-labelledby="code-title" className="mt-6 space-y-3 rounded-xl border border-purple-300 bg-purple-50 p-4">
              <h2 id="code-title" className="font-medium">{t('Confirme que é você')}</h2>
              <p className="text-sm">{t('Para proteger seus documentos, enviamos um código de 6 números para {email}. Peça o código e digite abaixo antes de enviar os arquivos.', { email: view.verification.emailHint ?? t('o seu e-mail') })}</p>
              <button type="button" onClick={() => void askCode()} disabled={codeBusy} className="min-h-11 rounded-lg border border-purple-500 bg-white px-4 text-sm font-semibold">{t('Enviar código por e-mail')}</button>
              <div>
                <label htmlFor="verify-code" className="block text-sm font-medium">{t('Código recebido')}</label>
                <div className="mt-1 flex gap-2">
                  <input id="verify-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} className="min-h-11 w-40 rounded-lg border border-border px-3 text-lg tracking-widest" />
                  <button type="button" onClick={() => void confirmCode()} disabled={codeBusy || code.length !== 6} className="min-h-11 rounded-lg bg-purple-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{t('Confirmar')}</button>
                </div>
              </div>
              {codeMessage && <p role={codeMessage.ok ? 'status' : 'alert'} className={`text-sm ${codeMessage.ok ? 'text-fg-sub' : 'text-rose-800'}`}>{codeMessage.text}</p>}
            </section>
          )}
          <ul className="mt-6 space-y-4">
            {view.items.map((item) => {
              const inputId = `doc-${item.label.replace(/[^a-zA-Z0-9]+/g, '-')}`;
              const message = messages[item.label];
              return (
                <li key={item.label} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-medium">{t(item.label)}</h2>
                    <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium">{t(STATUS_LABEL[item.status])}</span>
                  </div>
                  {item.sensitive && <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950" role="note">{t('Dado pessoal sensível. Só o RH da empresa pode abrir este arquivo, o acesso fica registrado e ele é usado apenas para a admissão (obrigação legal). Ele é guardado cifrado.')}</p>}
                  {item.accepts && <p className="mt-1 text-xs text-fg-sub">{t('Formatos aceitos')}: {item.accepts}.</p>}
                  {item.status === 'RETURNED' && item.returnReason && <p className="mt-2 text-sm text-rose-800">{t('Motivo')}: {t(item.returnReason)}</p>}
                  {canUpload(item.status) ? (
                    <div className="mt-3 space-y-2">
                      <label htmlFor={inputId} className="block text-sm font-medium">{t(item.status === 'PENDING' ? 'Escolher arquivo' : 'Enviar novamente')}</label>
                      <input id={inputId} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" disabled={busy !== null || Boolean(view.verification?.required && !view.verification.verified)} className="block w-full min-h-11 text-base sm:text-sm"
                        onChange={(event) => { const file = event.target.files?.[0] ?? null; if (file) void send(item.label, file); event.target.value = ''; }} />
                    </div>
                  ) : <p className="mt-3 text-sm">{t('Documento aprovado. Nada mais a fazer aqui.')}</p>}
                  {message && <p role={message.ok ? 'status' : 'alert'} className={`mt-2 text-sm ${message.ok ? 'text-fg-sub' : 'text-rose-800'}`}>{message.text}</p>}
                </li>
              );
            })}
          </ul>
          <p className="mt-6 text-xs text-fg-sub">{t('Seus documentos são usados somente no processo seletivo e ficam em armazenamento privado.')}</p>
        </>
      )}
    </main>
  );
}