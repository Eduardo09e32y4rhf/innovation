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
    <section className="min-w-0 space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Administracao</p>
          <h1 className="text-2xl font-black text-slate-950">Plataforma Innovation RH</h1>
          {activeGroup && pathname !== base && (
            <p className="mt-1 text-xs font-medium text-slate-400">{activeGroup.label}</p>
          )}
        </div>
        <p className="max-w-sm text-right text-xs font-medium text-slate-500">Um console unico para empresas, vendas, contratos e cobrancas.</p>
      </div>
      <PlatformNav base={base} groups={groups} />
      {children}
    </section>
  );
}
