'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState, type FormEvent } from 'react';
import { AuthAlert, AuthShell, authButton, authInput, authLink } from '@/app/_components/auth/auth-shell';
import { PasswordField, isStrongPassword } from '@/app/_components/auth/password-field';
import { api } from '@/app/lib/api';

type Step = 'identify' | 'password' | 'done';

function ResetForm() {
  const params = useSearchParams();
  const directToken = params.get('token') ?? '';
  const [step, setStep] = useState<Step>(directToken ? 'password' : 'identify');
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [code, setCode] = useState('');
  const [cpf, setCpf] = useState('');
  const [registration, setRegistration] = useState('');
  const [token, setToken] = useState(directToken);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);

  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true; setLoading(true); setError('');
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível concluir. Tente novamente.'); }
    finally { pending.current = false; setLoading(false); }
  }

  const validate = (event: FormEvent) => {
    event.preventDefault();
    return run(async () => {
      const result = await api.auth.validateResetCode(email.trim(), code.trim().toUpperCase(), cpf, registration.trim());
      if (!result.valid || !result.resetToken) throw new Error('Não foi possível validar os dados. Confira o código com o responsável.');
      setToken(result.resetToken); setStep('password');
    });
  };

  const reset = (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) return setError('As senhas não conferem.');
    if (!isStrongPassword(password)) return setError('A senha não atende a todos os requisitos.');
    return run(async () => {
      const result = await api.auth.resetPassword(token, password);
      if (!result.changed) throw new Error('A alteração da senha não foi confirmada.');
      setPassword(''); setConfirm(''); setToken(''); setStep('done');
    });
  };

  const title = step === 'done' ? 'Senha redefinida' : step === 'password' ? 'Crie a nova senha' : 'Redefinir senha';
  const subtitle = step === 'done' ? 'Sua conta já está desbloqueada.' : step === 'password' ? 'Escolha uma senha forte e diferente das anteriores.' : 'Use o código de 6 caracteres fornecido pelo seu gestor, RH ou administrador.';

  return (
    <AuthShell title={title} subtitle={subtitle} footer={<Link href="/login" className="font-semibold text-white underline">Voltar ao login</Link>}>
      {step === 'done' && (
        <div className="space-y-4">
          <AuthAlert kind="success">Senha alterada com sucesso. Entre com a nova senha.</AuthAlert>
          <Link href="/login" className={authButton}>Ir para o login</Link>
        </div>
      )}

      {step === 'identify' && (
        <form onSubmit={validate} className="space-y-4">
          <div>
            <label htmlFor="rp-email" className="mb-1.5 block text-sm font-medium text-zinc-700">E-mail</label>
            <input id="rp-email" required type="email" autoComplete="email" disabled={loading} className={authInput} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="rp-code" className="mb-1.5 block text-sm font-medium text-zinc-700">Código de recuperação</label>
            <input id="rp-code" required minLength={6} maxLength={6} autoComplete="one-time-code" disabled={loading} className={`${authInput} font-mono uppercase tracking-[0.3em]`} placeholder="A1B2C3" value={code} onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())} />
          </div>
          <details className="rounded-lg border border-zinc-200 p-3 text-sm">
            <summary className="cursor-pointer font-medium text-zinc-700">Sou funcionário (confirmar identidade)</summary>
            <p className="mt-2 text-xs text-zinc-500">Preencha se você tem ficha de funcionário. Administradores e contas sem ficha podem pular.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="rp-cpf" className="mb-1.5 block text-xs font-medium text-zinc-700">3 primeiros dígitos do CPF</label>
                <input id="rp-cpf" inputMode="numeric" maxLength={3} autoComplete="off" disabled={loading} className={authInput} value={cpf} onChange={(e) => setCpf(e.target.value.replace(/\D/g, '').slice(0, 3))} />
              </div>
              <div>
                <label htmlFor="rp-reg" className="mb-1.5 block text-xs font-medium text-zinc-700">Matrícula</label>
                <input id="rp-reg" autoComplete="off" disabled={loading} className={authInput} value={registration} onChange={(e) => setRegistration(e.target.value)} />
              </div>
            </div>
          </details>
          {error && <AuthAlert>{error}</AuthAlert>}
          <button type="submit" disabled={loading || !email || code.length !== 6} className={authButton}>{loading ? 'Validando…' : 'Continuar'}</button>
          <p className="text-center text-sm text-zinc-600">Não tem o código? <Link href="/esqueci-senha" className={authLink}>Solicitar agora</Link></p>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={reset} className="space-y-4">
          <PasswordField label="Nova senha" value={password} onChange={setPassword} autoComplete="new-password" disabled={loading} showRules />
          <PasswordField label="Confirmar nova senha" value={confirm} onChange={setConfirm} autoComplete="new-password" disabled={loading} />
          {confirm && confirm !== password && <p className="text-xs text-rose-600">As senhas não conferem.</p>}
          {error && <AuthAlert>{error}</AuthAlert>}
          <button type="submit" disabled={loading || !isStrongPassword(password) || password !== confirm} className={authButton}>{loading ? 'Salvando…' : 'Salvar nova senha'}</button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<p role="status" className="p-6 text-center">Carregando…</p>}><ResetForm /></Suspense>;
}
