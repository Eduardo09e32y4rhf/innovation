'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type PlatformNavGroup, resolvePlatformActive } from './platform-nav-config';

export function PlatformNav({ base, groups }: { base: string; groups: PlatformNavGroup[] }) {
  const pathname = usePathname();
  const { group: activeGroup } = resolvePlatformActive(base, pathname, groups);

  return (
    <nav className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Navegacao da plataforma">
      {groups.map((group) => {
        const isActive = activeGroup?.key === group.key;
        return (
          <Link
            key={group.key}
            href={`${base}${group.href}`}
            className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-bold transition-colors ${
              isActive ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
            }`}
          >
            {group.label}
          </Link>
        );
      })}
    </nav>
  );
}
