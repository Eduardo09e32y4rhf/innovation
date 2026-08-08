'use client';

import React from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { LoadingState } from '@/app/components/platform-ui';
import { EscalasNav } from './_components/escalas-nav';
import { getActiveNavItem } from './_components/escalas-nav-config';

export default function EscalasLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const params = useParams();
  const pathname = usePathname();
  const tenant = params.tenant as string;

  // Wait for auth
  if (loading) {
    return <LoadingState label="Carregando módulo de escalas..." />;
  }

  // Ensure user is authenticated - route protection handles the actual redirect
  if (!user) {
    return null;
  }

  const activeItem = getActiveNavItem(pathname, tenant);

  return (
    <div className="app-page">
      <div className="app-page-content space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-brand">
              JORNADA & PONTO
            </span>
            {activeItem && activeItem.href !== '' && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {activeItem.title}
                </span>
              </>
            )}
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Escalas</h1>
          <p className="text-sm text-slate-500">
            Jornadas, ponto, ocorrências e fechamento
          </p>
        </div>

        {/* Navigation */}
        <EscalasNav />

        {/* Main Content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}
