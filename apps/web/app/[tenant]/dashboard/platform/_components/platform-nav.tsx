'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletCards, FileText, Settings, Sparkles } from 'lucide-react';
import { resolvePlatformActive, type PlatformNavGroup } from './platform-nav-config';

const GROUP_ICONS: Record<string, any> = {
  finance: WalletCards,
  contracts: FileText,
  settings: Settings,
};

export function PlatformNav({ base, groups }: { base: string; groups: PlatformNavGroup[] }) {
  const pathname = usePathname();
  const { group: activeGroup } = resolvePlatformActive(base, pathname, groups);

  function isItemActive(href: string) {
    const full = `${base}${href}`;
    return href ? pathname.startsWith(full) : pathname === base || pathname === `${base}/`;
  }

  return (
    <div className="space-y-4">
      {/* Abas Principais (Sem Dropdowns!) */}
      <nav className="flex max-w-full items-center gap-2 overflow-x-auto rounded-[16px] border border-slate-200/80 bg-white p-1.5 shadow-sm">
        {groups.map((group) => {
          const isGroupActive = activeGroup?.key === group.key;
          const Icon = GROUP_ICONS[group.key] || Sparkles;
          const firstHref = group.items[0]?.href ?? '';

          return (
            <Link
              key={group.key}
              href={`${base}${firstHref}`}
              className={`flex items-center gap-2.5 whitespace-nowrap rounded-[12px] px-5 py-3 text-sm font-black transition-all ${
                isGroupActive
                  ? 'bg-slate-950 text-white shadow-md shadow-slate-950/10'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <Icon size={16} className={isGroupActive ? 'text-teal-400' : 'text-slate-400'} />
              {group.label}
            </Link>
          );
        })}
      </nav>

      {/* Sub-navegação em Pílulas Horizontais (Simples e Direta) */}
      {activeGroup && activeGroup.items.length > 1 && (
        <div className="flex max-w-full flex-wrap items-center gap-1.5 rounded-[14px] border border-slate-200/60 bg-slate-50/70 p-1.5">
          {activeGroup.items.map((item) => {
            const active = isItemActive(item.href);
            return (
              <Link
                key={item.label}
                href={`${base}${item.href}`}
                className={`rounded-[10px] px-3.5 py-2 text-xs font-bold transition-all ${
                  active
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-xs border border-slate-200/60'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
