'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AuthAlert, AuthShell, authButton, authInput, authLink } from '@/app/_components/auth/auth-shell';
import { PasswordField } from '@/app/_components/auth/password-field';
import { MfaRequiredError, useAuth } from '../contexts/AuthContext';

/** Só aceita retorno para dentro do próprio tenant (evita open redirect). */
function safeReturn(base: string): string | null {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('next') || params.get('returnTo');
  if (!requested || requested.includes('\\') || /[\u0000-\u001f]/.test(requested)) return null;
  try {
    const url = new URL(requested, window.location.origin);
    const allowed = [`${base}/dashboard`, `${base}/portal`].some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`));
    return url.origin === window.location.origin && allowed ? url.pathname + url.search + url.hash : null;
  } catch { return null; }
}

export default function LoginPage() {
  const router = useRouter();
  const { login, verifyMfa, logout, isAuthenticated, company, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const pending = useRef(false);

  const slug = company?.slug || company?.id || user?.companyId;
  const role = (user?.profile ?? user?.role ?? '').toUpperCase();
  const mustPay = role !== 'DEV' && (user?.companyStatus === 'SUSPENDED' || user?.companyStatus === 'CANCELLED' || user?.billingStatus === 'CANCELED' || user?.billingStatus === 'PENDING_PAYMENT');

  function destination() {
    if (!slug) return '/login';
    if (user?.mfaEnrollmentRequired) return '/mfa';
    const base = `/${encodeURIComponent(slug)}`;
    if (mustPay) return `${base}/fatura-pendente?autoCheckout=1`;
    return safeReturn(base) ?? `${base}/dashboard`;
  }

  useEffect(() => {
    if (submitted && isAuthenticated && company) router.replace(destination());
    // O destino depende da sessão recém-criada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, isAuthenticated, company, user, router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setLoading(true); setError('');
    try { setSubmitted(true); await login(email.trim(), password); }
    catch (cause) { setSubmitted(false); if (cause instanceof MfaRequiredError) { setMfaToken(cause.mfaToken); setError(''); } else setError(cause instanceof Error ? cause.message : 'Não foi possível entrar. Verifique os dados e tente novamente.'); }
    finally { pending.current = false; setLoading(false); }
  }

  async function submitMfa(event: FormEvent) {
    event.preventDefault(); if (pending.current) return;
    pending.current = true; setLoading(true); setError('');
    try { setSubmitted(true); await verifyMfa(mfaToken, mfaCode.trim(), recoveryCode.trim() || undefined); }
    catch (cause) { setSubmitted(false); setError(cause instanceof Error ? cause.message : 'Código MFA inválido.'); }
    finally { pending.current = false; setLoading(false); }
  }

  const locked = /bloquead/i.test(error);

  return (
    <AuthShell title="Entrar" subtitle="Acesse sua conta Innovation RH Connect."
      footer={<>Ainda não tem conta? <Link href="/cadastro" className="font-semibold text-white underline">Criar minha empresa</Link></>}>
      {mfaToken ? (
        <form onSubmit={submitMfa} className="space-y-4">
          <p className="text-sm text-zinc-600">Abra seu aplicativo autenticador e informe o código de 6 dígitos.</p>
          <input aria-label="Código MFA" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} required={!recoveryCode} className={`${authInput} text-center font-mono text-xl tracking-[0.35em]`} value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <input aria-label="Código de recuperação" placeholder="Ou use um código de recuperação" autoComplete="off" className={authInput} value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} />
          {error && <AuthAlert>{error}</AuthAlert>}
          <button type="submit" disabled={loading || (mfaCode.length !== 6 && !recoveryCode)} className={authButton}>{loading ? 'Validando…' : 'Continuar'}</button>
          <button type="button" className="w-full text-sm text-zinc-600 underline" onClick={() => { setMfaToken(''); setMfaCode(''); setRecoveryCode(''); }}>Voltar</button>
        </form>
      ) : isAuthenticated && !submitted ? (
        <div className="space-y-3">
          <p className="text-center text-sm text-zinc-600">Sessão ativa de <strong>{user?.name}</strong>.</p>
          <button type="button" className={authButton} onClick={() => router.replace(destination())}>Continuar sessão</button>
          <button type="button" className="min-h-11 w-full rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50" onClick={async () => { if (await logout()) setPassword(''); }}>Entrar com outra conta</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate={false}>
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-zinc-700">E-mail</label>
            <input id="login-email" type="email" name="email" autoComplete="username" required disabled={loading} className={authInput} placeholder="voce@empresa.com.br" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <PasswordField label="Senha" name="password" value={password} onChange={setPassword} autoComplete="current-password" disabled={loading} />
          {error && (
            <AuthAlert>
              {error}
              {locked && <> <Link href="/esqueci-senha" className="font-semibold underline">Recuperar acesso</Link></>}
            </AuthAlert>
          )}
          <button type="submit" disabled={loading || !email || !password} className={authButton}>{loading ? 'Entrando…' : 'Entrar'}</button>
          <p className="text-center text-sm"><Link href="/esqueci-senha" className={authLink}>Esqueci minha senha</Link></p>
        </form>
      )}
    </AuthShell>
  );
}
