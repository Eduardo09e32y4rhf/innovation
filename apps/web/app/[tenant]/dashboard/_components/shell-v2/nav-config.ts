import {
  LayoutDashboard, Users, CalendarRange, CalendarDays, ShieldCheck,
  UserRoundCog, Settings2, HelpCircle, Briefcase, Building2, type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
  moduleKey?: string;
  badge?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',     href: '/dashboard',            icon: LayoutDashboard, roles: ['DEV','CEO','CONTABIL','ADMIN','RH','GESTOR','FUNCIONARIO','CONSULTA'] },
  { label: 'FuncionÃ¡rios',  href: '/dashboard/employees',  icon: Users,           roles: ['DEV','ADMIN','RH','GESTOR','CONSULTA'], moduleKey: 'employees' },
  { label: 'Escalas',       href: '/dashboard/escalas',    icon: CalendarRange,   roles: ['DEV','ADMIN','RH','GESTOR','FUNCIONARIO','CONSULTA'], moduleKey: 'time-track' },
  { label: 'FÃ©rias',        href: '/dashboard/vacations',  icon: CalendarDays,    roles: ['DEV','ADMIN','RH','GESTOR','FUNCIONARIO','CONSULTA'], moduleKey: 'vacations' },
  { label: 'GestÃ£o',        href: '/dashboard/management', icon: ShieldCheck,     roles: ['DEV','ADMIN','RH','GESTOR'], moduleKey: 'management' },
  { label: 'Vagas',         href: '/dashboard/jobs',       icon: Briefcase,       roles: ['DEV','ADMIN','RH','GESTOR'] },
  { label: 'UsuÃ¡rios',      href: '/dashboard/users',      icon: UserRoundCog,    roles: ['DEV','ADMIN','RH'] },
  { label: 'ConfiguraÃ§Ãµes', href: '/dashboard/settings',   icon: Settings2,       roles: ['DEV','COMERCIAL','ADMIN','RH','GESTOR','FUNCIONARIO','CONSULTA'] },
  { label: 'Suporte',       href: '/dashboard/support',    icon: HelpCircle,      roles: ['DEV','COMERCIAL','ADMIN','RH','GESTOR','FUNCIONARIO','CONSULTA'] },
  { label: 'Plataforma',    href: '/dashboard/platform',   icon: Building2,       roles: ['DEV','CEO','COMERCIAL','ADMIN'] },
];

export function isNavActive(pathname: string, tenant: string, item: NavItem) {
  const route = `/${tenant}${item.href}`;
  if (item.href === '/dashboard') return pathname === route || pathname === `${route}/`;
  return Boolean(pathname?.startsWith(route));
}