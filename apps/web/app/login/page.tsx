'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { PageHeader } from '@/app/components/ui/page-header';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, logout, isAuthenticated, company, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [didSubmit, setDidSubmit] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const slug = company?.slug || company?.id || user?.companyId;
  const role = (user?.profile ?? user?.role ?? '').toUpperCase();
  const mustPay = role !== 'DEV' && (user?.companyStatus === 'SUSPENDED' || user?.companyStatus === 'CANCELLED' || user?.billingStatus === 'CANCELED' || user?.billingStatus === 'PENDING_PAYMENT');
  function destination() {
    if (!slug) return '/login';
    if (mustPay) return '/' + encodeURIComponent(slug) + '/fatura-pendente?autoCheckout=1';
    const base = '/' + encodeURIComponent(slug);
    const requested = new URLSearchParams(window.location.search).get('next') || new URLSearchParams(window.location.search).get('returnTo');
    if (requested && !requested.includes('\\') && !/[\u0000-\u001f]/.test(requested)) {
      try {
        const url = new URL(requested, window.location.origin);
        if (url.origin === window.location.origin && [base + '/dashboard', base + '/portal'].some(path => url.pathname === path || url.pathname.startsWith(path + '/')))
          return url.pathname + url.search + url.hash;
      } catch { /* Use the session destination. */ }
    }
    return base + '/dashboard';
  }
  useEffect(() => {
    if (didSubmit && isAuthenticated && company) router.replace(destination());
    // The session decides the tenant and billing destination.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [didSubmit, isAuthenticated, company, user, router]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setLoading(true); setError('');
    try { setDidSubmit(true); await login(email.trim(), password); }
    catch (cause) { setDidSubmit(false); setError(cause instanceof Error ? cause.message : 'Não foi possível entrar. Verifique os dados e tente novamente.'); }
    finally { pending.current = false; setLoading(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-8 text-fg">
    <div className="card-v2 w-full max-w-md space-y-5 p-5 sm:p-8">
      <Link className="text-lg font-semibold text-brand" href="/">Innovation RH</Link>
      <PageHeader title="Entrar na Plataforma" subtitle="Informe seu e-mail e sua senha para acessar." />
      {isAuthenticated && !didSubmit ? <section className="space-y-3"><p className="text-sm">Sessão ativa de {user?.name}.</p>
        <Button type="button" className="w-full" onClick={() => router.replace(destination())}>Continuar sessão</Button>
        <Button type="button" variant="outline" className="w-full" onClick={() => { logout(); setPassword(''); }}>Entrar com outra conta</Button></section>
        : <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1.5"><span className="text-sm font-medium">E-mail corporativo</span><input type="email" name="email" autoComplete="username" required disabled={loading} className="input-v2 min-h-11 text-base sm:text-sm" placeholder="voce@empresa.com.br" value={email} onChange={e => setEmail(e.target.value)} /></label>
          <div><label htmlFor="login-password" className="mb-1.5 block text-sm font-medium">Senha</label><div className="relative">
            <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required disabled={loading} className="input-v2 min-h-11 pr-14 text-base sm:text-sm" value={password} onChange={e => setPassword(e.target.value)} />
            <Button type="button" variant="icon" disabled={loading} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword} aria-controls="login-password" className="absolute right-0 top-0 h-11 w-11" onClick={() => setShowPassword(current => !current)}>{showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}</Button>
          </div></div>
          <div className="space-y-2"><label className="flex min-h-11 items-center gap-2 text-sm text-fg-mut"><input type="checkbox" disabled aria-describedby="remember-help" className="h-5 w-5" />Lembrar-me</label>
            <p id="remember-help" className="text-xs text-fg-mut">A duração da sessão segue a política atual da plataforma. Esta opção está indisponível.</p>
            <Link href="/esqueci-senha" className="btn btn-ghost">Esqueci a senha</Link></div>
          {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          <Button type="submit" isLoading={loading} className="w-full">Acessar plataforma</Button>
        </form>}
      <p className="text-sm text-fg-mut">Ainda não tem uma conta? <Link className="underline" href="/cadastro">Criar agora</Link></p>
      <Link className="btn btn-ghost" href="/">Voltar para o site</Link>
    </div>
  </main>;
}
