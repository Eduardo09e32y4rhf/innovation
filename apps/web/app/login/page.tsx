"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Building2, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { firstAccessMessage } from './professional-messages';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, router]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError('');

    if (!email.trim() || !password) {
      setLocalError('Informe o e-mail e a senha.');
      return;
    }

    try {
      await login(email.trim(), password);
      router.push('/dashboard');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Nao foi possivel entrar agora.');
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f5f7] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1fr_520px]">
        <section className="hidden min-h-screen flex-col justify-between bg-[#0d0d0e] p-10 text-white lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white text-slate-950">
              <ShieldCheck size={20} strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-300">Innovation RH Connect</p>
              <p className="text-sm font-bold text-white/80">Console operacional</p>
            </div>
          </div>

          <div className="max-w-xl">
            <p className="mb-4 inline-flex rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-teal-100">
              Ambiente seguro
            </p>
            <h1 className="text-5xl font-black leading-[1.02] tracking-tight text-white">
              Operacao conectada para RH, ponto e WhatsApp.
            </h1>
            <p className="mt-5 max-w-lg text-sm font-medium leading-7 text-slate-300">
              Acesse com credenciais reais da empresa. Nenhum modo demo e habilitado em producao.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {['WhatsApp real', 'Banco ativo', 'JWT seguro'].map((item) => (
              <div key={item} className="rounded-[14px] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/55">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-8">
          <div className="w-full max-w-[420px]">
            <div className="mb-8 lg:hidden">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[12px] bg-slate-950 text-white">
                <ShieldCheck size={20} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-700">Innovation RH Connect</p>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.10)] sm:p-8">
              <div className="mb-7">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-slate-950 text-white">
                  <Building2 size={22} />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">Entrar no painel</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                  Use o e-mail e a senha do administrador cadastrado no backend.
                </p>
              </div>

              {(error || localError) ? (
                <div className="mb-5 flex gap-3 rounded-[14px] border border-red-200 bg-red-50 p-3 text-red-800">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-black">Nao foi possivel entrar</p>
                    <p className="mt-1 text-xs font-semibold">{error || localError}</p>
                  </div>
                </div>
              ) : null}

              <form className="space-y-4" onSubmit={handleLogin}>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-slate-600">E-mail</span>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={loading}
                      autoComplete="email"
                      placeholder="admin@suaempresa.com"
                      className="h-12 w-full rounded-[14px] border border-slate-300 bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5 disabled:opacity-60"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-slate-600">Senha</span>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={loading}
                      autoComplete="current-password"
                      placeholder="Digite sua senha"
                      className="h-12 w-full rounded-[14px] border border-slate-300 bg-white pl-10 pr-11 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[10px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-slate-950 text-sm font-black text-white shadow-[0_14px_28px_rgba(15,23,42,0.22)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Autenticando...' : 'Entrar'}
                  {!loading ? <ArrowRight size={18} /> : null}
                </button>
              </form>

              <div className="mt-6 rounded-[16px] border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4">
                <p className="text-xs font-black leading-5 text-slate-900">{firstAccessMessage.title}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{firstAccessMessage.description}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
