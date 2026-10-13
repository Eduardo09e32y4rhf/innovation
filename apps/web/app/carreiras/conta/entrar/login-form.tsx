'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/app/components/ui/button';
import { candidateApi, getCandidateToken, setCandidateToken } from '../../_lib/candidate-api';

/** Só volta para caminhos do próprio portal (evita redirecionamento aberto). */
function safeNext(value: string | null) {
  return value && /^\/carreiras(\/|$)/.test(value) && !value.startsWith('//') ? value : '/carreiras/conta';
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => { if (getCandidateToken()) router.replace(next); }, [router, next]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Informe um e-mail válido.'); return; }
    setBusy(true); setError('');
    try { await candidateApi.requestCode(email.trim().toLowerCase()); setStep('code'); setCode(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível enviar o código.'); }
    finally { setBusy(false); }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!/^\d{6}$/.test(code)) { setError('O código tem 6 números.'); return; }
    setBusy(true); setError('');
    try {
      const result = await candidateApi.verify(email.trim().toLowerCase(), code);
      setCandidateToken(result.token);
      router.replace(next);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Código inválido ou expirado.'); }
    finally { setBusy(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f5fb] px-4 py-10 text-[#17122b]">
      <div className="w-full max-w-md space-y-6 rounded-[20px] border border-[#e4dff0] bg-white p-8 shadow-[0_12px_32px_#1e114514]">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Área do candidato</h1>
          <p className="text-sm leading-6 text-[#5b5473]">Entre com seu e-mail para acompanhar suas candidaturas e se candidatar com os dados já salvos. Sem senha: enviamos um código.</p>
        </div>
        {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-800">{error}</p>}
        {step === 'email' ? (
          <form onSubmit={sendCode} className="space-y-4" noValidate>
            <label className="block space-y-1.5"><span className="text-sm font-semibold">E-mail</span>
              <input type="email" autoComplete="email" inputMode="email" autoFocus required maxLength={240} className="input-v2 min-h-12 text-base" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <Button type="submit" className="w-full !bg-[#6d28d9] hover:!bg-[#5b21b6]" isLoading={busy}>Enviar código</Button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4" noValidate>
            <p className="text-sm text-[#5b5473]">Enviamos um código de 6 números para <strong>{email.trim().toLowerCase()}</strong>. Ele vale por 10 minutos.</p>
            <label className="block space-y-1.5"><span className="text-sm font-semibold">Código</span>
              <input autoComplete="one-time-code" inputMode="numeric" pattern="\d{6}" maxLength={6} autoFocus className="input-v2 min-h-12 text-center text-2xl font-bold tracking-[0.4em]" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
            </label>
            <Button type="submit" className="w-full !bg-[#6d28d9] hover:!bg-[#5b21b6]" isLoading={busy}>Entrar</Button>
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <button type="button" className="min-h-11 font-semibold text-[#6d28d9] underline" onClick={() => void sendCode()}>Enviar outro código</button>
              <button type="button" className="min-h-11 font-semibold text-[#6d28d9] underline" onClick={() => { setStep('email'); setError(''); }}>Trocar e-mail</button>
            </div>
          </form>
        )}
        <p className="text-xs leading-5 text-[#5b5473]">Ao entrar, você concorda com os <Link className="underline" href="/carreiras/privacidade">termos de privacidade</Link> do portal. Não pedimos RG, PIS nem dados bancários.</p>
      </div>
    </main>
  );
}
