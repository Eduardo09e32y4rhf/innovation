'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { hasPermission } from '@/app/lib/permissions';
import BancoView from './_banco-view';
import PlatformFaturas from './_platform-tabs';

export default function FaturasPage() {
  const { user } = useAuth();
  const params = useParams();
  const tenant = String(params?.tenant || '');

  if (!user) return <p role="status" className="p-4 text-sm text-fg-mut">Carregando...</p>;
  if (!hasPermission(user, 'faturas.ver')) {
    return (
      <section className="card-v2 m-4 p-5">
        <h1 className="text-xl font-semibold text-fg">Acesso restrito</h1>
        <p className="mt-2 text-sm text-fg-mut">Seu perfil não tem permissão para ver as faturas. Peça ao administrador.</p>
        <Link href={`/${tenant}/dashboard`} className="btn btn-outline mt-4">Voltar ao Dashboard</Link>
      </section>
    );
  }

  // Visão plataforma (todas as empresas) para quem tem faturas.todas_empresas; os demais veem a própria empresa.
  return hasPermission(user, 'faturas.todas_empresas') ? <PlatformFaturas /> : <BancoView />;
}
