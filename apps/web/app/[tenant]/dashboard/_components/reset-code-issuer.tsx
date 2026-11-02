'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/app/lib/api';

interface IssuedCode { code: string; expiresAt: string }

/**
 * RH/ADMIN geram o codigo de recuperacao de senha de quem pediu. O servidor guarda so o hash:
 * o codigo aparece aqui uma unica vez (nao fica em notificacao, nem em storage do navegador).
 */
export function ResetCodeIssuer({ resetRequestUserId }: { resetRequestUserId: string }) {
  const [issued, setIssued] = useState<IssuedCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function issue() {
    setLoading(true); setError('');
    try { setIssued(await api.auth.issueResetCode(resetRequestUserId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível gerar o código.'); }
    finally { setLoading(false); }
  }

  async function copy() {
    if (!issued) return;
    try { await navigator.clipboard.writeText(issued.code); toast.success('Código copiado.'); }
    catch { toast.info('Seu navegador não permitiu copiar. Selecione o código e copie manualmente.'); }
  }

  if (!issued) {
    return (
      <div className="mt-2 mb-1">
        <button type="button" onClick={(event) => { event.stopPropagation(); void issue(); }} disabled={loading}
          className="inline-flex min-h-9 items-center rounded-md border border-teal-200 bg-teal-50 px-3 text-xs font-bold text-teal-800 transition hover:bg-teal-100 disabled:opacity-60">
          {loading ? 'Gerando…' : 'Gerar código'}
        </button>
        {error && <p role="alert" className="mt-1 text-xs font-semibold text-rose-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-2 mb-1 rounded-lg border border-teal-200 bg-teal-50/60 p-3" role="status">
      <p className="text-[10px] font-bold uppercase text-teal-800">Código de acesso (aparece só agora)</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <code className="select-all rounded bg-white px-2 py-1 text-base font-black tracking-[0.2em] text-slate-900 border border-slate-200">{issued.code}</code>
        <button type="button" onClick={(event) => { event.stopPropagation(); void copy(); }}
          className="inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-teal-700 hover:bg-teal-50">Copiar</button>
      </div>
      <p className="mt-1 text-[11px] text-slate-600">Válido até {new Date(issued.expiresAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}. Entregue por um canal seguro.</p>
    </div>
  );
}
