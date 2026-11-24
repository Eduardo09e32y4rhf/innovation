'use client';

import { Check, Copy, Download, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { AuthAlert, AuthShell, authButton, authInput } from '@/app/_components/auth/auth-shell';
import { useAuth } from '@/app/contexts/AuthContext';
import { api } from '@/app/lib/api';

type Setup = {
  secret: string;
  otpauthUrl: string;
  qrDataUrl?: string;
  issuer?: string;
  account?: string;
};

type MfaStatus = {
  enabled: boolean;
  required: boolean;
};

export default function MfaPage() {
  const { user, company, token, loading: authLoading, refreshUser } = useAuth();

  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const slug = company?.slug || company?.id || user?.companyId;
  const dashboardHref = slug ? `/${encodeURIComponent(String(slug))}/dashboard` : '/login';

  useEffect(() => {
    if (authLoading) return;
    if (!user || !token) {
      setStatusLoading(false);
      return;
    }

    let cancelled = false;
    setStatusLoading(true);

    api.auth
      .mfaStatus()
      .then((res) => {
        if (!cancelled) setStatus(res);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o status do MFA.');
        }
      })
      .finally(() => {
        if (!cancelled) setStatusLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, token]);

  async function handleBeginSetup() {
    setLoading(true);
    setError('');
    try {
      const data = await api.auth.mfaSetup();
      setSetup(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível iniciar a configuração.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEnableMfa(event: FormEvent) {
    event.preventDefault();
    const cleanCode = code.replace(/\D/g, '');
    if (cleanCode.length < 6) {
      setError('Informe o código de 6 dígitos gerado pelo aplicativo.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.auth.mfaEnable(cleanCode);
      setRecoveryCodes(result.recoveryCodes ?? []);
      setStatus({ enabled: true, required: status?.required ?? false });
      setSetup(null);
      setCode('');
      await refreshUser().catch(() => undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Código inválido. Verifique o horário do dispositivo e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyText(text: string, target: 'secret' | 'codes') {
    try {
      await navigator.clipboard.writeText(text);
      if (target === 'secret') {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2500);
      } else {
        setCopiedCodes(true);
        setTimeout(() => setCopiedCodes(false), 2500);
      }
    } catch {
      // Falha silenciosa se clipboard estiver bloqueado
    }
  }

  function handleDownloadRecoveryCodes() {
    if (!recoveryCodes.length) return;
    const content = [
      'INNOVATION RH CONNECT - CÓDIGOS DE RECUPERAÇÃO MFA',
      `Conta: ${user?.email ?? ''}`,
      'Guarde este arquivo em local seguro. Cada código pode ser usado apenas uma vez.',
      '',
      ...recoveryCodes,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'innovation-rh-codigos-recuperacao-mfa.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  if (authLoading || statusLoading) {
    return (
      <AuthShell title="Autenticação em duas etapas" subtitle="Verificando configurações de segurança…">
        <AuthAlert kind="info">Carregando status do MFA…</AuthAlert>
      </AuthShell>
    );
  }

  if (!user || !token) {
    return (
      <AuthShell title="Autenticação em duas etapas" subtitle="Entre na sua conta para configurar o MFA.">
        <Link href="/login" className={authButton}>
          Ir para o login
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Autenticação em duas etapas"
      subtitle="Proteja sua conta com um aplicativo autenticador."
      footer={
        <Link href={dashboardHref} className="font-semibold text-white underline">
          {slug ? 'Voltar ao painel' : 'Voltar ao login'}
        </Link>
      }
    >
      {error && <AuthAlert kind="error">{error}</AuthAlert>}

      {recoveryCodes.length > 0 ? (
        <div className="space-y-4">
          <AuthAlert kind="success">
            MFA ativado! Salve estes códigos de recuperação em local seguro — eles não serão exibidos novamente.
          </AuthAlert>

          <pre className="rounded-lg border border-zinc-200 bg-zinc-100 p-4 text-center font-mono text-sm leading-7 text-zinc-900 select-all">
            {recoveryCodes.join('\n')}
          </pre>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleCopyText(recoveryCodes.join('\n'), 'codes')}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              {copiedCodes ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copiedCodes ? 'Copiados!' : 'Copiar códigos'}
            </button>

            <button
              type="button"
              onClick={handleDownloadRecoveryCodes}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <Download size={14} />
              Baixar .TXT
            </button>
          </div>

          <Link href={dashboardHref} className={authButton}>
            Concluir
          </Link>
        </div>
      ) : status?.enabled ? (
        <div className="space-y-4">
          <AuthAlert kind="success">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={16} />A autenticação em duas etapas já está ativa nesta conta.
            </span>
          </AuthAlert>
          <Link href={dashboardHref} className={authButton}>
            {slug ? 'Voltar ao painel' : 'Continuar'}
          </Link>
        </div>
      ) : !setup ? (
        <div className="space-y-4">
          {status?.required && (
            <AuthAlert kind="info">
              Sua empresa exige autenticação em duas etapas para acessar o sistema.
            </AuthAlert>
          )}
          <button type="button" onClick={handleBeginSetup} disabled={loading} className={authButton}>
            {loading ? 'Preparando…' : 'Começar configuração'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Escaneie o QR Code no Google Authenticator, 1Password ou app compatível e informe o código gerado.
          </p>

          {setup.qrDataUrl && (
            <img
              src={setup.qrDataUrl}
              alt="QR code para configurar o autenticador"
              className="mx-auto h-52 w-52 rounded-lg border border-zinc-200 bg-white p-2"
            />
          )}

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs font-medium text-zinc-500">Chave manual</p>
              <button
                type="button"
                onClick={() => handleCopyText(setup.secret, 'secret')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-700 hover:text-zinc-950"
              >
                {copiedSecret ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                {copiedSecret ? 'Copiada' : 'Copiar'}
              </button>
            </div>
            <code className="block break-all font-mono text-sm text-zinc-900 select-all">
              {setup.secret}
            </code>
          </div>

          <form onSubmit={handleEnableMfa} className="space-y-3">
            <input
              aria-label="Código de verificação do aplicativo"
              required
              minLength={6}
              maxLength={8}
              inputMode="numeric"
              autoComplete="one-time-code"
              disabled={loading}
              className={`${authInput} text-center font-mono tracking-[0.3em]`}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            <button type="submit" className={authButton} disabled={loading || code.length < 6}>
              {loading ? 'Confirmando…' : 'Ativar MFA'}
            </button>
          </form>
        </div>
      )}
    </AuthShell>
  );
}
