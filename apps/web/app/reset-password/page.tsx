'use client';

import Link from 'next/link';
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
        setMessaídados com sucesso! Agora, crie sua nova senha.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.messaídados.');
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
      setMessaída com sucesso. Redirecionando para o login...');
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
    <main className="flex min-h-screen items-center justify-center bg-[#eef1f5] px-5 py-10 font-sans">
      <section className="w-full max-w-[440px] rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_20px_52px_rgba(15,23,42,0.12)]">
        <Link href="/login" className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-950">
          <ArrowLeft size={14} /> Voltar ao login
        </Link>
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-[14px] bg-slate-950 text-white">
          <ShieldCheck size={22} />
        </div>
        
        <h1 className="text-2xl font-black text-slate-950">
          {isStep2 ? 'Criar nova senha' : 'Validação de Segurança'}
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          {isStep2 
            ? 'Use uma senha forte com letra maiúscula, minúscula, número e símbolo.' 
            : 'Preencha os dados abaixo com o código fornecido pelo seu Gestor.'}
        </p>

        {!isStep2 ? (
          <form onSubmit={handleValidate} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-slate-600">E-mail Corporativo</span>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} className="h-12 w-full rounded-[14px] border border-slate-300 pl-10 pr-3 text-sm font-semibold outline-none focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5" />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-slate-600">Código do Gestor (6 dígitos)</span>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} required disabled={loading} className="h-12 w-full rounded-[14px] border border-slate-300 pl-10 pr-3 text-sm font-semibold outline-none focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5" />
              </div>
            </label>

            <div className="flex gap-4">
              <label className="block w-1/2">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-slate-600">Início CPF (3 DÍGITOS)</span>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" value={cpfStart} onChange={(e) => setCpfStart(e.target.value.replace(/\D/g, ''))} maxLength={3} placeholder="Ex: 123" required disabled={loading} className="h-12 w-full rounded-[14px] border border-slate-300 pl-10 pr-3 text-sm font-semibold outline-none focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5" />
                </div>
              </label>

              <label className="block w-1/2">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-slate-600">Matrícula</span>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" value={registration} onChange={(e) => setRegistration(e.target.value)} required disabled={loading} className="h-12 w-full rounded-[14px] border border-slate-300 pl-10 pr-3 text-sm font-semibold outline-none focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5" />
                </div>
              </label>
            </div>

            <button disabled={loading} className="mt-2 h-12 w-full rounded-[14px] bg-slate-950 text-sm font-black text-white disabled:opacity-60 transition-opacity">
              {loading ? 'Validando...' : 'Validar Identidade'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="mt-6 space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-slate-600">Nova Senha</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} className="h-12 w-full rounded-[14px] border border-slate-300 pl-10 pr-3 text-sm font-semibold outline-none focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5" />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-slate-600">Confirmar Nova Senha</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required disabled={loading} className="h-12 w-full rounded-[14px] border border-slate-300 pl-10 pr-3 text-sm font-semibold outline-none focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5" />
              </div>
            </label>

            <button disabled={loading} className="mt-2 h-12 w-full rounded-[14px] bg-slate-950 text-sm font-black text-white disabled:opacity-60 transition-opacity">
              {loading ? 'Salvando...' : 'Redefinir e Entrar'}
            </button>
          </form>
        )}

        {error && (
          <div className="mt-5 rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 animate-in fade-in">
            {error}
          </div>
        )}
        
        {message && (
          <div className="mt-5 rounded-[12px] border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-semibold text-teal-800 animate-in fade-in">
            {message}
          </div>
        )}
      </section>
    </main>
  );
}
