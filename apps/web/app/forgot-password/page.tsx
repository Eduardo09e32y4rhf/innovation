'use client';

import Link from 'next/link';
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
      if (result.resetToken) setResetToken(result.resetToken);
    } catch {
      setMessage('Se o e-mail estiver cadastrado e ativo, enviaremos as instru??es de redefini??o.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef1f5] px-5 py-10">
      <section className="w-full max-w-[440px] rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_20px_52px_rgba(15,23,42,0.12)]">
        <Link href="/login" className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-950"><ArrowLeft size={14} /> Voltar ao login</Link>
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-[14px] bg-slate-950 text-white"><ShieldCheck size={22} /></div>
        <h1 className="text-2xl font-black text-slate-950">Esqueci minha senha</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Informe seu e-mail para iniciar a redefini??o de senha com token tempor?rio.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-slate-600">E-mail</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} className="h-12 w-full rounded-[14px] border border-slate-300 pl-10 pr-3 text-sm font-semibold outline-none focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5" />
            </div>
          </label>
          <button disabled={loading} className="h-12 w-full rounded-[14px] bg-slate-950 text-sm font-black text-white disabled:opacity-60">{loading ? 'Enviando...' : 'Solicitar redefini??o'}</button>
        </form>
        {message && <p className="mt-5 rounded-[12px] border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-semibold text-teal-800">{message}</p>}
        {resetToken && (
          <Link href={`/reset-password?token=${encodeURIComponent(resetToken)}`} className="mt-3 block rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800 hover:bg-amber-100">Abrir link de teste local para redefinir senha</Link>
        )}
      </section>
    </main>
  );
}
