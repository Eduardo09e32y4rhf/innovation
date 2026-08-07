'use client';

import Link from 'next/link';
import { AuthSplitLayout } from '@/app/components/auth-split-layout';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { api } from '@/app/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [website, setWebsite] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setResetToken('');
    try {
      const result = await api.auth.requestPasswordReset(email.trim(), website);
      setMessage('Se o e-mail estiver cadastrado e ativo, enviaremos as instruções de redefinição.');
      if (result.demoCode) setResetToken(result.demoCode);
    } catch {
      setMessage('Se o e-mail estiver cadastrado e ativo, enviaremos as instruções de redefinição.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout title="Esqueci minha senha" subtitle="Informe seu e-mail para receber as instruções de recuperação.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        
        {message && (
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 px-4 py-3">
            <CheckCircle2 size={18} className="text-[var(--color-success)] shrink-0" />
            <p className="text-sm font-medium text-emerald-800">{message}</p>
          </div>
        )}

        {/* Honeypot */}
        <div aria-hidden="true" className="hidden opacity-0 absolute -z-50 select-none pointer-events-none">
          <label htmlFor="website">Website</label>
          <input type="text" id="website" name="website" value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" />
        </div>

        <div className="group relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-400 transition-colors group-focus-within:text-[var(--color-brand)]">
            <Mail size={18} />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
            placeholder="E-mail corporativo"
            className="form-control pl-11 pr-4 h-12 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary h-12 text-sm w-full mt-2 group"
        >
          {loading ? 'Processando...' : 'Solicitar Redefinição'}
          {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
        </button>

        {resetToken && (
          <Link href={`/reset-password?token=${encodeURIComponent(resetToken)}`} className="mt-2 block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors">
            Abrir link de teste local para redefinir senha
          </Link>
        )}

        <p className="mt-4 text-center text-xs font-medium text-zinc-500">
          <Link href="/login" className="font-bold text-zinc-500 hover:text-zinc-700 flex items-center justify-center gap-1">
             <ArrowLeft size={14} /> Voltar ao login
          </Link>
        </p>
      </form>
    </AuthSplitLayout>
  );
}

