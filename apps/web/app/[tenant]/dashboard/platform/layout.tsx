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
  const role = String(user?.profile || user?.role || '').toUpperCase();
  const allowed = role === 'DEV' || role === 'CEO' || role === 'COMERCIAL' || role === 'ADMIN';

  if (!allowed) {
    return <div className="w-full px-[var(--page-pad-x)] py-[var(--page-pad-y)]"><div className="card-v2 mx-auto max-w-2xl p-8 text-center"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-danger">Administração</p><h1 className="mt-2 text-xl font-black text-fg">Acesso restrito à Plataforma</h1><p className="mt-2 text-sm text-fg-mut">Esta área está disponível somente para perfis autorizados da operação administrativa.</p></div></div>;
  }

  const base = `/${tenant}/dashboard/platform`;
  const groups = getPlatformNavGroups(role);
  const { group: activeGroup } = resolvePlatformActive(base, pathname, groups);

  return (
    <section className="w-full px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
      <div className="flex flex-col gap-5">
      <header className="card-v2 relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2"><span className="chip-brand text-[10px] font-black uppercase tracking-[0.14em]">Console administrativo</span><span className="text-[10px] font-bold text-fg-sub">{role}</span></div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-fg sm:text-3xl">Plataforma Innovation RH</h1>
            {activeGroup && pathname !== base && <p className="mt-1 text-sm font-medium text-fg-mut">{activeGroup.label} · {activeGroup.description}</p>}
            {pathname === base && <p className="mt-1 text-sm font-medium text-fg-mut">Um cockpit para empresas, vendas, contratos, cobrança e saúde operacional.</p>}
          </div>
          <div className="flex items-center gap-2 rounded-v2 border border-border bg-bg-sub px-3 py-2 text-[11px] font-bold text-fg-mut"><span className="h-2 w-2 animate-pulse rounded-full bg-brand" /> Ambiente protegido</div>
        </div>
      </header>
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside className="card-v2 sticky top-4 w-full p-2 lg:w-auto">
          <p className="hidden px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.14em] text-fg-sub lg:block">Navegação da plataforma</p>
          <PlatformNav base={base} groups={groups} />
        </aside>
        <main className="min-w-0">
          {children}
        </main>
      </div>
      </div>
    </section>
  );
}
