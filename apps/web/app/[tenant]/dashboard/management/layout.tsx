'use client';

import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import { hasPermission } from '@/app/lib/permissions';

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const tenant = params?.tenant as string;
  const pathname = usePathname();
  const { user } = useAuth();
  
  const profile = user?.profile?.toUpperCase();
  const canManage = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH';

  const TABS = [
    { name: 'Agenda', href: `/${tenant}/dashboard/management/agenda` },
    { name: 'ASO', href: `/${tenant}/dashboard/management/aso` },
    { name: 'Notificações', href: `/${tenant}/dashboard/management/notifications` },
  ];

  if (canManage) {
    TABS.push({ name: 'Jornada e Fechamento', href: `/${tenant}/dashboard/management/payroll` });
  }

  return (
    <div className="app-page">
      <div className="app-page-content">
        <header className="page-header">
          <div>
            <p className="page-label">GESTÃO</p>
            <h2 className="page-title">Gestão de pessoas e jornada</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Controle compromissos, exames ocupacionais e pendências administrativas dos colaboradores.
            </p>
          </div>
        </header>

        <div className="tab-bar">
          {TABS.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={isActive ? 'tab-item-active' : 'tab-item'}
              >
                {tab.name}
              </Link>
            );
          })}
        </div>

        <div className="mt-4">
          {children}
        </div>
      </div>
    </div>
  );
}
