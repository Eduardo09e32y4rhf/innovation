'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { hasPermission } from '@/app/lib/permissions';
import { areaAccess } from '../platform/_lib/platform-access';
import { platformLinks } from '../platform/_lib/platform-links';
import BancoView from './_banco-view';

/** Faturas DA EMPRESA. A cobrança de todas as empresas (visão da plataforma) vive em Plataforma › Financeiro. */
export default function FaturasPage() {
  const { user } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const params = useParams();
  const tenant = String(params?.tenant || '');
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const toPlatform = areaAccess('financeiro', role) !== 'none' && hasPermission(user, 'faturas.todas_empresas');
  const aba = search.get('aba') ?? undefined;
  const busca = search.get('q') ?? undefined;

  useEffect(() => {
    if (user && toPlatform) router.replace(platformLinks(tenant).financeiro(aba, busca));
  }, [user, toPlatform, router, tenant, aba, busca]);

  if (!user || toPlatform) return <p role="status" className="p-4 text-sm text-fg-mut">Carregando...</p>;
  if (!hasPermission(user, 'faturas.ver')) {
    return (
      <section className="card-v2 m-4 p-5">
        <h1 className="text-xl font-semibold text-fg">Acesso restrito</h1>
        <p className="mt-2 text-sm text-fg-mut">Seu perfil não tem permissão para ver as faturas. Peça ao administrador.</p>
        <Link href={`/${tenant}/dashboard`} className="btn btn-outline mt-4">Voltar ao Dashboard</Link>
      </section>
    );
  }

  return <BancoView />;
}
