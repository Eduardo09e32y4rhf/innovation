'use client';

import Link from 'next/link';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/app/lib/api';

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#eef1f5]" />}><ResetPasswordForm /></Suspense>;
}

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!token) return setError('Token ausente ou inv?lido. Solicite uma nova redefini??o.');
    if (password !== confirm) return setError('As senhas n?o conferem.');
    setLoading(true);
    try {
      await api.auth.resetPassword(token, password);
      setMessage('Senha redefinida com sucesso. Voc? j? pode entrar no painel.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'N?o foi poss?vel redefinir a senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef1f5] px-5 py-10">
      <section className="w-full max-w-[440px] rounded-[18px] border border-slate-200 bg-white p-6 shadow-[0_20px_52px_rgba(15,23,42,0.12)]">
        <Link href="/login" className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-950"><ArrowLeft size={14} /> Voltar ao login</Link>
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-[14px] bg-slate-950 text-white"><ShieldCheck size={22} /></div>
        <h1 className="text-2xl font-black text-slate-950">Criar nova senha</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Use uma senha forte com letra mai?scula, min?scula, n?mero e s?mbolo.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {[['Nova senha', password, setPassword], ['Confirmar senha', confirm, setConfirm]].map(([label, value, setter]) => (
            <label key={String(label)} className="block">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.12em] text-slate-600">{String(label)}</span>
              <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="password" value={String(value)} onChange={(e) => (setter as (v: string) => void)(e.target.value)} required disabled={loading} className="h-12 w-full rounded-[14px] border border-slate-300 pl-10 pr-3 text-sm font-semibold outline-none focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5" /></div>
            </label>
          ))}
          <button disabled={loading} className="h-12 w-full rounded-[14px] bg-slate-950 text-sm font-black text-white disabled:opacity-60">{loading ? 'Salvando...' : 'Redefinir senha'}</button>
        </form>
        {error && <p className="mt-5 rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">{error}</p>}
        {message && <p className="mt-5 rounded-[12px] border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-semibold text-teal-800">{message}</p>}
      </section>
    </main>
  );
}
