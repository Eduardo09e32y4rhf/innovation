'use client';

import Link from 'next/link';
import { usePathname , useParams } from 'next/navigation';
import {
  Building2,
  CalendarClock,
  CalendarDays,
  FileText,
  Clock,
  LayoutDashboard,
  Settings,
  Smartphone,
  UserCog,
  Users,
  Zap,
  Shield,
  MessageCircle,
  Orbit,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { ROLE_LABEL } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';

type NavItemConfig = { label: string; href: string; icon: LucideIcon; match?: string; roles?: string[]; moduleKey?: string; subItems?: { label: string; href: string; roles?: string[] }[] };

const baseNavItems: NavItemConfig[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', roles: ['DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'] },
  { icon: Users, label: 'Funcionários', href: '/dashboard/employees', match: '/dashboard/employees', roles: ['DEV', 'ADMIN', 'RH', 'GESTOR', 'CONSULTA'], moduleKey: 'employees' },
  { 
    icon: CalendarClock, 
    label: 'Escala', 
    href: '/dashboard/escala', 
    match: '/dashboard/escala', 
    roles: ['DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'], 
    moduleKey: 'time-track',
    subItems: [
      { label: 'Minha Jornada', href: '/dashboard/escala?tab=minha' },
      { label: 'Escala de Equipe', href: '/dashboard/escala?tab=equipe', roles: ['DEV', 'ADMIN', 'RH', 'GESTOR'] },
      { label: 'Trocar de Escala', href: '/dashboard/escala?tab=trocas' }
    ]
  },
  { icon: Clock, label: 'Ponto', href: '/dashboard/time-track', match: '/dashboard/time-track', roles: ['DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'], moduleKey: 'time-track' },
  { icon: CalendarDays, label: 'Férias', href: '/dashboard/vacations', match: '/dashboard/vacations', roles: ['DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'], moduleKey: 'vacations' },
  { icon: Users, label: 'Gestão', href: '/dashboard/management', match: '/dashboard/management', roles: ['DEV', 'ADMIN', 'RH', 'GESTOR'], moduleKey: 'management' },
  { icon: Smartphone, label: 'WhatsApp', href: '/dashboard/whatsapp', match: '/dashboard/whatsapp', roles: ['DEV', 'ADMIN', 'RH', 'GESTOR'], moduleKey: 'whatsapp' },
  { icon: UserCog, label: 'Usuários', href: '/dashboard/users', match: '/dashboard/users', roles: ['DEV', 'ADMIN'] },
  { icon: Settings, label: 'Configurações', href: '/dashboard/settings', match: '/dashboard/settings', roles: ['DEV', 'COMERCIAL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'] },
];

const devNavItem: NavItemConfig = {
  icon: Building2,
  label: 'Plataforma',
  href: '/dashboard/platform',
  match: '/dashboard/platform',
};

function isActive(pathname: string | null, item: NavItemConfig) {
  const route = item.match ?? item.href;
  if (route.endsWith('/dashboard')) return pathname === route || pathname === route + '/';
  return Boolean(pathname?.startsWith(route));
}

import { hasPermission } from '@/app/lib/permissions';

function canSeeItem(item: NavItemConfig, user: any) {
  if (item.label === 'Usuários' && !hasPermission(user, 'users.manage_employees')) return false;
  if (item.label === 'Gestão' && !hasPermission(user, 'platform.manage') && !hasPermission(user, 'users.view_team')) return false;
  if (item.label === 'Funcionários' && !hasPermission(user, 'users.manage_employees') && !hasPermission(user, 'users.view_team')) return false;
  if (item.label === 'Plataforma' && !hasPermission(user, 'platform.manage')) return false;
  
  if (!item.roles?.length) return true;
  return item.roles.includes(String(user?.profile || '').toUpperCase());
}

function getInitials(name?: string, email?: string) {
  const source = (name?.trim() || email?.split('@')[0] || 'Usuário').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const tenant = params?.tenant as string;
  const { user } = useAuth();
  const company = useQuery(() => api.companies.me(), []);
  const profile = user?.profile?.toUpperCase();
  const activeModules = company.data?.activeModules || ['employees', 'time-track', 'vacations', 'management', 'whatsapp'];

  const navItems = baseNavItems.filter((item) => {
    if (!canSeeItem(item, user)) return false;
    if (item.moduleKey && !activeModules.includes(item.moduleKey)) return false;
    return true;
  });

  if (profile === 'DEV' || profile === 'COMERCIAL') navItems.push(devNavItem);

  const tenantNavItems = navItems.map((item) => ({
    ...item,
    href: `/${tenant}${item.href}`,
    match: item.match ? `/${tenant}${item.match}` : `/${tenant}${item.href}`,
    subItems: item.subItems?.map(sub => ({ ...sub, href: `/${tenant}${sub.href}` }))
  }));

  return (
    <aside className="sidebar-shell flex w-full shrink-0 flex-col md:h-screen md:w-[220px]">
      <div className="p-3 md:p-4">
        <CompanyBrandCard name={company.data?.name} document={company.data?.document} logoUrl={company.data?.logoUrl} />
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:flex-1 md:space-y-0.5 md:overflow-visible md:pb-0">
        {tenantNavItems.map((item) => (
          <NavItem key={item.href} item={item} active={isActive(pathname, item)} />
        ))}
      </nav>

      <div className="hidden p-3 pt-0 md:block">
        <UserIdentityCard name={user?.name} email={user?.email} profile={profile} />
      </div>
    </aside>
  );
}

function CompanyBrandCard({ name, document, logoUrl }: { name?: string | null; document?: string | null; logoUrl?: string | null }) {
  return (
    <div className="sidebar-brand-card flex items-center gap-3 p-3">
      <div className={`flex shrink-0 items-center justify-center overflow-hidden ${logoUrl ? 'h-11 max-w-[140px]' : 'h-10 w-10 rounded-[8px] bg-white'}`}>
        {logoUrl ? (
          <img src={logoUrl} alt="Logo da empresa" className="h-full w-auto object-contain rounded-[4px]" />
        ) : (
          <Orbit size={18} strokeWidth={2.2} className="text-[#0D0D0E]" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[9px] font-semibold uppercase leading-none tracking-[0.18em] text-white/40">
          {normalizeDisplayName(name) || 'Innovation RH System'}
        </p>
        <p className="mt-0.5 truncate text-[13px] font-semibold leading-tight text-white">{document || 'Console RH'}</p>
      </div>
    </div>
  );
}

function UserIdentityCard({ name, email, profile }: { name?: string; email?: string; profile?: string }) {
  return (
    <div className="sidebar-copilot-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-400/15 text-[12px] font-black text-teal-200 ring-1 ring-teal-300/20">
          {getInitials(name, email)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight text-white">{normalizeDisplayName(name) || email || 'Usuário'}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
            {ROLE_LABEL[profile || ''] ?? profile ?? 'Perfil'}
          </p>
        </div>
      </div>
    </div>
  );
}

function NavItem({ item, active }: { item: NavItemConfig; active: boolean }) {
  const Icon = item.icon;
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();

  const visibleSubItems = item.subItems?.filter(sub => {
    if (!sub.roles?.length) return true;
    return sub.roles.includes(String(profile || ''));
  });

  return (
    <div className="flex flex-col">
      <Link href={item.href} className={`sidebar-nav-item shrink-0 ${active ? 'sidebar-nav-active' : 'sidebar-nav-idle'}`}>
        <Icon size={14} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
        <span>{item.label}</span>
      </Link>
      {active && visibleSubItems && visibleSubItems.length > 0 && (
        <div className="ml-6 mt-1 flex flex-col gap-1 border-l border-white/10 pl-2 hidden md:flex">
          {visibleSubItems.map(sub => {
            // Se a URL atual tiver o mesmo tab, destaca
            const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
            const currentTab = searchParams.get('tab') || 'minha';
            const subTab = sub.href.split('tab=')[1] || 'minha';
            const isActiveSub = currentTab === subTab;
            
            return (
              <Link key={sub.href} href={sub.href} className={`text-xs font-medium py-1 transition-colors ${isActiveSub ? 'text-white' : 'text-white/40 hover:text-white/80'}`}>
                {sub.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}