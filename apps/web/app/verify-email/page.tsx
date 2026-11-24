'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { AuthAlert, AuthShell, authButton } from '@/app/_components/auth/auth-shell';
import { api } from '@/app/lib/api';

type VerificationState = 'loading' | 'success' | 'error';

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get('token')?.trim() ?? '';

  const [state, setState] = useState<VerificationState>('loading');
  const [message, setMessage] = useState('Validando seu link de confirmação…');
  
  // Evita chamadas duplicadas no React Strict Mode (que invalidariam o token na 2ª tentativa)
  const hasRequested = useRef(false);

  useEffect(() => {
    if (hasRequested.current) return;
    hasRequested.current = true;

    if (!token) {
      setState('error');
      setMessage('O link de confirmação está incompleto ou inválido.');
      return;
    }

    api.auth
      .verifyEmail(token)
      .then(() => {
        setState('success');
        setMessage('E-mail confirmado com sucesso! Sua conta já está pronta para uso.');
      })
      .catch((cause) => {
        setState('error');
        setMessage(
          cause instanceof Error
            ? cause.message
            : 'Não foi possível confirmar o e-mail. O link pode ter expirado.'
        );
      });
  }, [token]);

  const alertKind = state === 'success' ? 'success' : state === 'error' ? 'error' : 'info';

  return (
    <AuthShell title="Confirmar e-mail" subtitle="Validação do endereço da sua conta.">
      <div className="space-y-4">
        <AuthAlert kind={alertKind}>{message}</AuthAlert>

        {state === 'success' && (
          <Link href="/login" className={authButton}>
            Ir para o login
          </Link>
        )}

        {state === 'error' && (
          <div className="space-y-3">
            <Link href="/login" className={authButton}>
              Voltar para o login
            </Link>
            <p className="text-center text-xs text-slate-400">
              Precisa de um novo link? Tente fazer login para reenviar a confirmação.
            </p>
          </div>
        )}
      </div>
    </AuthShell>
  );
}

function VerifyEmailFallback() {
  return (
    <AuthShell title="Confirmar e-mail" subtitle="Validação do endereço da sua conta.">
      <AuthAlert kind="info">Carregando validação…</AuthAlert>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
