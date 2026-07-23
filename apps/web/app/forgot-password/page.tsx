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

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setResetToken('');
    try {
      const result = await api.auth.requestPasswordReset(email.trim());
      setMessage('Se o e-mail estiver cadastrado e ativo, enviaremos as instru??es de redefini??o.');
      if (result.demoCode) setResetToken(result.demoCode);
    } catch {
      setMessage('Se o e-mail estiver cadastrado e ativo, enviaremos as instru??es de redefini??o.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout title="Esqueci minha senha" subtitle="Informe seu e-mail para receber as instruções de recuperação.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        
        {message && (
          <div className="flex items-center gap-3 rounded-xl border border-teal-500/30 bg-teal-50 px-4 py-3">
            <CheckCircle2 size={18} className="text-teal-600 shrink-0" />
            <p className="text-sm font-medium text-teal-800">{message}</p>
          </div>
        )}

        <div className="group relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-brand-500">
            <Mail size={18} />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
            placeholder="E-mail corporativo"
            className="h-12 w-full rounded-[14px] border border-slate-200/80 bg-slate-50/50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="crystal-button group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-sm font-black text-white shadow-lg shadow-brand-500/20 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-brand-500/30 disabled:pointer-events-none disabled:opacity-70"
        >
          {loading ? 'Processando...' : 'Solicitar Redefinição'}
          {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
        </button>

        {resetToken && (
          <Link href={`/reset-password?token=${encodeURIComponent(resetToken)}`} className="mt-2 block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors">
            Abrir link de teste local para redefinir senha
          </Link>
        )}

        <p className="mt-4 text-center text-xs font-medium text-slate-500">
          <Link href="/login" className="font-bold text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1">
             <ArrowLeft size={14} /> Voltar ao login
          </Link>
        </p>
      </form>
    </AuthSplitLayout>
  );
}

