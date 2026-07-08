'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingState } from '@/app/components/data-states';
import { persistAuthSession } from '@/app/lib/auth-session';

function GhostPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Token não fornecido.');
      return;
    }

    let active = true;

    async function login() {
      try {
        const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || '/api';
        const response = await fetch(`${getApiUrl()}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Falha ao validar token.');
        }

        const payload = await response.json();
        const freshUser = payload.data ?? payload;
        
        const nextUser = {
          id: freshUser.sub,
          name: freshUser.name || freshUser.email?.split('@')[0] || 'Usuário',
          email: freshUser.email,
          profile: String(freshUser.role || 'USER').toLowerCase(),
          companyId: freshUser.companyId,
        };
        const nextCompany = { id: freshUser.companyId, name: 'Empresa Acessada' };

        if (!active) return;

        persistAuthSession(token!, nextUser, nextCompany, false);

        // Redirect
        router.replace(`/${freshUser.companyId}/dashboard`);
      } catch (err: any) {
        if (active) setError(err.message || 'Erro ao iniciar Ghost Mode.');
      }
    }

    login();

    return () => {
      active = false;
    };
  }, [token, router]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50">
        <div className="rounded-[12px] border border-rose-200 bg-rose-50 p-6 text-center shadow-sm">
          <h2 className="mb-2 text-base font-black text-rose-800">Acesso negado</h2>
          <p className="text-sm text-rose-600">{error}</p>
          <button onClick={() => window.close()} className="mt-4 rounded-[8px] bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm border border-slate-200">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <LoadingState label="Iniciando acesso seguro..." />
    </div>
  );
}

export default function GhostPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-50"><LoadingState label="Carregando..." /></div>}>
      <GhostPageContent />
    </Suspense>
  );
}
