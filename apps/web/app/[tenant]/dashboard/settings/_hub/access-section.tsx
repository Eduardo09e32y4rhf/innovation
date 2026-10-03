'use client';

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { EmployeePasswordResetSection } from '../_components/employee-password-reset-section';

export function AccessSection({ tenant }: { tenant: string }) {
  return (
    <div className="space-y-4">
      <section className="card-v2 flex flex-wrap items-center justify-between gap-3 p-5">
        <div><h2 className="text-base font-semibold text-fg">Usuários e permissões</h2><p className="text-sm text-fg-sub">Criar acessos, definir perfis, bloquear e redefinir senhas.</p></div>
        <Link href={`/${tenant}/dashboard/users`} className="btn btn-outline btn-md">Abrir Usuários <ArrowUpRight size={14} aria-hidden="true" /></Link>
      </section>
      <EmployeePasswordResetSection />
    </div>
  );
}
