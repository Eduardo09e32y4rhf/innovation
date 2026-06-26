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
      setLocalError(err instanceof Error ? err.message : 'Não foi possível entrar agora.');
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef1f5] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)] xl:grid-cols-[minmax(0,1fr)_minmax(420px,500px)]">
        <section className="relative overflow-hidden bg-[#101114] px-5 py-6 text-white sm:px-8 lg:min-h-screen lg:px-10 lg:py-7">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:52px_52px]" />
          <div className="absolute bottom-0 left-0 h-64 w-full bg-gradient-to-t from-teal-500/14 to-transparent" />

          <div className="relative mx-auto flex max-w-6xl flex-col gap-8 lg:min-h-[calc(100vh-56px)] lg:justify-between xl:gap-7">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-white text-slate-950 shadow-[0_18px_38px_rgba(45,212,191,0.20)]">
                  <ShieldCheck size={21} strokeWidth={2.4} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-300">Innovation RH Connect</p>
                  <p className="text-sm font-bold text-white/80">Gestão inteligente para empresas</p>
                </div>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black text-white/80 xl:flex">
                <BadgeCheck size={15} className="text-teal-300" />
                Apresentação comercial
              </div>
            </header>

            <div className="grid items-end gap-8 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)]">
              <section className="max-w-3xl">
                <p className="mb-4 inline-flex max-w-full rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-teal-100">
                  Plataforma para RH operacional
                </p>
                <h1 className="max-w-[760px] text-[clamp(2.6rem,7vw,5.25rem)] font-black leading-[1.02] tracking-tight text-white">
                  Venda uma rotina de RH mais simples, rápida e conectada.
                </h1>
                <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-slate-300 sm:text-base sm:leading-8">
                  O Innovation RH Connect ajuda empresas a controlar pessoas, ponto, férias e comunicação em um painel
                  único, com informação pronta para decisão e menos dependência de planilhas.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  {outcomes.map((item) => (
                    <div key={item} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black text-white/85">
                      <CheckCircle2 size={15} className="shrink-0 text-teal-300" />
                      {item}
                    </div>
                  ))}
                </div>
              </section>

              <section className="hidden rounded-[18px] border border-white/10 bg-white/[0.06] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur xl:block">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-200">Impacto esperado</p>
                    <p className="mt-1 text-sm font-bold text-white">Mais controle em menos tempo</p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-teal-300 text-slate-950">
                    <BarChart3 size={20} />
                  </div>
                </div>
                <div className="grid gap-3">
                  {[
                    ['42', 'colaboradores acompanhados'],
                    ['38', 'registros de ponto hoje'],
                    ['184', 'mensagens centralizadas'],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-[14px] border border-white/10 bg-black/20 p-4">
                      <p className="text-3xl font-black text-white">{value}</p>
                      <p className="mt-1 text-xs font-bold text-slate-300">{label}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {modules.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded-[14px] border border-white/10 bg-white/[0.055] p-4 shadow-[0_16px_44px_rgba(0,0,0,0.22)] backdrop-blur">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[13px] bg-white text-slate-950">
                      <Icon size={19} />
                    </div>
                    <h2 className="text-sm font-black text-white">{item.title}</h2>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">{item.text}</p>
                  </article>
                );
              })}
            </section>
          </div>
        </section>

        <section className="flex min-h-[auto] items-center justify-center px-5 py-8 sm:px-8 lg:min-h-screen lg:bg-[#f7f8fb] lg:px-6">
          <div className="w-full max-w-[390px]">
            <div className="mb-8 lg:hidden">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[12px] bg-slate-950 text-white">
                <ShieldCheck size={20} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-700">Innovation RH Connect</p>
            </div>

            <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_20px_52px_rgba(15,23,42,0.12)] sm:p-7">
              <div className="mb-7">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#030712] text-white">
                  <Building2 size={22} />
                </div>
                <h2 className="text-[1.55rem] font-black tracking-tight text-slate-950 sm:text-2xl">Conheça o painel</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Entre para navegar pela apresentação e visualizar como a operação fica na prática.
                </p>
              </div>

              {(error || localError) ? (
                <div className="mb-5 flex gap-3 rounded-[14px] border border-red-200 bg-red-50 p-3 text-red-800">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-black">Não foi possível entrar</p>
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
                      placeholder="contato@suaempresa.com"
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

                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-xs font-black text-slate-500 hover:text-slate-950">Esqueci minha senha</Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#030712] text-sm font-black text-white shadow-[0_14px_28px_rgba(15,23,42,0.22)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Entrando...' : 'Entrar no painel'}
                  {!loading ? <ArrowRight size={18} /> : null}
                </button>
              </form>

              <div className="mt-6 rounded-[16px] border border-slate-200 bg-slate-50 p-4">
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
