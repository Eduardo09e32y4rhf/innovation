"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MessageSquareText,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { firstAccessMessage } from './professional-messages';

const modules = [
  {
    title: 'Equipe em ordem',
    text: 'Cadastros, cargos, status e histórico organizados em uma única visão.',
    icon: Users,
  },
  {
    title: 'Ponto mais claro',
    text: 'Acompanhamento de entrada, saída, saldo e ajustes da jornada diária.',
    icon: Clock3,
  },
  {
    title: 'Férias sem planilha',
    text: 'Solicitações, aprovações e períodos consolidados para decisão rápida.',
    icon: CalendarCheck,
  },
  {
    title: 'Comunicação integrada',
    text: 'Avisos e central de comunicação conectados ao contexto de cada operação.',
    icon: MessageSquareText,
  },
];

const outcomes = [
  'Menos retrabalho para o RH',
  'Mais visibilidade para gestores',
  'Operação pronta para crescer',
];

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, router]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError('');
    setForgotSuccess('');

    if (forgotPassword) {
      if (!email.trim()) {
        setLocalError('Informe o e-mail para recuperar a senha.');
        return;
      }
      setForgotSuccess('Token de recuperação enviado para o seu e-mail!');
      return;
    }

    if (!email.trim() || !password) {
      setLocalError('Informe o e-mail e a senha.');
      return;
    }

    try {
      await login(email.trim(), password);
      router.push('/dashboard');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Não foi possível entrar agora.');
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)] xl:grid-cols-[minmax(0,1fr)_minmax(420px,500px)]">
        
        {/* Left Section - Clean Theme */}
        <section className="relative overflow-hidden bg-white px-5 py-6 text-slate-900 border-r border-slate-200 sm:px-8 lg:min-h-screen lg:px-10 lg:py-7">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:52px_52px]" />
          <div className="absolute bottom-0 left-0 h-64 w-full bg-gradient-to-t from-teal-500/10 to-transparent" />

          <div className="relative mx-auto flex max-w-6xl flex-col gap-8 lg:min-h-[calc(100vh-56px)] lg:justify-between xl:gap-7">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.15)]">
                  <ShieldCheck size={21} strokeWidth={2.4} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-600">Innovation RH Connect</p>
                  <p className="text-sm font-bold text-slate-500">Gestão inteligente para empresas</p>
                </div>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 xl:flex">
                <BadgeCheck size={15} className="text-teal-600" />
                Apresentação comercial
              </div>
            </header>

            <div className="grid items-end gap-8 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)]">
              <section className="max-w-3xl">
                <p className="mb-4 inline-flex max-w-full rounded-full border border-teal-500/20 bg-teal-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-teal-700">
                  Plataforma para RH operacional
                </p>
                <h1 className="max-w-[760px] text-[clamp(2.6rem,7vw,5.25rem)] font-black leading-[1.02] tracking-tight text-slate-900">
                  Venda uma rotina de RH mais simples, rápida e conectada.
                </h1>
                <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-slate-600 sm:text-base sm:leading-8">
                  O Innovation RH Connect ajuda empresas a controlar pessoas, ponto, férias e comunicação em um painel
                  único, com informação pronta para decisão e menos dependência de planilhas.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  {outcomes.map((item) => (
                    <div key={item} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700">
                      <CheckCircle2 size={15} className="shrink-0 text-teal-600" />
                      {item}
                    </div>
                  ))}
                </div>
              </section>

              <section className="hidden rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] xl:block">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-600">Impacto esperado</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">Mais controle em menos tempo</p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-teal-100 text-teal-700">
                    <BarChart3 size={20} />
                  </div>
                </div>
                <div className="grid gap-3">
                  {[
                    ['42', 'colaboradores acompanhados'],
                    ['38', 'registros de ponto hoje'],
                    ['184', 'mensagens centralizadas'],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-[14px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-3xl font-black text-slate-900">{value}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {modules.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[13px] bg-slate-100 text-slate-700">
                      <Icon size={19} />
                    </div>
                    <h2 className="text-sm font-black text-slate-900">{item.title}</h2>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{item.text}</p>
                  </article>
                );
              })}
            </section>
          </div>
        </section>

        {/* Right Section - Login Form */}
        <section className="flex min-h-[auto] items-center justify-center px-5 py-8 sm:px-8 lg:min-h-screen lg:bg-slate-50 lg:px-6">
          <div className="w-full max-w-[400px]">
            <div className="mb-8 lg:hidden">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[12px] bg-slate-900 text-white">
                <ShieldCheck size={20} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-600">Innovation RH Connect</p>
            </div>

            {/* Elevated Clean Login Card */}
            <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_24px_50px_rgba(15,23,42,0.08)] sm:p-8 relative">
              <div className="mb-7">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-teal-50 text-teal-700">
                  <Building2 size={22} />
                </div>
                <h2 className="text-[1.5rem] font-black tracking-tight text-slate-900 sm:text-[1.65rem]">
                  {forgotPassword ? 'Recuperar Acesso' : 'Conheça o painel'}
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  {forgotPassword ? 'Digite o seu e-mail cadastrado e enviaremos um token de recuperação de acesso seguro.' : 'Entre para navegar pela apresentação e visualizar como a operação fica na prática.'}
                </p>
              </div>

              {(error || localError) && (
                <div className="mb-5 flex gap-3 rounded-[14px] border border-red-200 bg-red-50 p-3 text-red-800">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-black">Não foi possível prosseguir</p>
                    <p className="mt-1 text-xs font-semibold">{error || localError}</p>
                  </div>
                </div>
              )}
              
              {forgotSuccess && (
                <div className="mb-5 flex gap-3 rounded-[14px] border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-black">Tudo certo!</p>
                    <p className="mt-1 text-xs font-semibold">{forgotSuccess}</p>
                  </div>
                </div>
              )}

              <form className="space-y-5" onSubmit={handleLogin}>
                <label className="block">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">E-mail</span>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={loading}
                      autoComplete="email"
                      placeholder="contato@suaempresa.com"
                      className="h-12 w-full rounded-[14px] border border-slate-300 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10 disabled:opacity-60"
                    />
                  </div>
                </label>

                {!forgotPassword && (
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">Senha</span>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        disabled={loading}
                        autoComplete="current-password"
                        placeholder="Digite sua senha"
                        className="h-12 w-full rounded-[14px] border border-slate-300 bg-slate-50 pl-11 pr-11 text-sm font-semibold text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10 disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[10px] text-slate-400 transition hover:bg-slate-200 hover:text-slate-900"
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </label>
                )}

                <div className="flex justify-between items-center">
                  {!forgotPassword && (
                    <button type="button" onClick={() => setForgotPassword(true)} className="text-xs font-black text-teal-600 hover:text-teal-800 transition">
                      Esqueci minha senha
                    </button>
                  )}
                  {forgotPassword && (
                    <button type="button" onClick={() => { setForgotPassword(false); setForgotSuccess(''); setLocalError(''); }} className="text-xs font-black text-slate-500 hover:text-slate-900 transition">
                      Voltar para o login
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-slate-900 text-sm font-black text-white shadow-[0_12px_24px_rgba(15,23,42,0.15)] transition hover:bg-slate-800 hover:shadow-[0_14px_30px_rgba(15,23,42,0.22)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Aguarde...' : (forgotPassword ? 'Simular Envio' : 'Entrar no painel')}
                  {!loading && !forgotPassword ? <ArrowRight size={18} /> : null}
                </button>
              </form>

              <div className="mt-7 rounded-[14px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black leading-5 text-slate-900">{firstAccessMessage.title}</p>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">{firstAccessMessage.description}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
