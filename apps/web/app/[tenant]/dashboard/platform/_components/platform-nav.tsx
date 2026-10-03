'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type PlatformNavGroup, resolvePlatformActive } from './platform-nav-config';

export function PlatformNav({ base, groups }: { base: string; groups: PlatformNavGroup[] }) {
  const pathname = usePathname();
  const { group: activeGroup } = resolvePlatformActive(base, pathname, groups);

  return (
    <nav className="flex w-full gap-2 overflow-x-auto pb-1 lg:flex-col" aria-label="Navegação da plataforma">
      {groups.map((group) => {
        const isActive = activeGroup?.key === group.key;
        const Icon = group.icon;
        return (
          <Link
            key={group.key}
            href={`${base}${group.href}`}
            className={`group flex min-w-[210px] items-center gap-3 rounded-v2 border px-3 py-3 text-left transition-all lg:min-w-0 ${
              isActive
                ? 'border-brand/20 bg-brand/10 text-brand shadow-v2-sm'
                : 'border-transparent text-fg-mut hover:bg-bg-sub hover:text-fg'
            }`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-v2 ${isActive ? 'bg-brand text-white' : 'bg-bg-sub text-fg-sub group-hover:text-fg'}`}><Icon size={16} /></span>
            <span className="min-w-0"><span className="block truncate text-xs font-black">{group.label}</span><span className="mt-0.5 block truncate text-[10px] font-medium opacity-70">{group.description}</span></span>
          </Link>
        );
      })}
    </nav>
  );
}
