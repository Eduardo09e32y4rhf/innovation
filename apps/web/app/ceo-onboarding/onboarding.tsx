'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { useAuth } from '@/app/contexts/AuthContext';
import { API_URL, ApiError, request } from '@/app/lib/api';
import { readAuthSession } from '@/app/lib/auth-session';
import { STEPS, isValidCpf, stepIndex, type OnboardingState } from './steps';

type ContractInfo = { id: string; version: string; signatureCount: number; signedPdfIntegrity: string | null; signedPdfDocumentId: string | null; signedAt: string | null } | null;
type StatePayload = { state: OnboardingState; profile: { legalName?: string | null; cpf?: string | null } | null; contract: ContractInfo };

async function downloadPdf(path: string, fallback: string) {
  const token = readAuthSession().token;
  const response = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  if (!response.ok) throw new Error('Não foi possível baixar o arquivo.');
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = fallback;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  URL.revokeObjectURL(url);
}

const errorText = (cause: unknown, fallback: string) => (cause instanceof ApiError || cause instanceof Error ? cause.message : fallback);

export function CeoOnboarding() {
  return <ProtectedRoute><Content /></ProtectedRoute>;
}

function Content() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<StatePayload | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ legalName: '', cpf: '', birthDate: '' });

  const load = useCallback(async () => {
    setLoadError('');
    try { setData(await request<StatePayload>('/ceo-onboarding/state')); }
    catch (cause) { setLoadError(errorText(cause, 'Não foi possível carregar seu onboarding.')); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (data?.state === 'ACTIVE') router.replace('/'); }, [data?.state, router]);

  async function saveProfile() {
    if (!isValidCpf(form.cpf)) { setMessage({ ok: false, text: 'Informe um CPF válido.' }); return; }
    setBusy(true); setMessage(null);
    try { await request('/ceo-onboarding/profile', { method: 'PATCH', body: { legalName: form.legalName.trim(), cpf: form.cpf, birthDate: form.birthDate } }); await load(); }
    catch (cause) { setMessage({ ok: false, text: errorText(cause, 'Não foi possível salvar.') }); }
    finally { setBusy(false); }
  }

  async function upload(file: File | null) {
    if (!file || !data?.contract) return;
    setBusy(true); setMessage({ ok: true, text: 'Enviando e conferindo o arquivo…' });
    try {
      const body = new FormData(); body.append('file', file);
      const result = await request<{ signatureCount: number; awaitingOtherParty: boolean }>(`/ceo-onboarding/contract/${data.contract.id}/signed`, { method: 'POST', body });
      setMessage({ ok: true, text: result.awaitingOtherParty ? 'Assinatura recebida. Falta a assinatura da outra parte; depois o DEV confirma e seu acesso é liberado.' : 'Assinaturas recebidas. Aguarde a confirmação do DEV para liberar seu acesso.' });
      await load();
    } catch (cause) { setMessage({ ok: false, text: errorText(cause, 'Não foi possível enviar o arquivo.') }); }
    finally { setBusy(false); }
  }

  const current = stepIndex(data?.state);
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-semibold">Primeiro acesso do CEO</h1>
      <p className="mt-1 text-sm text-fg-sub">{user?.name ? `Olá, ${user.name.split(' ')[0]}. ` : ''}Conclua as etapas abaixo para liberar o seu acesso.</p>

      <ol className="mt-6 grid gap-2 sm:grid-cols-4" aria-label="Etapas">
        {STEPS.map((step, index) => (
          <li key={step.key} aria-current={index === current ? 'step' : undefined} className={`rounded-lg border p-3 text-sm ${index === current ? 'border-purple-500 font-semibold' : index < current ? 'border-emerald-400' : 'border-border text-fg-sub'}`}>
            <span className="block text-xs">{index < current ? 'Concluída' : index === current ? 'Etapa atual' : 'A fazer'}</span>{step.label}
          </li>
        ))}
      </ol>

      {loadError && <div role="alert" className="mt-6 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900"><p>{loadError}</p><button type="button" onClick={() => void load()} className="mt-3 min-h-11 rounded-lg border border-rose-400 px-4 font-medium">Tentar novamente</button></div>}
      {!data && !loadError && <p role="status" className="mt-6 text-sm">Carregando…</p>}

      {data && (data.state === 'PASSWORD_CHANGE' || data.state === 'INVITED') && <p className="mt-6 rounded-xl border border-border p-4 text-sm">Troque a senha provisória para continuar. Ao entrar com ela, o sistema pede a nova senha.</p>}

      {data && (data.state === 'PROFILE_REQUIRED' || data.state === 'FACE_ENROLLMENT') && (
        <section className="mt-6 space-y-3 rounded-xl border border-border p-4" aria-labelledby="profile-title">
          <h2 id="profile-title" className="font-semibold">Seus dados</h2>
          <p className="text-xs text-fg-sub">Usados somente para identificar você no contrato. Só você preenche esta etapa.</p>
          <label className="block text-sm font-medium" htmlFor="legalName">Nome completo</label>
          <input id="legalName" className="input-v2 w-full text-base sm:text-sm" autoComplete="name" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
          <label className="block text-sm font-medium" htmlFor="cpf">CPF</label>
          <input id="cpf" className="input-v2 w-full text-base sm:text-sm" inputMode="numeric" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
          <label className="block text-sm font-medium" htmlFor="birth">Data de nascimento</label>
          <input id="birth" type="date" className="input-v2 w-full text-base sm:text-sm" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          <button type="button" disabled={busy || form.legalName.trim().length < 2 || !form.birthDate} onClick={saveProfile} className="min-h-11 rounded-lg bg-purple-600 px-4 font-medium text-white disabled:opacity-50">Salvar e continuar</button>
        </section>
      )}

      {data?.state === 'CONTRACT_PENDING' && (
        <section className="mt-6 space-y-4 rounded-xl border border-border p-4" aria-labelledby="contract-title">
          <h2 id="contract-title" className="font-semibold">Contrato</h2>
          {!data.contract ? <p className="text-sm">O contrato ainda não foi emitido pelo DEV. Você será avisado nas notificações.</p> : (
            <>
              <p className="text-sm">Versão {data.contract.version}. Assinaturas recebidas: <strong>{data.contract.signatureCount}</strong> de 2.</p>
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                <li>Baixe o PDF e leia com atenção.</li>
                <li>Assine em <a className="underline" href="https://assinador.iti.br" target="_blank" rel="noreferrer noopener">assinador.iti.br</a> com a sua conta gov.br (nível prata ou ouro). É gratuito, e o próprio gov.br confirma sua identidade.</li>
                <li>Envie aqui o PDF assinado. A outra parte (DEV) assina o mesmo arquivo.</li>
                <li>O DEV valida as assinaturas no validador oficial e confirma. Só então seu acesso é liberado.</li>
              </ol>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => downloadPdf(`/ceo-onboarding/contract/${data.contract!.id}/pdf`, `contrato-ceo-${data.contract!.version}.pdf`).catch((e) => setMessage({ ok: false, text: errorText(e, 'Falha ao baixar.') }))} className="min-h-11 rounded-lg border border-border px-4 font-medium">Baixar contrato</button>
                {data.contract.signedPdfDocumentId && <button type="button" onClick={() => downloadPdf(`/ceo-onboarding/contract/${data.contract!.id}/signed-pdf`, `contrato-ceo-${data.contract!.version}-assinado.pdf`).catch((e) => setMessage({ ok: false, text: errorText(e, 'Falha ao baixar.') }))} className="min-h-11 rounded-lg border border-border px-4 font-medium">Baixar versão assinada</button>}
              </div>
              <div className="space-y-2">
                <label htmlFor="signed" className="block text-sm font-medium">Enviar PDF assinado (até 10 MB)</label>
                <input id="signed" type="file" accept="application/pdf,.pdf" disabled={busy} className="block w-full min-h-11 text-base sm:text-sm" onChange={(e) => { const f = e.target.files?.[0] ?? null; e.target.value = ''; void upload(f); }} />
              </div>
              <p className="text-xs text-fg-sub">A assinatura eletrônica avançada do gov.br tem validade jurídica (Lei 14.063/2020). Para efeitos societários perante a Junta Comercial, consulte seu advogado.</p>
            </>
          )}
        </section>
      )}

      {message && <p role={message.ok ? 'status' : 'alert'} className={`mt-4 text-sm ${message.ok ? 'text-fg-sub' : 'text-rose-800'}`}>{message.text}</p>}
    </main>
  );
}