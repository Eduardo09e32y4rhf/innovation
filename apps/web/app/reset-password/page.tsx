'use client';

import Link from 'next/link';
import { Suspense, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { PageHeader } from '@/app/components/ui/page-header';
import { api } from '@/app/lib/api';

export default function ResetPasswordPage() {
  return <Suspense fallback={<p role="status" className="p-6">Carregando recuperação...</p>}><ResetPasswordForm /></Suspense>;
}
function ResetPasswordForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [code, setCode] = useState('');
  const [cpf, setCpf] = useState('');
  const [registration, setRegistration] = useState('');
  const [token, setToken] = useState(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const pending = useRef(false);
  async function validate(event: FormEvent) {
    event.preventDefault(); if (pending.current) return;
    pending.current = true; setLoading(true); setError('');
    try {
      const result = await api.auth.validateResetCode(email.trim(), code.trim().toUpperCase(), cpf, registration.trim());
      if (!result.valid || !result.resetToken) throw new Error('Não foi possível validar os dados. Confira o código com o RH.');
      setToken(result.resetToken); setMessage('Identidade validada. Crie a nova senha.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível validar sua identidade.'); }
    finally { pending.current = false; setLoading(false); }
  }
  async function reset(event: FormEvent) {
    event.preventDefault(); if (pending.current || done) return; setError('');
    if (password !== confirm) { setError('As senhas não conferem.'); return; }
    if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError('Use pelo menos 10 caracteres, com maiúscula, minúscula, número e símbolo.'); return;
    }
    pending.current = true; setLoading(true);
    try {
      const result = await api.auth.resetPassword(token, password);
      if (!result.changed) throw new Error('A alteração da senha não foi confirmada.');
      setDone(true); setToken(''); setPassword(''); setConfirm(''); setMessage('Senha redefinida. Acesse sua conta com a nova senha.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível redefinir a senha. Solicite um novo código se estiver expirado.'); }
    finally { pending.current = false; setLoading(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-8 text-fg"><div className="card-v2 w-full max-w-md space-y-5 p-5 sm:p-8">
    <Link className="text-lg font-semibold text-brand" href="/">Innovation RH</Link>
    <PageHeader title={done ? 'Senha redefinida' : token ? 'Criar nova senha' : 'Validar identidade'} subtitle={token ? 'A nova senha deve respeitar a política de segurança.' : 'Use o código fornecido pelo gestor ou RH e seus dados de identificação.'} />
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {!done && (!token ? <form onSubmit={validate} className="space-y-4"><fieldset disabled={loading} className="space-y-4">
      <legend className="sr-only">Validação de identidade</legend>
      <label className="block space-y-1"><span className="text-sm font-medium">E-mail corporativo</span><input required type="email" autoComplete="email" className="input-v2 text-base" value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label className="block space-y-1"><span className="text-sm font-medium">Código do gestor (6 caracteres)</span><input required minLength={6} maxLength={6} autoComplete="one-time-code" className="input-v2 text-base" value={code} onChange={e => setCode(e.target.value.toUpperCase())} /></label>
      <label className="block space-y-1"><span className="text-sm font-medium">Primeiros 3 dígitos do CPF</span><input required inputMode="numeric" pattern="[0-9]{3}" maxLength={3} autoComplete="off" className="input-v2 text-base" value={cpf} onChange={e => setCpf(e.target.value.replace(/\D/g, '').slice(0, 3))} /></label>
      <label className="block space-y-1"><span className="text-sm font-medium">Matrícula</span><input required autoComplete="off" className="input-v2 text-base" value={registration} onChange={e => setRegistration(e.target.value)} /></label>
    </fieldset><Button type="submit" isLoading={loading} className="w-full">Validar identidade</Button></form>
      : <form onSubmit={reset} className="space-y-4">
        <p id="reset-password-help" className="text-sm text-fg-mut">Use pelo menos 10 caracteres, com letra maiúscula, minúscula, número e símbolo. Não reutilize senhas anteriores.</p>
        <label className="block space-y-1"><span className="text-sm font-medium">Nova senha</span><input required minLength={10} type={showPassword ? 'text' : 'password'} autoComplete="new-password" aria-describedby="reset-password-help" disabled={loading} className="input-v2 text-base" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <Button type="button" variant="ghost" aria-pressed={showPassword} disabled={loading} onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}</Button>
        <label className="block space-y-1"><span className="text-sm font-medium">Confirmar nova senha</span><input required minLength={10} type={showConfirm ? 'text' : 'password'} autoComplete="new-password" disabled={loading} className="input-v2 text-base" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
        <Button type="button" variant="ghost" aria-pressed={showConfirm} disabled={loading} onClick={() => setShowConfirm(value => !value)}>{showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}</Button>
        <Button type="submit" className="w-full" isLoading={loading}>Salvar nova senha</Button>
      </form>)}
    <Link className="btn btn-outline w-full" href="/login">Voltar ao login</Link>
    {!done && <Link className="btn btn-ghost w-full" href="/esqueci-senha">Solicitar novo código</Link>}
  </div></main>;
}
