'use client';

import React from 'react';
import { FileSignature, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { request } from '@/app/lib/api';

type ConsentStatus = { required: boolean; accepted: boolean; termVersion: string };
type TermsDoc = {
  version: string;
  title: string;
  preamble: string;
  closing: string;
  contentHash: string;
  signer: { name: string; email: string; cpf?: string | null; position?: string | null; registration?: string | null };
  company: { name: string; legalName?: string | null; document?: string | null };
  sections: Array<{ title: string; clauses: string[] }>;
};

const maskDocument = (value?: string | null) => {
  const d = String(value ?? '').replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return d || 'não informado';
};

/** Termo de uso real: o texto e os dados do assinante vêm do servidor, e o aceite só vale se for gravado lá. */
export function PrivacyConsentGate({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [status, setStatus] = React.useState<ConsentStatus | null>(null);
  const [doc, setDoc] = React.useState<TermsDoc | null>(null);
  const [checked, setChecked] = React.useState(false);
  const [readAll, setReadAll] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loadError, setLoadError] = React.useState('');
  const scroller = React.useRef<HTMLDivElement | null>(null);

  const load = React.useCallback(async () => {
    if (!token || token === 'innovation-rh-connect-local-session') return;
    setLoadError('');
    try {
      const current = await request<ConsentStatus>('/legal/terms/status', { silent: true });
      setStatus(current);
      if (current.required) setDoc(await request<TermsDoc>('/legal/terms/document', { silent: true }));
    } catch (err: any) {
      setLoadError(err?.message || 'Não foi possível carregar o termo.');
    }
  }, [token]);

  React.useEffect(() => { void load(); }, [load]);

  const onScroll = () => {
    const el = scroller.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setReadAll(true);
  };

  React.useEffect(() => {
    // Em telas altas o texto pode caber sem rolagem.
    const el = scroller.current;
    if (doc && el && el.scrollHeight <= el.clientHeight + 24) setReadAll(true);
  }, [doc]);

  const accept = async () => {
    if (!checked || saving) return;
    setSaving(true);
    setError('');
    try {
      const position = await new Promise<GeolocationPosition | null>((resolve) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 2500, maximumAge: 60000 });
      });
      await request('/legal/terms/accept', {
        method: 'POST',
        timeoutMs: 30000,
        body: position ? { latitude: position.coords.latitude, longitude: position.coords.longitude } : {},
      });
      setStatus((s) => ({ ...(s as ConsentStatus), required: false, accepted: true }));
    } catch (err: any) {
      setError(err?.message || 'Não foi possível registrar a assinatura. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (!status?.required) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-900/90 px-3 py-4 backdrop-blur-md sm:px-5">
      <section className="flex max-h-[calc(100vh-32px)] w-full max-w-3xl flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start gap-4 border-b border-slate-100 bg-slate-50 p-5 sm:p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-teal-600 text-white"><FileSignature size={24} /></div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-700">Assinatura eletrônica</p>
            <h2 className="mt-1 text-xl font-black leading-tight text-slate-900 sm:text-2xl">Termo de Uso e Política de Privacidade</h2>
            <p className="mt-1 text-sm text-slate-600">Leia o documento até o final. Ele já está preenchido com os seus dados.</p>
          </div>
        </header>

        <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {!doc && !loadError && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={16} /> Carregando o termo...</div>}
          {loadError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {loadError} <button className="ml-2 font-bold underline" onClick={() => void load()}>Tentar de novo</button>
            </div>
          )}
          {doc && (
            <article className="space-y-4 text-[13px] leading-relaxed text-slate-700">
              <div className="grid gap-2 rounded-xl border border-teal-200 bg-teal-50/60 p-4 text-teal-900 sm:grid-cols-2">
                <p><strong>Assinante:</strong> {doc.signer.name}</p>
                <p><strong>E-mail:</strong> {doc.signer.email}</p>
                <p><strong>CPF:</strong> {maskDocument(doc.signer.cpf)}</p>
                <p><strong>Cargo:</strong> {doc.signer.position || 'não informado'}</p>
                <p className="sm:col-span-2"><strong>Empresa:</strong> {doc.company.legalName || doc.company.name} · {maskDocument(doc.company.document)}</p>
              </div>
              <p className="text-justify">{doc.preamble}</p>
              {doc.sections.map((section) => (
                <div key={section.title}>
                  <h3 className="mb-1 text-sm font-black text-slate-900">{section.title}</h3>
                  {section.clauses.map((clause) => <p key={clause} className="mb-1.5 text-justify">{clause}</p>)}
                </div>
              ))}
              <p className="text-justify">{doc.closing}</p>
              <p className="text-[11px] text-slate-400">Versão {doc.version} · integridade {doc.contentHash.slice(0, 16)}</p>
            </article>
          )}
        </div>

        <footer className="border-t border-slate-200 bg-white p-5 sm:p-6">
          {error && <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}
          <label className={`flex items-start gap-3 rounded-xl border-2 p-4 text-sm font-semibold leading-5 ${readAll ? 'cursor-pointer border-slate-100 bg-slate-50 text-slate-800' : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'}`}>
            <input className="mt-0.5 h-5 w-5 shrink-0 accent-teal-600" type="checkbox" disabled={!readAll || !doc} checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span>{readAll ? 'Li e concordo com o Termo de Uso e a Política de Privacidade e assino eletronicamente com minhas credenciais. O aceite registra data, hora, IP e dispositivo.' : 'Role o documento até o final para liberar a assinatura.'}</span>
          </label>
          <div className="mt-4 flex justify-end">
            <button onClick={accept} disabled={!checked || saving || !doc} className="flex h-12 items-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <><Loader2 className="animate-spin" size={16} /> Assinando...</> : 'Assinar termo'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
