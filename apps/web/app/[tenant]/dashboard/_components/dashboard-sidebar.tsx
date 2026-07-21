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
  { icon: UserCog, label: 'Usuários', href: '/dashboard/users', match: '/dashboard/users', roles: ['DEV', 'ADMIN', 'RH'] },
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

export function DashboardSidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const params = useParams();
  const tenant = params?.tenant as string;
  const { user } = useAuth();
  const company = useQuery(() => api.companies.me(), []);
  const profile = user?.profile?.toUpperCase();
  const activeModules = company.data?.activeModules || ['employees', 'time-track', 'vacations', 'management'];

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
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,260px)] flex-col bg-black p-5 text-white shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:w-60 lg:translate-x-0 lg:shadow-none ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <CompanyBrandCard name={company.data?.name} document={company.data?.document} logoUrl={company.data?.logoUrl} />

      <nav className="mt-8 flex flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden pr-1">
        {tenantNavItems.map((item) => (
          <NavItem key={item.href} item={item} active={isActive(pathname, item)} onNavigate={onClose} />
        ))}
      </nav>

      <div className="mt-auto pt-6">
        <UserIdentityCard name={user?.name} email={user?.email} profile={profile} />
      </div>
    </aside>
  );
}

function CompanyBrandCard({ name, document, logoUrl }: { name?: string | null; document?: string | null; logoUrl?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white font-bold text-black">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo da empresa" className="h-full w-full object-contain rounded-xl" />
        ) : (
          'IR'
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-black leading-tight text-white">
          {normalizeDisplayName(name) || 'Innovation'}
        </p>
        <p className="truncate text-[11px] font-semibold text-white/50">
          {document || 'Gestão de RH'}
        </p>
      </div>
    </div>
  );
}

function UserIdentityCard({ name, email, profile }: { name?: string; email?: string; profile?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8A05BE] text-[12px] font-bold text-white">
        {getInitials(name, email)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold leading-tight text-white">{normalizeDisplayName(name) || email || 'Usuário'}</p>
        <p className="truncate text-[11px] font-semibold text-white/50">
          {ROLE_LABEL[profile || ''] ?? profile ?? 'Perfil'}
        </p>
      </div>
    </div>
  );
}

function NavItem({ item, active, onNavigate }: { item: NavItemConfig; active: boolean; onNavigate?: () => void }) {
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
        onClick={onNavigate}
        className={`group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors ${
          active ? 'bg-[#8A05BE]/10 text-white' : 'text-white/60 hover:text-white'
        }`}
      >
        {active && <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-md bg-[#8A05BE]" />}
        <Icon size={20} strokeWidth={active ? 2.5 : 2} className={`shrink-0 ${active ? 'text-[#8A05BE]' : ''}`} />
        <span className="truncate">{item.label}</span>
      </Link>
      
      {active && visibleSubItems && visibleSubItems.length > 0 && (
        <div className="ml-[42px] mt-1 flex flex-col gap-1.5 md:flex">
          {visibleSubItems.map(sub => {
            const currentTab = searchParams.get('tab') || 'minha';
            const subTab = sub.href.split('tab=')[1] || 'minha';
            const isActiveSub = currentTab === subTab;
            
            return (
              <button 
                key={sub.href} 
                onClick={() => { router.push(sub.href); onNavigate?.(); }} 
                className={`flex w-full items-center text-[12px] font-semibold transition-colors ${
                  isActiveSub ? 'text-[#8A05BE]' : 'text-white/50 hover:text-white/80'
                }`}
              >
                <span className="truncate">{sub.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}