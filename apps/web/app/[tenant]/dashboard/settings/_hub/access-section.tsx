'use client';

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export function AccessSection({ tenant }: { tenant: string }) {
  return (
    <section className="card-v2 space-y-3 p-5">
      <h2 className="text-base font-semibold text-fg">Acessos e usuários</h2>
      <p className="text-sm text-fg-sub">Criar acessos, atrelar a funcionários, mudar a visão, bloquear ou cancelar, gerar senha provisória e consultar o histórico dos últimos 30 dias (com PDF) ficam todos na tela de Usuários.</p>
      <Link href={`/${tenant}/dashboard/users`} className="btn btn-primary btn-md inline-flex">Abrir Usuários <ArrowUpRight size={14} aria-hidden="true" /></Link>
    </section>
  );
}
