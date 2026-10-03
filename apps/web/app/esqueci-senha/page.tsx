'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { AuthAlert, AuthShell, authButton, authInput, authLink } from '@/app/_components/auth/auth-shell';
import { api } from '@/app/lib/api';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setLoading(true); setError('');
    try { await api.auth.requestPasswordReset(email.trim(), website); setSent(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a solicitação. Tente novamente.'); }
    finally { pending.current = false; setLoading(false); }
  }

  const resetHref = `/reset-password?email=${encodeURIComponent(email.trim())}`;

  return (
    <AuthShell title="Recuperar acesso" subtitle="Informe o e-mail da sua conta para solicitar um código de recuperação."
      footer={<Link href="/login" className="font-semibold text-white underline">Voltar ao login</Link>}>
      {sent ? (
        <div className="space-y-4">
          <AuthAlert kind="success">Solicitação registrada. Se o e-mail estiver cadastrado, o responsável da sua empresa (gestor, RH ou administrador) recebeu o código de 6 caracteres.</AuthAlert>
          <p className="text-sm text-zinc-600">Peça o código a ele e continue. O código vale por 2 horas.</p>
          <Link href={resetHref} className={authButton}>Já tenho o código</Link>
          <button type="button" onClick={() => setSent(false)} className="min-h-11 w-full text-sm font-medium text-zinc-600 hover:text-zinc-900">Usar outro e-mail</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div aria-hidden="true" className="sr-only"><label htmlFor="fp-website">Não preencha este campo</label><input id="fp-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></div>
          <div>
            <label htmlFor="fp-email" className="mb-1.5 block text-sm font-medium text-zinc-700">E-mail</label>
            <input id="fp-email" type="email" autoComplete="email" required disabled={loading} className={authInput} placeholder="voce@empresa.com.br" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <AuthAlert>{error}</AuthAlert>}
          <button type="submit" disabled={loading || !email} className={authButton}>{loading ? 'Enviando…' : 'Solicitar código'}</button>
          <p className="text-center text-sm text-zinc-600">Já recebeu o código? <Link href="/reset-password" className={authLink}>Redefinir senha</Link></p>
          <p className="text-center text-xs text-zinc-500">Precisa de ajuda? <Link href="/suporte" className={authLink}>Fale com o suporte</Link></p>
        </form>
      )}
    </AuthShell>
  );
}
