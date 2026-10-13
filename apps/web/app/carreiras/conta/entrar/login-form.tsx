'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/app/components/ui/button';
import { candidateApi, getCandidateToken, setCandidateToken } from '../../_lib/candidate-api';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

/** Só volta para caminhos do próprio portal (evita redirecionamento aberto). */
function safeNext(value: string | null) {
  return value && /^\/carreiras(\/|$)/.test(value) && !value.startsWith('//') ? value : '/carreiras/conta';
}

const TITLE: Record<Mode, string> = { login: 'Entrar', register: 'Criar minha conta', forgot: 'Esqueci minha senha', reset: 'Criar nova senha' };
const emailOk = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => { if (getCandidateToken()) router.replace(next); }, [router, next]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  function go(target: Mode) { setMode(target); setError(''); setInfo(''); setPassword(''); setCode(''); }

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível concluir. Tente novamente.'); } finally { setBusy(false); }
  }

  const enter = (result: { token: string }) => { setCandidateToken(result.token); router.replace(next); };

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!emailOk(email)) { setError('Informe um e-mail válido.'); return; }
    const mail = email.trim().toLowerCase();
    if (mode === 'login') {
      if (!password) { setError('Informe sua senha.'); return; }
      void run(async () => enter(await candidateApi.login(mail, password)));
    } else if (mode === 'register') {
      if (name.trim().length < 3) { setError('Informe seu nome completo.'); return; }
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) { setError('A senha precisa ter 8 ou mais caracteres, com letras e números.'); return; }
      void run(async () => enter(await candidateApi.register(mail, password, name.trim())));
    } else if (mode === 'forgot') {
      void run(async () => { await candidateApi.forgotPassword(mail); setMode('reset'); setInfo('Se este e-mail tiver conta, enviamos um código de 6 números. Ele vale por 10 minutos.'); });
    } else {
      if (!/^\d{6}$/.test(code)) { setError('O código tem 6 números.'); return; }
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) { setError('A nova senha precisa ter 8 ou mais caracteres, com letras e números.'); return; }
      void run(async () => enter(await candidateApi.resetPassword(mail, code, password)));
    }
  }

  const linkBtn = 'min-h-11 font-semibold text-[#6d28d9] underline';
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f5fb] px-4 py-8 text-[#17122b]">
      <div className="w-full max-w-md space-y-5 rounded-[20px] border border-[#e4dff0] bg-white p-6 shadow-[0_12px_32px_#1e114514] sm:p-8">
        <Link href="/carreiras" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#6d28d9]">← Voltar para as vagas</Link>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{TITLE[mode]}</h1>
          <p className="text-sm leading-6 text-[#5b5473]">
            {mode === 'login' && 'Área exclusiva de candidatos: acompanhe suas candidaturas e se candidate com os dados já salvos.'}
            {mode === 'register' && 'Crie sua conta uma vez e use em todas as vagas. Você escolhe a cada vaga se quer reutilizar seus dados.'}
            {mode === 'forgot' && 'Informe seu e-mail e enviamos um código para criar uma nova senha.'}
            {mode === 'reset' && 'Digite o código que enviamos e escolha a nova senha.'}
          </p>
        </div>
        {info && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{info}</p>}
        {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-800">{error}</p>}
        <form onSubmit={submit} className="space-y-4" noValidate>
          {mode === 'register' && (
            <label className="block space-y-1.5"><span className="text-sm font-semibold">Nome completo</span>
              <input autoComplete="name" required maxLength={120} className="input-v2 min-h-12 text-base" value={name} onChange={(event) => setName(event.target.value)} /></label>
          )}
          <label className="block space-y-1.5"><span className="text-sm font-semibold">E-mail (seu usuário)</span>
            <input type="email" autoComplete="email" inputMode="email" required maxLength={240} className="input-v2 min-h-12 text-base" value={email} onChange={(event) => setEmail(event.target.value)} readOnly={mode === 'reset'} /></label>
          {mode === 'reset' && (
            <label className="block space-y-1.5"><span className="text-sm font-semibold">Código recebido</span>
              <input autoComplete="one-time-code" inputMode="numeric" maxLength={6} className="input-v2 min-h-12 text-center text-2xl font-bold tracking-[0.4em]" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
          )}
          {mode !== 'forgot' && (
            <label className="block space-y-1.5"><span className="text-sm font-semibold">{mode === 'reset' ? 'Nova senha' : 'Senha'}</span>
              <span className="flex gap-2">
                <input type={show ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required maxLength={128} className="input-v2 min-h-12 flex-1 text-base" value={password} onChange={(event) => setPassword(event.target.value)} />
                <button type="button" aria-pressed={show} onClick={() => setShow((value) => !value)} className="min-h-12 rounded-[10px] border border-[#d5cceb] px-3 text-sm font-semibold hover:bg-[#f1ecfb]">{show ? 'Ocultar' : 'Mostrar'}</button>
              </span>
              {mode !== 'login' && <span className="block text-xs text-[#5b5473]">Mínimo de 8 caracteres, com letras e números.</span>}
            </label>
          )}
          <Button type="submit" className="w-full !bg-[#6d28d9] hover:!bg-[#5b21b6]" isLoading={busy}>{mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : mode === 'forgot' ? 'Enviar código' : 'Salvar nova senha'}</Button>
        </form>
        <div className="flex flex-wrap justify-between gap-x-4 text-sm">
          {mode === 'login' && <><button type="button" className={linkBtn} onClick={() => go('register')}>Criar conta</button><button type="button" className={linkBtn} onClick={() => go('forgot')}>Esqueci minha senha</button></>}
          {mode === 'register' && <button type="button" className={linkBtn} onClick={() => go('login')}>Já tenho conta</button>}
          {(mode === 'forgot' || mode === 'reset') && <button type="button" className={linkBtn} onClick={() => go('login')}>Voltar para entrar</button>}
          {mode === 'reset' && <button type="button" className={linkBtn} onClick={() => go('forgot')}>Enviar outro código</button>}
        </div>
        <p className="text-xs leading-5 text-[#5b5473]">Não pedimos RG, PIS nem dados bancários. Veja os <Link className="underline" href="/carreiras/privacidade">termos de privacidade</Link> do portal.</p>
      </div>
    </main>
  );
}
