'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthAlert, AuthShell, authButton, authInput } from '@/app/_components/auth/auth-shell';
import { useAuth } from '@/app/contexts/AuthContext';
import { api } from '@/app/lib/api';

type Setup = { secret: string; otpauthUrl: string; qrDataUrl?: string; issuer?: string; account?: string };

export default function MfaPage() {
  const { user, token, refreshUser } = useAuth();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [status, setStatus] = useState<{ enabled: boolean; required: boolean } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.auth.mfaStatus().then(setStatus).catch((cause) => setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o MFA.')); }, []);

  async function begin() {
    setLoading(true); setError('');
    try { setSetup(await api.auth.mfaSetup()); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível iniciar o cadastro.'); } finally { setLoading(false); }
  }
  async function enable(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try { const result = await api.auth.mfaEnable(code); setRecoveryCodes(result.recoveryCodes ?? []); setStatus({ enabled: true, required: status?.required ?? false }); setSetup(null); setCode(''); await refreshUser(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Código inválido.'); } finally { setLoading(false); }
  }

  if (!user || !token) return <AuthShell title="Autenticação em duas etapas" subtitle="Entre para configurar o MFA."><Link href="/login" className={authButton}>Ir para o login</Link></AuthShell>;
  return <AuthShell title="Autenticação em duas etapas" subtitle="Proteja sua conta com um aplicativo autenticador." footer={<Link href="/login" className="font-semibold text-white underline">Voltar</Link>}>
    {error && <AuthAlert>{error}</AuthAlert>}
    {recoveryCodes.length > 0 ? <div className="space-y-4"><AuthAlert kind="success">MFA ativado. Guarde estes códigos de recuperação em local seguro; eles só serão exibidos agora.</AuthAlert><pre className="rounded-lg bg-zinc-100 p-4 text-center font-mono text-sm leading-7">{recoveryCodes.join('\n')}</pre><Link href="/login" className={authButton}>Concluir</Link></div> : status?.enabled ? <AuthAlert kind="success">A autenticação em duas etapas já está ativa nesta conta.</AuthAlert> : !setup ? <button type="button" onClick={begin} disabled={loading} className={authButton}>{loading ? 'Carregando…' : 'Começar configuração'}</button> : <div className="space-y-4">
      <p className="text-sm text-zinc-600">Adicione esta chave ao Google Authenticator, 1Password ou outro app compatível e informe o código gerado.</p>
      {setup.qrDataUrl && <img src={setup.qrDataUrl} alt="QR code para configurar o autenticador" className="mx-auto h-56 w-56 rounded bg-white p-2" />}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"><p className="text-xs text-zinc-500">Chave manual</p><code className="break-all font-mono text-sm">{setup.secret}</code></div>
      <form onSubmit={enable} className="space-y-3"><input required minLength={6} maxLength={8} inputMode="numeric" autoComplete="one-time-code" className={`${authInput} text-center font-mono tracking-[0.3em]`} placeholder="Código do aplicativo" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /><button className={authButton} disabled={loading}>{loading ? 'Confirmando…' : 'Ativar MFA'}</button></form>
    </div>}
  </AuthShell>;
}
