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
            <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 px-4 py-3">
              <AlertCircle size={18} className="text-[var(--color-danger)] shrink-0" />
              <p className="text-sm font-medium text-rose-800">{error}</p>
            </div>
          )}
          {message && (
            <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle2 size={18} className="text-[var(--color-success)] shrink-0" />
              <p className="text-sm font-medium text-emerald-800">{message}</p>
            </div>
          )}

          <div className="group relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400 transition-colors group-focus-within:text-[var(--color-brand)]">
              <User size={18} />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              placeholder="E-mail Corporativo"
              className="form-control pl-11 pr-4 h-12 text-sm"
            />
          </div>

          <div className="group relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400 transition-colors group-focus-within:text-[var(--color-brand)]">
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
              className="form-control pl-11 pr-4 h-12 text-sm"
            />
          </div>

          <div className="flex gap-4">
            <div className="group relative w-1/2">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400 transition-colors group-focus-within:text-[var(--color-brand)]">
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
                className="form-control pl-11 pr-4 h-12 text-sm"
              />
            </div>

            <div className="group relative w-1/2">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400 transition-colors group-focus-within:text-[var(--color-brand)]">
                <Hash size={18} />
              </div>
              <input
                type="text"
                value={registration}
                onChange={(e) => setRegistration(e.target.value)}
                disabled={loading}
                required
                placeholder="Matrícula"
                className="form-control pl-11 pr-4 h-12 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary h-12 text-sm w-full mt-2 group"
          >
            {loading ? 'Validando...' : 'Validar Identidade'}
            {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
          </button>
          
          <p className="mt-4 text-center text-xs font-medium text-zinc-500">
            <Link href="/login" className="font-bold text-zinc-500 hover:text-zinc-700 flex items-center justify-center gap-1">
              <ArrowLeft size={14} /> Voltar ao login
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleReset} className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
          {error && (
            <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 px-4 py-3">
              <AlertCircle size={18} className="text-[var(--color-danger)] shrink-0" />
              <p className="text-sm font-medium text-rose-800">{error}</p>
            </div>
          )}
          {message && (
            <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle2 size={18} className="text-[var(--color-success)] shrink-0" />
              <p className="text-sm font-medium text-emerald-800">{message}</p>
            </div>
          )}

          <div className="group relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400 transition-colors group-focus-within:text-[var(--color-brand)]">
              <Lock size={18} />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              placeholder="Nova senha"
              className="form-control pl-11 pr-4 h-12 text-sm"
            />
          </div>

          <div className="group relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400 transition-colors group-focus-within:text-[var(--color-brand)]">
              <Lock size={18} />
            </div>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
              required
              placeholder="Confirmar nova senha"
              className="form-control pl-11 pr-4 h-12 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary h-12 text-sm w-full mt-2 group"
          >
            {loading ? 'Salvando...' : 'Salvar Nova Senha'}
            {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
          </button>
        </form>
      )}
    </AuthSplitLayout>
  );
}
