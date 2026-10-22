'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { PlatformSidebar } from './_components/platform-sidebar';
import { areaAccess, areaForSegment, areaHref, landingArea, visibleAreas } from './_lib/platform-access';

/** Protege cada área pela mesma tabela do menu (`platform-access.ts`) e monta o menu lateral. */
export default function PlatformLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const tenant = String(params?.tenant || '');
  const role = String(user?.profile || user?.role || '').toUpperCase();
  const base = `/${tenant}/dashboard/platform`;
  const segment = pathname.slice(base.length);
  const area = areaForSegment(segment);
  const areas = visibleAreas(role);
  const allowed = Boolean(area) && areaAccess(area!.key, role) !== 'none';
  const landing = landingArea(role);
  const atRoot = segment.replace(/\/+$/, '') === '';

  // Quem não tem a Visão geral (Comercial, Contabilidade) abre a primeira área que pode usar.
  useEffect(() => {
    if (user && !allowed && atRoot && landing) router.replace(areaHref(tenant, landing));
  }, [user, allowed, atRoot, landing, router, tenant]);

  if (!user) return <p role="status" className="p-4 text-sm text-fg-mut">Carregando acesso à Plataforma...</p>;
  if (!allowed) {
    if (atRoot && landing) return <p role="status" className="p-4 text-sm text-fg-mut">Abrindo a Plataforma...</p>;
    return (
      <section className="card-v2 m-4 p-5">
        <h1 className="text-xl font-semibold text-fg">Acesso restrito</h1>
        <p className="mt-2 text-sm text-fg-mut">Seu perfil não tem autorização para esta área da Plataforma.</p>
        <Link href={landing ? areaHref(tenant, landing) : `/${tenant}/dashboard`} className="btn btn-outline mt-4">{landing ? `Ir para ${landing.label}` : 'Voltar ao Dashboard'}</Link>
      </section>
    );
  }

  return (
    <div className="flex min-w-0 w-full flex-col md:flex-row">
      <PlatformSidebar tenant={tenant} areas={areas} current={area?.key} />
      <section className="min-w-0 flex-1">{children}</section>
    </div>
  );
}
