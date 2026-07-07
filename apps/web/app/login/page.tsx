"use client";

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { api } from '@/app/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, isAuthenticated, company } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    if (isAuthenticated && company) {
      const slug = (company as any).slug || company.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || company.id;
      router.push(`/${slug}/dashboard`);
    }
  }, [isAuthenticated, company, router]);

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
      await login(email.trim(), password);
      // O useEffect lidará com o redirecionamento assim que isAuthenticated for true
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Não foi possível entrar agora. Tente novamente.');
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 font-sans selection:bg-teal-500/30">
      {/* Background Elements (Dark Mode + Neon Glows) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        
        {/* Ambient Teal glow top center */}
        <div className="absolute -top-[20%] left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-[100%] bg-teal-500/10 blur-[120px]" />
        
        {/* Ambient Slate glow bottom */}
        <div className="absolute -bottom-[20%] left-0 h-[500px] w-full bg-slate-900/80 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-[440px] px-6">
        
        {/* Header / Logo */}
        <div className="mb-10 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-[0_0_40px_rgba(45,212,191,0.3)] ring-1 ring-white/10">
            <ShieldCheck size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Innovation RH</h1>
          <p className="mt-2 text-sm font-medium tracking-wide text-teal-400/80 uppercase">Painel de Acesso</p>
        </div>

        {/* Glassmorphism Card */}
        <div className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:border-white/20 hover:bg-slate-900/70 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-backwards">
          
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {/* Header Form */}
            <div className="mb-2">
              <h2 className="text-xl font-bold text-white">
                {forgotPassword ? 'Recuperar Acesso' : 'Entrar na Plataforma'}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {forgotPassword 
                  ? 'Enviaremos as instruções para seu e-mail cadastrado.' 
                  : 'Digite suas credenciais corporativas abaixo.'}
              </p>
            </div>

            {/* Error & Success Messages */}
            {(localError || error) && (
              <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} className="text-rose-400 shrink-0" />
                <p className="text-sm font-medium text-rose-200">{localError || error}</p>
              </div>
            )}
            
            {forgotSuccess && (
              <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                  <p className="text-sm font-medium text-emerald-200">{forgotSuccess}</p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}
                  className="mt-1 block rounded-lg bg-emerald-500/20 px-3 py-2 text-center text-xs font-bold text-emerald-300 hover:bg-emerald-500/30"
                >
                  Já tenho o código
                </button>
              </div>
            )}

            {/* Email Field */}
            <div className="group relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 transition-colors group-focus-within:text-teal-400">
                <Mail size={18} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com.br"
                className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm font-medium text-white placeholder-slate-600 outline-none transition-all focus:border-teal-500 focus:bg-black/40 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Password Field */}
            {!forgotPassword && (
              <div className="group relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 transition-colors group-focus-within:text-teal-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha secreta"
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-11 text-sm font-medium text-white placeholder-slate-600 outline-none transition-all focus:border-teal-500 focus:bg-black/40 focus:ring-1 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 hover:text-white transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="mt-2 flex flex-col gap-4">
              <button
                type="submit"
                disabled={loading}
                className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-teal-500 font-bold text-slate-950 transition-all hover:bg-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-70 disabled:hover:bg-teal-500"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    'Processando...'
                  ) : (
                    <>
                      {forgotPassword ? 'Enviar instruções' : 'Acessar painel'}
                      <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
                {/* Botton hover glow effect inside the button */}
                <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] transition-transform duration-500 group-hover:translate-x-[100%]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setForgotPassword(!forgotPassword);
                  setLocalError('');
                  setForgotSuccess('');
                }}
                className="text-center text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                {forgotPassword ? 'Voltar para o Login' : 'Esqueceu sua senha?'}
              </button>
            </div>
          </form>

        </div>

        {/* Footer info */}
        <p className="mt-8 text-center text-xs font-medium text-slate-600 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-backwards">
          Acesso restrito a colaboradores autorizados.<br />
          Protegido pelas diretrizes de privacidade e LGPD.
        </p>

      </div>
    </main>
  );
}
