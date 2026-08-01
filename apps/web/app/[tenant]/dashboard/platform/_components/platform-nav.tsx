'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type PlatformNavGroup, resolvePlatformActive } from './platform-nav-config';

export function PlatformNav({ base, groups }: { base: string; groups: PlatformNavGroup[] }) {
  const pathname = usePathname();
  const { group: activeGroup } = resolvePlatformActive(base, pathname, groups);

  return (
    <nav className="flex flex-col gap-1 w-full" aria-label="Navegacao da plataforma">
      {groups.map((group) => {
        const isActive = activeGroup?.key === group.key;
        return (
          <Link
            key={group.key}
            href={`${base}${group.href}`}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
              isActive
                ? 'bg-white text-violet-700 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
            }`}
          >
            {group.label}
          </Link>
        );
      })}
    </nav>
  );
}
