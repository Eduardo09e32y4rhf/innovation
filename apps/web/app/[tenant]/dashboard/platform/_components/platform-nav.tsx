'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type PlatformNavGroup, resolvePlatformActive } from './platform-nav-config';

export function PlatformNav({ base, groups }: { base: string; groups: PlatformNavGroup[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { group: activeGroup } = resolvePlatformActive(base, pathname, groups);
  return (
    <nav aria-label="Navegação da Plataforma" className="card-v2 min-w-0 p-2">
      <label className="block md:hidden">
        <span className="mb-1 block text-sm font-medium text-fg">Área da Plataforma</span>
        <select className="input-v2 w-full" value={activeGroup?.href ?? '/companies'} onChange={event => router.push(`${base}${event.target.value}`)}>
          {groups.map(group => <option key={group.key} value={group.href}>{group.label}</option>)}
        </select>
      </label>
      <div className="hidden flex-wrap gap-1 md:flex">
        {groups.map(group => {
          const active = activeGroup?.key === group.key;
          const Icon = group.icon;
          return <Link key={group.key} href={`${base}${group.href}`} aria-current={active ? 'page' : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${active ? 'bg-brand/10 text-brand' : 'text-fg-mut hover:bg-bg-sub hover:text-fg'}`}><Icon size={18} aria-hidden="true" />{group.label}</Link>;
        })}
      </div>
    </nav>
  );
}
