import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Clock,
  AlertTriangle,
  ArrowLeftRight,
  Lock,
  Settings,
  FileText,
  LucideIcon,
} from 'lucide-react';

export type UserRole = 'DEV' | 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONARIO' | 'CONSULTA';

export interface EscalasNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export const ESCALAS_NAV_ITEMS: EscalasNavItem[] = [
  {
    title: 'Visão Geral',
    href: '',
    icon: LayoutDashboard,
    roles: ['DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  },
  {
    title: 'Calendário',
    href: '/calendario',
    icon: CalendarDays,
    roles: ['DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  },
  {
    title: 'Equipe',
    href: '/equipe',
    icon: Users,
    roles: ['DEV', 'ADMIN', 'RH', 'GESTOR'],
  },
  {
    title: 'Ponto',
    href: '/ponto',
    icon: Clock,
    roles: ['DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  },
  {
    title: 'Ocorrências',
    href: '/ocorrencias',
    icon: AlertTriangle,
    roles: ['DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  },
  {
    title: 'Trocas',
    href: '/trocas',
    icon: ArrowLeftRight,
    roles: ['DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  },
  {
    title: 'Fechamento',
    href: '/fechamento',
    icon: Lock,
    roles: ['DEV', 'ADMIN', 'RH'],
  },
  {
    title: 'Regras',
    href: '/regras',
    icon: Settings,
    roles: ['DEV', 'ADMIN', 'RH', 'GESTOR'],
  },
  {
    title: 'Documentos',
    href: '/documentos',
    icon: FileText,
    roles: ['DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  },
];

export function getVisibleNavItems(role?: string): EscalasNavItem[] {
  if (!role) return [];
  return ESCALAS_NAV_ITEMS.filter((item) => item.roles.includes(role as UserRole));
}

export function getActiveNavItem(pathname: string, tenant: string): EscalasNavItem | undefined {
  const basePath = `/${tenant}/dashboard/escalas`;
  
  // Find the most specific match first (longest href)
  const sortedItems = [...ESCALAS_NAV_ITEMS].sort((a, b) => b.href.length - a.href.length);
  
  for (const item of sortedItems) {
    const itemPath = `${basePath}${item.href}`;
    if (pathname === itemPath || pathname.startsWith(`${itemPath}/`)) {
      if (item.href === '' && pathname !== itemPath) {
        // If href is empty (overview), it should match exactly, otherwise we might match /escalas/anything
        continue;
      }
      return item;
    }
  }
  
  // Default to overview if exactly on the root
  if (pathname === basePath || pathname === `${basePath}/`) {
    return ESCALAS_NAV_ITEMS.find((item) => item.href === '');
  }
  
  return undefined;
}
