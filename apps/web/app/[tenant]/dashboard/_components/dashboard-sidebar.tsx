'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import {
  Building2, Briefcase, CalendarDays, CalendarRange, HelpCircle,
  LayoutDashboard, Settings2, ShieldCheck, Users, UserRoundCog, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { hasPermission } from '@/app/lib/permissions';
import { ROLE_LABEL } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';

type NavItemConfig = { label: string; href: string; icon: LucideIcon; roles?: string[]; moduleKey?: string };

const BASE_NAV_ITEMS: NavItemConfig[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['DEV', 'CEO', 'CONTABIL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'] },
  { label: 'Funcionários', href: '/dashboard/employees', icon: Users, roles: ['DEV', 'ADMIN', 'RH', 'GESTOR', 'CONSULTA'], moduleKey: 'employees' },
  { label: 'Escalas', href: '/dashboard/escalas', icon: CalendarRange, roles: ['DEV', 'CEO', 'CONTABIL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'], moduleKey: 'time-track' },
  { label: 'Férias', href: '/dashboard/vacations', icon: CalendarDays, roles: ['DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'], moduleKey: 'vacations' },
  { label: 'Gestão', href: '/dashboard/management', icon: ShieldCheck, roles: ['DEV', 'ADMIN', 'RH', 'GESTOR'], moduleKey: 'management' },
  { label: 'Usuários', href: '/dashboard/users', icon: UserRoundCog, roles: ['DEV', 'ADMIN', 'RH'] },
  { label: 'Configurações', href: '/dashboard/settings', icon: Settings2, roles: ['DEV', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'] },
  { label: 'Suporte', href: '/dashboard/support', icon: HelpCircle, roles: ['DEV', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'] },
];

function canSeeItem(item: NavItemConfig, user: any) {
  if (item.label === 'Usuários' && !hasPermission(user, 'users.manage_employees')) return false;
  if (item.label === 'Gestão' && !hasPermission(user, 'platform.manage') && !hasPermission(user, 'users.view_team')) return false;
  if (item.label === 'Funcionários' && !hasPermission(user, 'users.manage_employees') && !hasPermission(user, 'users.view_team')) return false;
  return !item.roles?.length || item.roles.includes(String(user?.profile || '').toUpperCase());
}

function isActive(pathname: string | null, item: NavItemConfig, tenant: string) {
  const route = `/${tenant}${item.href}`;
  if (item.href === '/dashboard') return pathname === route || pathname === `${route}/`;
  return Boolean(pathname?.startsWith(route));
}

export function DashboardSidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const params = useParams();
  const tenant = String(params?.tenant ?? '');
  const { user } = useAuth();
  const company = useQuery(() => api.companies.me(), []);
  const profile = String(user?.profile ?? '').toUpperCase();
  const activeModules = company.data?.activeModules || ['employees', 'time-track', 'vacations', 'management'];
  const items = BASE_NAV_ITEMS.filter((item) => canSeeItem(item, user) && (!item.moduleKey || activeModules.includes(item.moduleKey)));

  if (['DEV', 'ADMIN', 'RH', 'GESTOR'].includes(profile)) {
    items.splice(6, 0, { label: 'Vagas', href: '/dashboard/jobs', icon: Briefcase, roles: [profile] });
  }
  if (['DEV', 'CEO', 'COMERCIAL'].includes(profile)) {
    items.push({ label: 'Plataforma', href: '/dashboard/platform', icon: Building2 });
  }

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(88vw,280px)] -translate-x-full flex-col border border-white/70 bg-white/90 p-3 text-slate-900 shadow-2xl backdrop-blur-2xl transition-transform duration-300 dark:border-white/10 dark:bg-slate-950/90 lg:sticky lg:top-3 lg:mx-3 lg:my-3 lg:h-[calc(100vh-1.5rem)] lg:w-auto lg:translate-x-0 lg:rounded-[28px] lg:shadow-[0_20px_60px_rgba(15,23,42,.10)] ${open ? 'translate-x-0' : ''}`}>
      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-700 p-3 text-white shadow-lg shadow-violet-600/20">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/15 text-lg font-black ring-1 ring-white/25">
          {company.data?.logoUrl ? <img src={company.data.logoUrl} alt="Logo" className="h-full w-full object-contain bg-white" /> : 'IR'}
        </div>
        <div className="min-w-0"><p className="truncate text-sm font-black">{normalizeDisplayName(company.data?.name) || 'Innovation RH'}</p><p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[.16em] text-violet-100">People platform</p></div>
      </div>
      <div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[.18em] text-slate-400 dark:text-slate-500">Menu principal</div>
      <nav className="no-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        <Suspense fallback={null}>
          {items.map((item) => { const Icon = item.icon; const active = isActive(pathname, item, tenant); return (
            <Link key={item.href} href={`/${tenant}${item.href}`} onClick={onClose} className={`group flex min-h-11 items-center gap-3 rounded-2xl px-3.5 text-[13px] font-bold transition-all ${active ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-slate-500 hover:bg-violet-50 hover:text-violet-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'}`}>
              <Icon size={18} strokeWidth={active ? 2.6 : 2.1} className="shrink-0" /><span className="truncate">{item.label}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />}
            </Link>
          ); })}
        </Suspense>
      </nav>
      <div className="mt-4 border-t border-slate-200/80 pt-3 dark:border-white/10"><UserIdentityCard name={user?.name} email={user?.email} profile={profile} /></div>
    </aside>
  );
}

function UserIdentityCard({ name, email, profile }: { name?: string; email?: string; profile?: string }) {
  const initials = (name || email || 'Usuário').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return <div className="flex items-center gap-3 rounded-2xl px-2 py-2"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-xs font-black text-white shadow-md">{initials}</div><div className="min-w-0"><p className="truncate text-xs font-black text-slate-800 dark:text-white">{normalizeDisplayName(name) || email || 'Usuário'}</p><p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">{ROLE_LABEL[profile || ''] ?? profile ?? 'Perfil'}</p></div></div>;
}

