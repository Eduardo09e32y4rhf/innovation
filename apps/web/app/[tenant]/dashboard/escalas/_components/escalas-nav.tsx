'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { cn } from '@/app/lib/cn';
import { getVisibleNavItems, getActiveNavItem } from './escalas-nav-config';

export function EscalasNav() {
  const pathname = usePathname();
  const params = useParams();
  const { user } = useAuth();
  const tenant = String(params?.tenant ?? '');
  const basePath = `/${tenant}/dashboard/escalas`;
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const items = getVisibleNavItems(role);
  const activeItem = getActiveNavItem(pathname ?? '', tenant);

  return (
    <div className="card-v2 overflow-hidden">
      <nav className="no-scrollbar flex overflow-x-auto p-1.5" aria-label="Navegação de escalas">
        <div className="flex min-w-max gap-1">
          {items.map((item) => {
            const href = `${basePath}${item.href}`;
            const isActive = activeItem?.href === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-10 items-center gap-2 whitespace-nowrap rounded-v2-md px-3 text-xs font-bold transition-colors',
                  isActive ? 'bg-brand-600 text-white shadow-v2-sm' : 'text-fg-mut hover:bg-bg-sub hover:text-brand-700 dark:hover:text-white',
                )}
              >
                <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                {item.title}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
