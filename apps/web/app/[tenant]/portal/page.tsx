'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { PageHeader } from '@/app/components/ui/page-header';
export default function PortalHomePage() {
  const { user } = useAuth();
  const { tenant = '' } = useParams<{ tenant: string }>();
  const base = '/' + encodeURIComponent(tenant) + '/portal';
  return <div className="space-y-5">
    <PageHeader title={'Olá, ' + (user?.name || 'funcionário')} subtitle="Acesse suas informações e os serviços do RH." />
    <div className="grid gap-4 sm:grid-cols-2">{[
      ['/ponto', 'Meu ponto', 'Acesse o registro e a consulta de ponto no módulo disponível.'],
      ['/ferias', 'Férias', 'Consulte a disponibilidade das informações pessoais de férias.'],
      ['/holerites', 'Holerites', 'Consulte a disponibilidade dos recibos publicados.'],
      ['/documentos', 'Documentos', 'Consulte a disponibilidade de documentos para você.'],
    ].map(([suffix, title, description]) => <Link key={suffix} href={base + suffix} className="card-v2 space-y-2 p-5 hover:border-brand focus-visible:ring-2 focus-visible:ring-brand"><h2 className="font-semibold">{title}</h2><p className="text-sm leading-6 text-fg-mut">{description}</p><span className="inline-block text-sm font-medium text-brand">Acessar</span></Link>)}</div>
    <section className="card-v2 space-y-2 p-5"><h2 className="font-semibold">Informações do portal</h2><p className="text-sm leading-6 text-fg-mut">Férias, holerites e documentos pessoais dependem da integração e da publicação pelo RH. As páginas indicam a disponibilidade atual.</p></section>
  </div>;
}
