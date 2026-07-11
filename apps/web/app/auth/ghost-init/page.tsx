'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingState } from '@/app/components/data-states';
import { persistAuthSession, readAuthSession } from '@/app/lib/auth-session';

function GhostInitPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setError('ID da empresa não fornecido.');
      return;
    }

    let active = true;

    async function initGhostMode() {
      // Pequeno delay para garantir que o localStorage está acessível na aba nova
      await new Promise(r => setTimeout(r, 200));
      
      try {
        // Lê token do admin com múltiplas estratégias para garantir compatibilidade
        const session = readAuthSession();
        const adminToken = 
          session.token ||
          window.localStorage.getItem('auth.token') ||
          window.localStorage.getItem('token') ||
          window.sessionStorage.getItem('auth.token');
        
        if (!adminToken) throw new Error('Sessão expirada. Feche esta aba e tente novamente estando logado.');

        const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || '/api';
        
        // 1. Gera o token do ghost mode usando o token do admin atual
        const res = await fetch(`${getApiUrl()}/platform/ghost-mode/${companyId}`, {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          const errorMsg = errorData?.message || errorData?.error || `Erro ${res.status}`;
          if (res.status === 401) throw new Error('Sessão expirada. Feche esta aba, recarregue a página principal e tente novamente.');
          if (res.status === 403) throw new Error('Sem permissão. Apenas o DEV pode usar o modo ghost.');
          throw new Error(errorMsg);
        }

        const data = await res.json();
        const ghostToken = data?.token;
        if (!ghostToken) throw new Error('Falha ao gerar token de acesso.');

        // 2. Valida o token gerado para pegar os dados do usuário e empresa
        const responseMe = await fetch(`${getApiUrl()}/auth/me`, {
          headers: { Authorization: `Bearer ${ghostToken}` },
        });

        if (!responseMe.ok) throw new Error('Falha ao validar token.');

        const payload = await responseMe.json();
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

        // 3. Persiste APENAS nesta aba (sessionStorage) para não deslogar a aba original do Admin
        persistAuthSession(ghostToken, nextUser, nextCompany, false, true);

        // 4. Redireciona
        router.replace(`/${freshUser.companyId}/dashboard`);
      } catch (err: any) {
        if (active) setError(err.message || 'Erro ao iniciar Ghost Mode.');
      }
    }

    initGhostMode();

    return () => {
      active = false;
    };
  }, [companyId, router]);

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
      <LoadingState label="Iniciando acesso seguro isolado..." />
    </div>
  );
}

export default function GhostInitPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-50"><LoadingState label="Carregando..." /></div>}>
      <GhostInitPageContent />
    </Suspense>
  );
}
