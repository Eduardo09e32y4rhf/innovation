'use client';

import type { ReactNode } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { PlatformNav } from './_components/platform-nav';
import { getPlatformNavGroups, resolvePlatformActive } from './_components/platform-nav-config';

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const params = useParams();
  const pathname = usePathname();
  const tenant = String(params?.tenant || '');
  const role = String(user?.role || user?.profile || '').toUpperCase();
  const allowed = role === 'DEV' || role === 'COMERCIAL' || role === 'ADMIN';

  if (!allowed) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">Acesso restrito a administracao da plataforma.</div>;
  }

  const base = `/${tenant}/dashboard/platform`;
  const groups = getPlatformNavGroups(role);
  const { group: activeGroup } = resolvePlatformActive(base, pathname, groups);

  return (
    <section className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Administração</p>
          <h1 className="text-3xl font-black text-slate-950">Plataforma Innovation RH</h1>
          {activeGroup && pathname !== base && (
            <p className="mt-1 text-xs font-medium text-slate-400">{activeGroup.label}</p>
          )}
        </div>
        <p className="max-w-sm text-left sm:text-right text-xs font-medium text-slate-500">Um console unico para empresas, vendas, contratos e cobrancas.</p>
      </div>
      
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="w-full md:w-64 shrink-0">
          <PlatformNav base={base} groups={groups} />
        </aside>
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </section>
  );
}
