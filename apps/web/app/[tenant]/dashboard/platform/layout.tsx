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
  const allowed = role === 'DEV' || role === 'COMERCIAL';

  if (!allowed) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">Acesso restrito à administração da plataforma.</div>;
  }

  const base = `/${tenant}/dashboard/platform`;
  const groups = getPlatformNavGroups(role);
  const { group: activeGroup, item: activeItem } = resolvePlatformActive(base, pathname, groups);
  const showBreadcrumb = !!activeGroup && !!activeItem && activeGroup.items.length > 1;

  return (
    <section className="min-w-0 space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Administração</p>
        <h1 className="text-2xl font-black text-slate-950">Plataforma Innovation RH</h1>
        {showBreadcrumb && (
          <p className="mt-1 text-xs font-medium text-slate-400">
            {activeGroup!.label} <span className="mx-1.5 text-slate-300">/</span> {activeItem!.label}
          </p>
        )}
      </div>
      <PlatformNav base={base} groups={groups} />
      {children}
    </section>
  );
}
