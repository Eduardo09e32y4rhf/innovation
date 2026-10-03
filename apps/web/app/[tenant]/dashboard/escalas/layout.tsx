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
  const tenant = String(params?.tenant ?? '');

  if (loading) return <LoadingState label="Carregando módulo de escalas..." />;
  if (!user) return null;

  const activeItem = getActiveNavItem(pathname ?? '', tenant);

  return (
    <div className="w-full px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
      <header className="mb-5 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-600">Jornada &amp; ponto</span>
          {activeItem && activeItem.href !== '' && <><span className="text-fg-sub">•</span><span className="text-[10px] font-bold uppercase tracking-wider text-fg-sub">{activeItem.title}</span></>}
        </div>
        <h1 className="text-[clamp(1.75rem,1.5rem+1.4vw,2.25rem)] font-black tracking-tight text-fg">Escalas</h1>
        <p className="text-sm font-medium text-fg-mut">Jornadas, ponto, ocorrências e fechamento</p>
      </header>

      <EscalasNav />
      <main className="mt-5 min-w-0">{children}</main>
    </div>
  );
}
