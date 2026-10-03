'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
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
  const base = `/${tenant}/dashboard/platform`;
  const groups = getPlatformNavGroups(role);
  const { group } = resolvePlatformActive(base, pathname, groups);
  const isCompanyDetail = /^\/[^/]+\/dashboard\/platform\/[^/]+$/.test(pathname)
    && !['companies', 'finance', 'accounting', 'contracts', 'proposals', 'subscriptions', 'plans', 'configuration', 'permissions', 'access', 'coupons', 'whatsapp', 'audit', 'support', 'intelligence'].includes(pathname.split('/').pop() || '');
  const allowed = ['DEV', 'CEO', 'COMERCIAL'].includes(role) && (Boolean(group) || isCompanyDetail);

  if (!user) return <p role="status" className="p-4 text-sm text-fg-mut">Carregando acesso à Plataforma...</p>;
  if (!allowed) return <section className="card-v2 m-4 p-5"><h1 className="text-xl font-semibold text-fg">Acesso restrito</h1><p className="mt-2 text-sm text-fg-mut">Seu perfil não tem autorização para esta área da Plataforma.</p><Link href={`/${tenant}/dashboard`} className="btn btn-outline mt-4">Voltar ao Dashboard</Link></section>;

  return (
    <section className="min-w-0 w-full space-y-4 px-3 py-4 sm:px-5 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-fg-mut">
        <Link href={base} className="font-semibold text-fg hover:underline">Plataforma</Link>
        <span>Operação global · {role}</span>
      </div>
      <PlatformNav base={base} groups={groups} />
      <div className="min-w-0">{children}</div>
    </section>
  );
}
