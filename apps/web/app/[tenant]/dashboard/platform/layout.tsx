'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams, usePathname } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { TAB_POLICY } from './_hub/types';

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const params = useParams();
  const pathname = usePathname();
  const tenant = String(params?.tenant || '');
  const role = String(user?.profile || user?.role || '').toUpperCase();
  const base = `/${tenant}/dashboard/platform`;
  const isHub = pathname.replace(/\/+$/, '') === base;
  const allowed = Boolean(TAB_POLICY[role]);
  // Subpáginas especializadas (planos, cupons, contratos...) são do time comercial/DEV/CEO; a Contabilidade só usa o hub.
  const specialist = ['DEV', 'CEO', 'COMERCIAL'].includes(role);

  if (!user) return <p role="status" className="p-4 text-sm text-fg-mut">Carregando acesso à Plataforma...</p>;
  if (!allowed || (!isHub && !specialist)) {
    return <section className="card-v2 m-4 p-5"><h1 className="text-xl font-semibold text-fg">Acesso restrito</h1><p className="mt-2 text-sm text-fg-mut">Seu perfil não tem autorização para esta área da Plataforma.</p><Link href={`/${tenant}/dashboard`} className="btn btn-outline mt-4">Voltar ao Dashboard</Link></section>;
  }

  return (
    <section className="min-w-0 w-full">
      {!isHub && (
        <div className="px-3 pt-4 sm:px-5 lg:px-6">
          <Link href={base} className="inline-flex items-center gap-1 text-sm font-medium text-fg-sub hover:text-fg"><ArrowLeft size={15} aria-hidden="true" /> Voltar para a Plataforma</Link>
        </div>
      )}
      <div className="min-w-0">{children}</div>
    </section>
  );
}
