'use client';

import { useState, type FormEvent } from 'react';
import { candidateApi, type CandidateProfile } from '../../_lib/candidate-api';

/** RS-C-09: aviso fixo enquanto o e-mail da conta nao foi confirmado (codigo de 6 digitos enviado por e-mail). */
export function VerifyEmailBanner({ profile, onVerified }: { profile: CandidateProfile; onVerified: (profile: CandidateProfile) => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (profile.emailVerified) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) { setError('Digite os 6 números do código.'); return; }
    setBusy(true); setError(''); setInfo('');
    try { onVerified(await candidateApi.verifyEmail(code)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível confirmar. Tente novamente.'); }
    finally { setBusy(false); }
  }

  async function resend() {
    setBusy(true); setError(''); setInfo('');
    try { await candidateApi.resendVerification(); setInfo('Enviamos um novo código. Confira também a caixa de spam.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível reenviar agora.'); }
    finally { setBusy(false); }
  }

  return (
    <section aria-labelledby="verify-title" className="mx-auto mt-4 max-w-[1200px] px-4 sm:px-9">
      <form onSubmit={submit} className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
        <h2 id="verify-title" className="text-base font-semibold">Confirme seu e-mail</h2>
        <p className="text-sm">Enviamos um código de 6 dígitos para <strong>{profile.email}</strong>. Sem a confirmação você não consegue reutilizar o perfil nas candidaturas.</p>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-sm text-rose-800">{error}</p>}
        {info && <p role="status" className="text-sm text-emerald-900">{info}</p>}
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-sm font-medium">Código
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input-v2 mt-1 min-h-11 w-40 text-center tracking-widest" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} />
          </label>
          <button type="submit" className="btn btn-primary min-h-11" disabled={busy}>{busy ? 'Aguarde…' : 'Confirmar e-mail'}</button>
          <button type="button" className="btn btn-outline min-h-11" disabled={busy} onClick={resend}>Reenviar código</button>
        </div>
      </form>
    </section>
  );
}
