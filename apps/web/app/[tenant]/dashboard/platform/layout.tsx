'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';

const devItems = [
  ['Visão geral', ''],
  ['Empresas', '/companies'],
  ['Assinaturas', '/subscriptions'],
  ['Financeiro', '/finance'],
  ['Propostas', '/proposals'],
  ['Cupons e testes', '/coupons'],
  ['Contratos', '/contracts'],
  ['Planos', '/plans'],
  ['Acessos', '/access'],
  ['WhatsApp', '/whatsapp'],
  ['Auditoria', '/audit'],
] as const;

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const params = useParams();
  const pathname = usePathname();
  const tenant = String(params?.tenant || '');
  const role = String(user?.role || user?.profile || '').toUpperCase();
  const allowed = role === 'DEV' || role === 'COMERCIAL';
  const items = role === 'DEV' ? devItems : devItems.filter(([label]) => ['Visão geral', 'Empresas', 'Propostas'].includes(label));

  if (!allowed) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">Acesso restrito à administração da plataforma.</div>;
  }

  const base = `/${tenant}/dashboard/platform`;
  return (
    <section className="min-w-0 space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Administração</p>
        <h1 className="text-2xl font-black text-slate-950">Plataforma Innovation RH</h1>
      </div>
      <nav className="flex max-w-full gap-2 overflow-x-auto pb-2" aria-label="Navegação da plataforma">
        {items.map(([label, suffix]) => {
          const href = `${base}${suffix}`;
          const active = suffix ? pathname.startsWith(href) : pathname === base || pathname === `${base}/`;
          return <Link key={label} href={href} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold ${active ? 'bg-violet-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:text-violet-700'}`}>{label}</Link>;
        })}
      </nav>
      {children}
    </section>
  );
}
