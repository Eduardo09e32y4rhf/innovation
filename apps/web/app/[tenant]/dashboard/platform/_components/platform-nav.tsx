'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { resolvePlatformActive, type PlatformNavGroup } from './platform-nav-config';

export function PlatformNav({ base, groups }: { base: string; groups: PlatformNavGroup[] }) {
  const pathname = usePathname();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLElement>(null);
  const { group: activeGroup } = resolvePlatformActive(base, pathname, groups);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenKey(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setOpenKey(null);
  }, [pathname]);

  function isItemActive(href: string) {
    const full = `${base}${href}`;
    return href ? pathname.startsWith(full) : pathname === base || pathname === `${base}/`;
  }

  return (
    <nav ref={containerRef} className="relative flex items-center gap-1 border-b border-slate-200" aria-label="Navegação da plataforma">
      {groups.map((group) => {
        const isGroupActive = activeGroup?.key === group.key;

        if (group.items.length === 1) {
          const item = group.items[0];
          return (
            <Link
              key={group.key}
              href={`${base}${item.href}`}
              className={`relative px-4 py-3 text-sm font-semibold transition-colors ${isGroupActive ? 'text-violet-700' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {group.label}
              {isGroupActive && <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-violet-600" />}
            </Link>
          );
        }

        const isOpen = openKey === group.key;
        return (
          <div key={group.key} className="relative">
            <button
              type="button"
              onClick={() => setOpenKey(isOpen ? null : group.key)}
              className={`relative flex items-center gap-1 px-4 py-3 text-sm font-semibold transition-colors ${isGroupActive ? 'text-violet-700' : 'text-slate-500 hover:text-slate-900'}`}
              aria-expanded={isOpen}
              aria-haspopup="true"
            >
              {group.label}
              <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              {isGroupActive && <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-violet-600" />}
            </button>
            {isOpen && (
              <div className="absolute left-0 top-full z-[100] mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl">
                {group.items.map((item) => {
                  const itemActive = isItemActive(item.href);
                  return (
                    <Link
                      key={item.label}
                      href={`${base}${item.href}`}
                      onClick={() => setOpenKey(null)}
                      className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${itemActive ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
