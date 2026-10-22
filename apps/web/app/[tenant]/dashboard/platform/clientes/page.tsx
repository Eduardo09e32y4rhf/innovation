'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { ClipboardSignature, ScrollText } from 'lucide-react';
import { LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { PageShell } from '../_components/page-shell';
import { platformLinks } from '../_lib/platform-links';
import { visibleExtras } from '../_lib/platform-access';
import { CompaniesList } from './_components/companies-list';

export default function ClientesPage() {
  const { user } = useAuth();
  const { tenant = '' } = useParams<{ tenant: string }>();
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const links = platformLinks(tenant);
  // Contratos e Propostas são módulos congelados por flag: o atalho só existe com a flag ligada.
  const extras = visibleExtras(role, 'clientes');
  return (
    <PageShell title="Clientes" subtitle="Todas as empresas da plataforma. Abra uma para ver assinatura, faturas, usuários e histórico."
      actions={extras.length > 0 ? (
        <span className="flex flex-wrap gap-2">
          {extras.map((extra) => (
            <Link key={extra.key} href={extra.key === 'contratos' ? links.contratos() : links.propostas} className="btn btn-outline inline-flex min-h-11 items-center gap-1.5 text-sm">
              {extra.key === 'contratos' ? <ClipboardSignature size={15} aria-hidden="true" /> : <ScrollText size={15} aria-hidden="true" />} {extra.label}
            </Link>
          ))}
        </span>
      ) : undefined}>
      <Suspense fallback={<LoadingState label="Carregando empresas…" />}><CompaniesList /></Suspense>
    </PageShell>
  );
}
