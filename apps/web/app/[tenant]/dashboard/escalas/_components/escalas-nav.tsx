'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { getVisibleNavItems, getActiveNavItem } from './escalas-nav-config';

export function EscalasNav() {
  const pathname = usePathname();
  const params = useParams();
  const { user } = useAuth();
  
  const tenant = params.tenant as string;
  const basePath = `/${tenant}/dashboard/escalas`;
  
  const items = getVisibleNavItems(user?.role);
  const activeItem = getActiveNavItem(pathname, tenant);

  return (
    <div className="w-full border-b border-slate-200 mt-6">
      <nav className="flex overflow-x-auto no-scrollbar" aria-label="Navegação Escalas">
        <div className="flex min-w-full space-x-6 px-1">
          {items.map((item) => {
            const href = `${basePath}${item.href}`;
            const isActive = activeItem?.href === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={href}
                className={`
                  flex items-center gap-2 whitespace-nowrap py-3 px-1 text-sm font-medium transition-colors border-b-2
                  ${
                    isActive
                      ? 'border-[#8A05BE] text-[#8A05BE]'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
