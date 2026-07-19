'use client';

import Link from 'next/link';
import { usePathname , useParams, useSearchParams, useRouter } from 'next/navigation';
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
    <aside className="sticky top-0 flex h-screen flex-col bg-slate-950 p-4 text-white">
      <CompanyBrandCard name={company.data?.name} document={company.data?.document} logoUrl={company.data?.logoUrl} />

      <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden pr-1">
        {tenantNavItems.map((item) => (
          <NavItem key={item.href} item={item} active={isActive(pathname, item)} />
        ))}
      </nav>

      <div className="mt-auto pt-4">
        <UserIdentityCard name={user?.name} email={user?.email} profile={profile} />
      </div>
    </aside>
  );
}

function CompanyBrandCard({ name, document, logoUrl }: { name?: string | null; document?: string | null; logoUrl?: string | null }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white font-bold text-black shadow-sm">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo da empresa" className="h-full w-full object-contain rounded-[12px]" />
        ) : (
          'IR'
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold leading-tight">
          {normalizeDisplayName(name) || 'Innovation RH'}
        </p>
        <p className="truncate text-[10px] font-semibold text-white/50">
          {document || 'Gestão de pessoas'}
        </p>
      </div>
    </div>
  );
}

function UserIdentityCard({ name, email, profile }: { name?: string; email?: string; profile?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] bg-white/5 p-3 ring-1 ring-white/10 transition-colors hover:bg-white/10">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-black">
        {getInitials(name, email)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold leading-tight text-white">{normalizeDisplayName(name) || email || 'Usuário'}</p>
        <p className="truncate text-[10px] font-semibold text-white/50">
          {ROLE_LABEL[profile || ''] ?? profile ?? 'Perfil'}
        </p>
      </div>
    </div>
  );
}

function NavItem({ item, active }: { item: NavItemConfig; active: boolean }) {
  const Icon = item.icon;
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const searchParams = useSearchParams();
  const router = useRouter();

  const visibleSubItems = item.subItems?.filter(sub => {
    if (!sub.roles?.length) return true;
    return sub.roles.includes(String(profile || ''));
  });

  return (
    <div className="flex flex-col">
      <Link 
        href={item.href} 
        className={`flex h-11 items-center gap-3 rounded-[12px] px-3 text-sm font-semibold transition-all duration-200 ${
          active ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon size={18} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
      
      {active && visibleSubItems && visibleSubItems.length > 0 && (
        <div className="ml-4 mt-1.5 hidden flex-col gap-1 md:flex">
          {visibleSubItems.map(sub => {
            const currentTab = searchParams.get('tab') || 'minha';
            const subTab = sub.href.split('tab=')[1] || 'minha';
            const isActiveSub = currentTab === subTab;
            
            return (
              <button 
                key={sub.href} 
                onClick={() => router.push(sub.href)} 
                className={`flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-[11px] font-bold transition-all duration-200 ${
                  isActiveSub ? 'bg-white/15 text-white ring-1 ring-white/20' : 'text-white/40 hover:bg-white/5 hover:text-white/80'
                }`}
              >
                <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActiveSub ? 'bg-white' : 'bg-transparent'}`} />
                <span className="truncate">{sub.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}