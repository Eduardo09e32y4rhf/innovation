'use client';

import { usePathname, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import { hasPermission } from '@/app/lib/permissions';
import { cn } from '@/app/lib/cn';
import { CalendarDays, FileClock, HeartPulse, Bell, UserRoundPlus } from 'lucide-react';
import styles from '../escalas/_components/operational-ui.module.css';

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const tenant = String(params?.tenant ?? '');
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { user } = useAuth();
  const profile = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const canManage = ['DEV', 'ADMIN', 'RH'].includes(profile);

  const tabs = [
    { name: 'Agenda', href: `/${tenant}/dashboard/management/agenda`, icon: CalendarDays },
    { name: 'ASO', href: `/${tenant}/dashboard/management/aso`, icon: HeartPulse },
    { name: 'Comunicados', href: `/${tenant}/dashboard/management/notifications`, icon: Bell },
    ...(canManage ? [
      { name: 'Folha de pagamento', href: `/${tenant}/dashboard/management/payroll`, icon: FileClock },
      { name: 'Admissão', href: `/${tenant}/dashboard/management/onboarding`, icon: UserRoundPlus },
    ] : []),
  ];

  return (
    <div className={`${styles.surface} w-full min-w-0 space-y-5`}>
      <p className="text-sm text-fg-mut">Gestão</p>

      <label className="block md:hidden">
        <span className="mb-1 block text-sm font-medium">Área de Gestão</span>
        <select className="input-v2 w-full" value={tabs.find(tab => pathname.startsWith(tab.href))?.href ?? tabs[0].href} onChange={event => router.push(event.target.value)}>
          {tabs.map(tab => <option key={tab.href} value={tab.href}>{tab.name}</option>)}
        </select>
      </label>

      <nav className="card-v2 hidden overflow-x-auto p-1.5 md:block" aria-label="Navegação de gestão">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined} className={cn(
                'flex min-h-11 items-center gap-2 rounded-v2-md px-3 text-sm font-medium transition-colors',
                active ? 'bg-brand-600 text-white shadow-v2-sm' : 'text-fg-mut hover:bg-bg-sub hover:text-brand-700 dark:hover:text-white',
              )}>
                <Icon size={15} strokeWidth={active ? 2.5 : 2} />
                {tab.name}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
