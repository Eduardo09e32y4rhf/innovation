'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { Button } from '@/app/components/ui/button';
import { PageHeader } from '@/app/components/ui/page-header';
import { api } from '@/app/lib/api';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const pending = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setLoading(true); setError(''); setMessage(''); setDemoCode('');
    try {
      const result = await api.auth.requestPasswordReset(email.trim(), website);
      setMessage('Se a conta estiver cadastrada e elegível, a solicitação será encaminhada aos responsáveis da empresa. Peça o código ao seu gestor ou RH para continuar.');
      if (process.env.NODE_ENV === 'development' && result.demoCode) setDemoCode(result.demoCode);
    } catch { setError('Não foi possível concluir a solicitação. Verifique sua conexão e tente novamente.'); }
    finally { pending.current = false; setLoading(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-8 text-fg"><div className="card-v2 w-full max-w-md space-y-5 p-5 sm:p-8">
    <Link className="text-lg font-semibold text-brand" href="/">Innovation RH</Link>
    <PageHeader title="Recuperar senha" subtitle="Solicite a recuperação pelo e-mail cadastrado." />
    <form onSubmit={submit} className="space-y-4">
      <div aria-hidden="true" className="sr-only"><label htmlFor="reset-website">Não preencha este campo</label><input id="reset-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></div>
      <label className="block space-y-1.5"><span className="text-sm font-medium">E-mail corporativo</span><input type="email" autoComplete="email" required disabled={loading} className="input-v2 min-h-11 text-base sm:text-sm" value={email} onChange={e => setEmail(e.target.value)} /></label>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <Button type="submit" className="w-full" isLoading={loading}>Solicitar recuperação</Button>
    </form>
    <Link className="btn btn-outline w-full" href="/reset-password">Já tenho o código do gestor</Link>
    {demoCode && <p className="text-sm">Código de teste local: {demoCode}</p>}
    <Link className="btn btn-ghost w-full" href="/login">Voltar ao login</Link><Link className="btn btn-ghost w-full" href="/suporte">Preciso de ajuda</Link>
  </div></main>;
}
