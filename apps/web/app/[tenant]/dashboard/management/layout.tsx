'use client';

import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import { hasPermission } from '@/app/lib/permissions';
import { cn } from '@/app/lib/cn';
import { CalendarDays, FileClock, HeartPulse, Bell, UserRoundPlus } from 'lucide-react';

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const tenant = String(params?.tenant ?? '');
  const pathname = usePathname() ?? '';
  const { user } = useAuth();
  const profile = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const canManage = ['DEV', 'ADMIN', 'RH'].includes(profile) || hasPermission(user, 'platform.manage');

  const tabs = [
    { name: 'Agenda', href: `/${tenant}/dashboard/management/agenda`, icon: CalendarDays },
    { name: 'ASO', href: `/${tenant}/dashboard/management/aso`, icon: HeartPulse },
    { name: 'Notificações', href: `/${tenant}/dashboard/management/notifications`, icon: Bell },
    ...(canManage ? [
      { name: 'Onboarding', href: `/${tenant}/dashboard/management/onboarding`, icon: UserRoundPlus },
      { name: 'Jornada e fechamento', href: `/${tenant}/dashboard/management/payroll`, icon: FileClock },
    ] : []),
  ];

  return (
    <div className="w-full px-[var(--page-pad-x)] py-[var(--page-pad-y)]">
      <header className="mb-5 flex flex-col gap-1">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-600">Gestão</p>
        <h1 className="text-[clamp(1.75rem,1.5rem+1.4vw,2.25rem)] font-black tracking-tight text-fg">Gestão de pessoas e jornada</h1>
        <p className="mt-1 max-w-3xl text-sm font-medium text-fg-mut">Controle compromissos, exames ocupacionais, onboarding e pendências administrativas.</p>
      </header>

      <nav className="card-v2 overflow-hidden p-1.5" aria-label="Navegação de gestão">
        <div className="no-scrollbar flex min-w-max gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined} className={cn(
                'flex min-h-10 items-center gap-2 rounded-v2-md px-3 text-xs font-bold transition-colors',
                active ? 'bg-brand-600 text-white shadow-v2-sm' : 'text-fg-mut hover:bg-bg-sub hover:text-brand-700 dark:hover:text-white',
              )}>
                <Icon size={15} strokeWidth={active ? 2.5 : 2} />
                {tab.name}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="mt-5 min-w-0">{children}</main>
    </div>
  );
}
