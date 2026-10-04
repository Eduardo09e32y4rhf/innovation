'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AuthAlert, AuthShell, authButton } from '@/app/_components/auth/auth-shell';
import { api } from '@/app/lib/api';

function VerifyEmail() {
  const params = useSearchParams(); const token = params.get('token') ?? '';
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading'); const [message, setMessage] = useState('Validando seu link…');
  useEffect(() => { if (!token) { setState('error'); setMessage('O link de confirmação está incompleto.'); return; } api.auth.verifyEmail(token).then(() => { setState('success'); setMessage('E-mail confirmado com sucesso.'); }).catch((cause) => { setState('error'); setMessage(cause instanceof Error ? cause.message : 'Não foi possível confirmar o e-mail.'); }); }, [token]);
  return <AuthShell title="Confirmar e-mail" subtitle="Validação do endereço da sua conta."><AuthAlert kind={state === 'success' ? 'success' : state === 'error' ? 'error' : 'info'}>{message}</AuthAlert>{state !== 'loading' && <Link href="/login" className={authButton}>Ir para o login</Link>}</AuthShell>;
}
export default function VerifyEmailPage() { return <Suspense fallback={<p className="p-6 text-center">Carregando…</p>}><VerifyEmail /></Suspense>; }
