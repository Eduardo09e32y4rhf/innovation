'use client';

import Link from 'next/link';
import { AuthSplitLayout } from '@/app/components/auth-split-layout';
import { AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { ArrowLeft, Lock, ShieldCheck, User, Hash, KeyRound } from 'lucide-react';
import { FormEvent, Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/app/lib/api';

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#eef1f5]" />}><ResetPasswordForm /></Suspense>;
}

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  
  // URL Params
  const queryEmail = params.get('email') ?? '';
  const queryToken = params.get('token') ?? '';
  
  // Step 1: Validation
  const [email, setEmail] = useState(queryEmail);
  const [code, setCode] = useState('');
  const [cpfStart, setCpfStart] = useState('');
  const [registration, setRegistration] = useState('');
  
  // Step 2: New Password
  const [resetToken, setResetToken] = useState(queryToken);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  
  // State
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Auto-advance if we already have the token from the old flow (just in case)
  const isStep2 = Boolean(resetToken);

  async function handleValidate(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    
    if (!email || !code || !cpfStart || !registration) {
      return setError('Preencha todos os campos de validação.');
    }
    
    if (cpfStart.length !== 3) {
      return setError('Digite apenas os 3 primeiros dígitos do CPF.');
    }

    setLoading(true);
    try {
      const res = await api.auth.validateResetCode(email, code, cpfStart, registration);
      if (res.valid && res.resetToken) {
        setResetToken(res.resetToken);
        setError('');
        setMessage('Dados validados com sucesso! Agora, crie sua nova senha.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível validar os dados.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    
    if (!resetToken) return setError('Token de segurança ausente.');
    if (password !== confirm) return setError('As senhas não conferem.');
    
    setLoading(true);
    try {
      await api.auth.resetPassword(resetToken, password);
      setMessage('Senha redefinida com sucesso. Redirecionando para o login...');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout title={isStep2 ? 'Criar nova senha' : 'Validação de Segurança'} subtitle={isStep2 ? 'Use uma senha forte com letra maiúscula, minúscula, número e símbolo.' : 'Preencha os dados abaixo com o código fornecido pelo seu Gestor.'}>
      {!isStep2 ? (
        <form onSubmit={handleValidate} className="flex flex-col gap-4">
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-50 px-4 py-3">
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <p className="text-sm font-medium text-rose-800">{error}</p>
            </div>
          )}
          {message && (
            <div className="flex items-center gap-3 rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-3">
              <CheckCircle2 size={18} className="text-teal-600 shrink-0" />
              <p className="text-sm font-medium text-teal-800">{message}</p>
            </div>
          )}

          <div className="group relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-brand-500">
              <User size={18} />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              placeholder="E-mail Corporativo"
              className="h-12 w-full rounded-[14px] border border-slate-200/80 bg-slate-50/50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60"
            />
          </div>

          <div className="group relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-brand-500">
              <KeyRound size={18} />
            </div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              disabled={loading}
              required
              placeholder="Código do Gestor (6 dígitos)"
              className="h-12 w-full rounded-[14px] border border-slate-200/80 bg-slate-50/50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60"
            />
          </div>

          <div className="flex gap-4">
            <div className="group relative w-1/2">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-brand-500">
                <Hash size={18} />
              </div>
              <input
                type="text"
                value={cpfStart}
                onChange={(e) => setCpfStart(e.target.value.replace(/\D/g, ''))}
                maxLength={3}
                disabled={loading}
                required
                placeholder="Início CPF (3 dígitos)"
                className="h-12 w-full rounded-[14px] border border-slate-200/80 bg-slate-50/50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60"
              />
            </div>

            <div className="group relative w-1/2">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-brand-500">
                <Hash size={18} />
              </div>
              <input
                type="text"
                value={registration}
                onChange={(e) => setRegistration(e.target.value)}
                disabled={loading}
                required
                placeholder="Matrícula"
                className="h-12 w-full rounded-[14px] border border-slate-200/80 bg-slate-50/50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="crystal-button group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-sm font-black text-white shadow-lg shadow-brand-500/20 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-brand-500/30 disabled:pointer-events-none disabled:opacity-70"
          >
            {loading ? 'Validando...' : 'Validar Identidade'}
            {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
          </button>
          
          <p className="mt-4 text-center text-xs font-medium text-slate-500">
            <Link href="/login" className="font-bold text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1">
              <ArrowLeft size={14} /> Voltar ao login
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleReset} className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-50 px-4 py-3">
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <p className="text-sm font-medium text-rose-800">{error}</p>
            </div>
          )}
          {message && (
            <div className="flex items-center gap-3 rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-3">
              <CheckCircle2 size={18} className="text-teal-600 shrink-0" />
              <p className="text-sm font-medium text-teal-800">{message}</p>
            </div>
          )}

          <div className="group relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-brand-500">
              <Lock size={18} />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              placeholder="Nova senha"
              className="h-12 w-full rounded-[14px] border border-slate-200/80 bg-slate-50/50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60"
            />
          </div>

          <div className="group relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-brand-500">
              <Lock size={18} />
            </div>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
              required
              placeholder="Confirmar nova senha"
              className="h-12 w-full rounded-[14px] border border-slate-200/80 bg-slate-50/50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="crystal-button group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-sm font-black text-white shadow-lg shadow-brand-500/20 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-brand-500/30 disabled:pointer-events-none disabled:opacity-70"
          >
            {loading ? 'Salvando...' : 'Salvar Nova Senha'}
            {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
          </button>
        </form>
      )}
    </AuthSplitLayout>
  );
}
