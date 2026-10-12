'use client';

import { FormEvent, useState } from 'react';
import { sendPrivacyRequest } from '../_lib/public-jobs';

const TYPES = [['ACCESS', 'Quero uma cópia dos meus dados'], ['CORRECTION', 'Quero corrigir meus dados'], ['DELETION', 'Quero excluir meus dados']] as const;

/** Direitos do titular (LGPD art. 18) para quem se candidatou. A resposta é sempre a mesma, exista ou não candidatura com este e-mail. */
export function PrivacyRequestForm() {
  const [email, setEmail] = useState('');
  const [type, setType] = useState<(typeof TYPES)[number][0]>('ACCESS');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await sendPrivacyRequest({ email: email.trim(), type, message: message.trim() || undefined }); setSent(true); }
    catch { setError('Não foi possível enviar agora. Tente novamente em instantes.'); }
    finally { setBusy(false); }
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-5 px-4 py-10">
      <h1 className="text-2xl font-semibold">Meus dados</h1>
      <p className="text-sm text-fg-mut">Use o mesmo e-mail da candidatura. A empresa responde por e-mail dentro do prazo da LGPD.</p>
      {sent ? (
        <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">Pedido recebido. Se existir candidatura com este e-mail, a empresa vai responder por lá.</p>
      ) : (
        <form onSubmit={submit} className="card-v2 space-y-4 p-5">
          {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          <label className="block space-y-1"><span className="text-sm font-medium">E-mail da candidatura</span><input type="email" required className="input-v2 min-h-11 w-full" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <fieldset className="space-y-2"><legend className="text-sm font-medium">O que você precisa?</legend>
            {TYPES.map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm"><input type="radio" name="type" checked={type === value} onChange={() => setType(value)} />{label}</label>)}
          </fieldset>
          <label className="block space-y-1"><span className="text-sm font-medium">Detalhes (opcional)</span><textarea className="input-v2 min-h-24 w-full" maxLength={1500} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? 'Enviando…' : 'Enviar pedido'}</button>
        </form>
      )}
    </main>
  );
}