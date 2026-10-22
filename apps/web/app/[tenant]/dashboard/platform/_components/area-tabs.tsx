'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { PlatformTab } from '../_lib/platform-access';

/** Abas de uma área (um único nível). A aba atual vem da URL (`?aba=`); rolagem horizontal no celular. */
export function AreaTabs({ tabs, current, label, param = 'aba', keepParams = [] }: { tabs: PlatformTab[]; current?: string; label: string; param?: string; keepParams?: string[] }) {
  const pathname = usePathname();
  const search = useSearchParams();
  if (tabs.length < 2) return null;
  const hrefFor = (key: string) => {
    const next = new URLSearchParams();
    for (const name of keepParams) { const value = search.get(name); if (value) next.set(name, value); }
    next.set(param, key);
    return `${pathname}?${next.toString()}`;
  };
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto px-1">
      <ul className="flex min-w-max gap-1.5">
        {tabs.map((tab) => (
          <li key={tab.key}>
            <Link href={hrefFor(tab.key)} replace scroll={false} aria-current={current === tab.key ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold transition ${current === tab.key ? 'bg-slate-900 text-white shadow' : 'border border-border text-fg-sub hover:bg-bg-sub hover:text-fg'}`}>{tab.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
