'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

export type ModuleNavItem = { label: string; href: string; icon?: LucideIcon; exact?: boolean };
export function ModuleNav({ items, label = 'Navegação do módulo', className = '' }: { items: ModuleNavItem[]; label?: string; className?: string }) {
  const pathname = usePathname();
  return <nav className={`workspace-module-nav ${className}`} aria-label={label}>
    {items.map(({ label: itemLabel, href, icon: Icon, exact }) => {
      const active = pathname === href || (!exact && pathname.startsWith(`${href}/`));
      return <Link key={href} href={href} aria-current={active ? 'page' : undefined}>
        {Icon && <Icon size={18} aria-hidden="true" />}<span>{itemLabel}</span>
      </Link>;
    })}
  </nav>;
}
