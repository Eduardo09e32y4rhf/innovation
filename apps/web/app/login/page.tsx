"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthSplitLayout } from '@/app/components/auth-split-layout';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { api } from '@/app/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login, logout, loading, error, isAuthenticated, company, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [didSubmit, setDidSubmit] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);

  useEffect(() => {
    // Se o usuário navegou até /login manualmente sem ter submetido o formulário, limpamos sessões antigas
    if (!didSubmit && isAuthenticated) {
      logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Só redirecionamos se o usuário tiver preenchido o form e clicado em "Acessar Plataforma"
    if (didSubmit && isAuthenticated && company) {
      const slug = (company as any).slug || company.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || company.id;
      const isDev = user?.profile?.toUpperCase() === 'DEV' || user?.role?.toUpperCase() === 'DEV';
      const mustPay =
        !isDev &&
        (user?.companyStatus === 'SUSPENDED' ||
          user?.companyStatus === 'CANCELLED' ||
          user?.billingStatus === 'CANCELED' ||
          user?.billingStatus === 'PENDING_PAYMENT');
      router.push(mustPay ? `/${slug}/fatura-pendente?autoCheckout=1` : `/${slug}/dashboard`);
    }
  }, [didSubmit, isAuthenticated, company, user, router]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError('');
    setForgotSuccess('');
    setResetToken('');

    if (forgotPassword) {
      if (!email.trim()) {
        setLocalError('Informe o e-mail para recuperar a senha.');
        return;
      }
      try {
        const res = await api.auth.requestPasswordReset(email.trim());
        if (res.demoCode) {
          setForgotSuccess(`Para testar (DEV), o código é: ${res.demoCode}`);
        } else {
          setForgotSuccess('Solicitação enviada! Peça o código de liberação ao seu Gestor/RH.');
        }
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : 'Não foi possível solicitar a recuperação.');
      }
      return;
    }

    if (!email.trim() || !password) {
      setLocalError('Informe o e-mail e a senha.');
      return;
    }

    try {
      setDidSubmit(true);
      await login(email.trim(), password);
      // O useEffect lidará com o redirecionamento assim que isAuthenticated for true
    } catch (err) {
      setDidSubmit(false);
      setLocalError(err instanceof Error ? err.message : 'Não foi possível entrar agora. Tente novamente.');
    }
  };

  return (
    <AuthSplitLayout title={forgotPassword ? 'Recuperar Acesso' : 'Entrar na Plataforma'} subtitle={forgotPassword ? 'Enviaremos as instruções para seu e-mail cadastrado.' : 'Digite suas credenciais corporativas abaixo.'}>
      <form onSubmit={handleLogin} className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <Link href="/" className="transition-colors hover:text-brand-600">
            Voltar para o site
          </Link>
          <Link href="/cadastro" className="transition-colors hover:text-brand-600">
            Criar minha empresa
          </Link>
        </div>

        {(localError || error) && (
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 px-4 py-3">
            <AlertCircle size={18} className="text-[var(--color-danger)] shrink-0" />
            <p className="text-sm font-medium text-rose-800">{localError || error}</p>
          </div>
        )}
        
        {forgotSuccess && (
          <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-[var(--color-success)] shrink-0" />
              <p className="text-sm font-medium text-emerald-800">{forgotSuccess}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}
              className="mt-1 block rounded-lg bg-emerald-100 px-3 py-2 text-center text-xs font-bold text-emerald-700 hover:bg-emerald-200"
            >
              Já tenho o código
            </button>
          </div>
        )}

        <div className="group relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400 transition-colors group-focus-within:text-[var(--color-brand)]">
            <Mail size={18} />
          </div>
          <input
            type="email"
            placeholder="E-mail corporativo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
            className="form-control pl-11 h-12 text-sm"
          />
        </div>

        {!forgotPassword && (
          <div className="group relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400 transition-colors group-focus-within:text-[var(--color-brand)]">
              <Lock size={18} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              className="form-control pl-11 pr-12 h-12 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              className="absolute inset-y-0 right-0 flex items-center px-4 text-zinc-400 hover:text-zinc-600 focus-visible:outline-none"
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mt-1">
          {!forgotPassword && (
            <button
              type="button"
              onClick={() => { setForgotPassword(true); setLocalError(''); setForgotSuccess(''); }}
              className="text-xs font-bold text-zinc-500 hover:text-[var(--color-brand)] transition-colors"
            >
              Esqueci a senha
            </button>
          )}
          {forgotPassword && (
            <button
              type="button"
              onClick={() => { setForgotPassword(false); setLocalError(''); setForgotSuccess(''); }}
              className="text-xs font-bold text-zinc-500 hover:text-[var(--color-brand)] transition-colors"
            >
              Voltar ao login
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary h-12 text-sm w-full mt-2 group"
        >
          {loading ? 'Processando...' : forgotPassword ? 'Solicitar Código' : 'Acessar Plataforma'}
          {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
        </button>

        {!forgotPassword && (
          <p className="mt-4 text-center text-xs font-medium text-zinc-500">
            Ainda não tem uma conta?{' '}
            <Link href="/cadastro" className="font-bold text-[var(--color-brand)] hover:text-[var(--color-brand-700)]">
              Criar agora
            </Link>
          </p>
        )}

        <div className="mt-6 flex flex-col items-center border-t border-zinc-100 pt-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHelpMenu(!showHelpMenu)}
              className="flex items-center gap-2 rounded-full bg-zinc-100 px-3.5 py-1.5 text-xs font-bold text-zinc-600 transition-all hover:bg-purple-50 hover:text-[var(--color-brand)]"
              title="Reportar problema"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-brand)] text-white font-black text-[11px]">!</span>
              <span>Reportar problema</span>
            </button>

            {showHelpMenu && (
              <div className="absolute bottom-11 left-1/2 -translate-x-1/2 w-64 surface p-2 z-50 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-1 px-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Como podemos ajudar?</span>
                  <button
                    type="button"
                    onClick={() => setShowHelpMenu(false)}
                    className="text-zinc-400 hover:text-zinc-600"
                  >
                    <X size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => { setShowHelpMenu(false); router.push('/suporte?category=LOGIN_ISSUE&subject=Não%20consigo%20entrar'); }}
                  className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-left text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <AlertCircle size={15} className="text-amber-500 shrink-0" />
                  <span>Não consigo entrar</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setShowHelpMenu(false); setForgotPassword(true); setLocalError(''); setForgotSuccess(''); }}
                  className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-left text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <Lock size={15} className="text-[var(--color-brand)] shrink-0" />
                  <span>Esqueci minha senha</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setShowHelpMenu(false); router.push('/suporte?category=BUG&subject=Erro%20na%20página'); }}
                  className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-left text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <AlertCircle size={15} className="text-rose-500 shrink-0" />
                  <span>Erro na página</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setShowHelpMenu(false); router.push('/suporte?category=PERFORMANCE&subject=Sistema%20indisponível'); }}
                  className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-left text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <ShieldCheck size={15} className="text-purple-500 shrink-0" />
                  <span>Sistema indisponível</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setShowHelpMenu(false); router.push('/suporte?category=OTHER&subject=Outro%20problema'); }}
                  className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-left text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  <ExternalLink size={15} className="text-teal-500 shrink-0" />
                  <span>Outro problema</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
