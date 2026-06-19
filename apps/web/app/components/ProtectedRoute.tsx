'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="ops-dashboard flex min-h-screen items-center justify-center px-4">
        <div className="ops-card flex w-full max-w-sm flex-col items-center rounded-[8px] border border-slate-200 bg-white p-8 text-center">
          <div className="crystal-button mb-5 flex h-14 w-14 items-center justify-center rounded-[8px] text-2xl font-black text-white">
            I
          </div>
          <Loader2 className="mb-4 h-7 w-7 animate-spin text-teal-600" aria-hidden="true" />
          <p className="text-sm font-black text-slate-900">Preparando seu acesso</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Validando sessao e permissoes.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};