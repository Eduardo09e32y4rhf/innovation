'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { X } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { hasPermission } from '@/app/lib/permissions';
import { ROLE_LABEL } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';
import { cn } from '@/app/lib/cn';
import { NAV_ITEMS, isNavActive, type NavItem } from './nav-config';

function canSeeItem(item: NavItem, user: any) {
  if (item.label === 'UsuÃ¡rios' && !hasPermission(user, 'users.manage_employees')) return false;
  if (item.label === 'GestÃ£o' && !hasPermission(user, 'platform.manage') && !hasPermission(user, 'users.view_team')) return false;
  if (item.label === 'FuncionÃ¡rios' && !hasPermission(user, 'users.manage_employees') && !hasPermission(user, 'users.view_team')) return false;
  if (item.label === 'Plataforma' && !hasPermission(user, 'platform.manage')) return false;
  return !item.roles?.length || item.roles.includes(String(user?.profile || '').toUpperCase());
}

export function SidebarV2({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const params = useParams();
  const tenant = String(params?.tenant ?? '');
  const { user } = useAuth();
  const profile = String(user?.profile ?? '').toUpperCase();
  const company = useQuery(() => api.companies.me(), []);
  const activeModules = company.data?.activeModules || ['employees', 'time-track', 'vacations', 'management'];

  const items = NAV_ITEMS
    .filter((item) => canSeeItem(item, user))
    .filter((item) => !item.moduleKey || activeModules.includes(item.moduleKey));

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col',
          'w-[min(86vw,300px)] lg:w-[var(--sidebar-w,264px)]',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-[110%] lg:translate-x-0',
          // Desktop flutuante: sticky + margem + glass + radius grande
          'lg:sticky lg:top-3 lg:left-3 lg:m-3 lg:h-[calc(100dvh-1.5rem)]',
          'lg:rounded-v2-3xl glass shadow-v2-lg',
          // Mobile: full-screen com fundo sÃ³lido
          'bg-bg-elev lg:bg-transparent',
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <Link
            href={`/${tenant}/dashboard`}
            className="flex items-center gap-2.5 min-w-0"
            onClick={onClose}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-v2-md bg-brand-600 text-white text-sm font-black shadow-v2-sm">
              {company.data?.logoUrl ? (
                <img src={company.data.logoUrl} alt="Logo" className="h-full w-full object-contain bg-white" />
              ) : 'IR'}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-fg">
                {normalizeDisplayName(company.data?.name) || 'Innovation RH'}
              </span>
              <span className="block truncate text-[10px] font-bold uppercase tracking-[0.16em] text-fg-sub">
                People Platform
              </span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-fg-mut hover:bg-bg-sub hover:text-fg lg:hidden"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <div className="px-3 pb-1">
          <p className="px-3 text-[10px] font-black uppercase tracking-[0.18em] text-fg-sub">
            Menu principal
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4 no-scrollbar">
          <ul className="space-y-1">
            <Suspense fallback={null}>
              {items.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(pathname ?? '', tenant, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={`/${tenant}${item.href}`}
                      onClick={onClose}
                      className={cn(
                        'group flex h-11 items-center gap-3 rounded-v2-md px-3.5 text-[13px] font-bold transition-all',
                        active
                          ? 'bg-brand-600 text-white shadow-v2-sm'
                          : 'text-fg-mut hover:bg-brand-500/8 hover:text-brand-700 dark:hover:text-white',
                      )}
                    >
                      <Icon size={18} strokeWidth={active ? 2.6 : 2.1} className="shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />}
                    </Link>
                  </li>
                );
              })}
            </Suspense>
          </ul>
        </nav>

        {/* Footer: user card */}
        <div className="border-t border-border/60 p-3">
          <UserChip name={user?.name} email={user?.email} profile={profile} />
        </div>
      </aside>
    </>
  );
}

function UserChip({ name, email, profile }: { name?: string; email?: string; profile?: string }) {
  const initials = (name || email || 'US')
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((p) => p[0]).join('').toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-v2-md p-2 transition-colors hover:bg-bg-sub">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-black text-white shadow-v2-sm">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-black text-fg">
          {normalizeDisplayName(name) || email || 'UsuÃ¡rio'}
        </p>
        <p className="truncate text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
          {ROLE_LABEL[profile || ''] ?? profile ?? 'Perfil'}
        </p>
      </div>
    </div>
  );
}