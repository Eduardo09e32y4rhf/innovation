'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Home, Users, Clock3, CalendarDays, Menu } from 'lucide-react';
import { cn } from '@/app/lib/cn';

const ITEMS = [
  { label: 'InÃ­cio',  href: '/dashboard',           icon: Home,         match: '/dashboard' },
  { label: 'Equipe',  href: '/dashboard/employees', icon: Users,        match: '/dashboard/employees' },
  { label: 'Escalas', href: '/dashboard/escalas',   icon: Clock3,       match: '/dashboard/escalas' },
  { label: 'FÃ©rias',  href: '/dashboard/vacations', icon: CalendarDays, match: '/dashboard/vacations' },
];

export function MobileBottomNav({ onMenu }: { onMenu?: () => void }) {
  const pathname = usePathname();
  const params = useParams();
  const tenant = String(params?.tenant ?? '');

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 lg:hidden glass border-t border-border/60 safe-b">
      <ul className="flex items-center justify-around px-2 py-2">
        {ITEMS.map((item) => {
          const route = `/${tenant}${item.match}`;
          const active =
            item.href === '/dashboard'
              ? pathname === route || pathname === `${route}/`
              : pathname?.startsWith(route);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={`/${tenant}${item.href}`}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-v2-md px-3 py-1.5 min-w-[64px] transition-colors',
                  active ? 'text-brand-600' : 'text-fg-mut',
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.6 : 2} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onMenu}
            className="flex flex-col items-center gap-1 rounded-v2-md px-3 py-1.5 min-w-[64px] text-fg-mut"
          >
            <Menu size={20} strokeWidth={2} />
            <span className="text-[10px] font-bold">Mais</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}