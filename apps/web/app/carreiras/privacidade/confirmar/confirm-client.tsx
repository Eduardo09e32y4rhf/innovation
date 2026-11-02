'use client';

import Link from 'next/link';
import { useState } from 'react';
import { confirmPrivacyRequest } from '../../_lib/public-jobs';

/** Passo 2 do pedido LGPD: o titular confirma (clique explicito, para que leitores de e-mail nao gastem o link). */
export function ConfirmClient({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function confirm() {
    setState('busy');
    try {
      const result = await confirmPrivacyRequest(token);
      setMessage(`Pedido confirmado. A empresa responde por e-mail em até ${result.deadlineDays} dias.`);
      setState('done');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Link inválido ou expirado. Envie o pedido novamente.');
      setState('error');
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-5 px-4 py-10">
      <h1 className="text-2xl font-semibold">Confirmar pedido</h1>
      {!token ? (
        <p role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800">Link incompleto. Abra o link do e-mail novamente.</p>
      ) : state === 'done' ? (
        <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">{message}</p>
      ) : (
        <div className="card-v2 space-y-4 p-5">
          {state === 'error' && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{message}</p>}
          <p className="text-sm">Confirme que foi você quem fez o pedido de privacidade. Sem esta confirmação, nada é enviado à empresa.</p>
          <button type="button" className="btn btn-primary min-h-11 w-full" disabled={state === 'busy'} onClick={confirm}>{state === 'busy' ? 'Confirmando…' : 'Confirmar meu pedido'}</button>
        </div>
      )}
      <Link className="text-sm underline" href="/carreiras/privacidade">Voltar</Link>
    </main>
  );
}
