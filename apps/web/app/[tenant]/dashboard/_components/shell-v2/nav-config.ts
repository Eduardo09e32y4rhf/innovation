import {
  LayoutDashboard, Users, CalendarRange, CalendarDays, ShieldCheck,
  UserRoundCog, Settings2, HelpCircle, Briefcase, Building2, Calculator, type LucideIcon,
} from 'lucide-react';
import type { User } from '../../../../contexts/AuthContext';
import { hasPermission, type Permission } from '../../../../lib/permissions';
import { resolveUserRole } from '../../../../lib/user-role';

export type NavGroup = 'Trabalho' | 'Administração' | 'Operação global';
export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  group: NavGroup;
  roles: readonly string[];
  moduleKey?: string;
  anyPermission?: readonly Permission[];
  badge?: string;
};

const COMPANY_ROLES = ['DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];
const ALL_ROLES = [...COMPANY_ROLES, 'CEO', 'CONTABIL', 'COMERCIAL'];

/** Used by every navigation surface. The server remains responsible for authorization. */
export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'Trabalho', roles: ALL_ROLES },
  { id: 'employees', label: 'Funcionários', href: '/dashboard/employees', icon: Users, group: 'Trabalho', roles: ['DEV', 'ADMIN', 'RH', 'GESTOR', 'CONSULTA'], moduleKey: 'employees', anyPermission: ['users.manage_employees', 'users.view_team'] },
  { id: 'escalas', label: 'Escalas', href: '/dashboard/escalas', icon: CalendarRange, group: 'Trabalho', roles: COMPANY_ROLES, moduleKey: 'time-track' },
  { id: 'vacations', label: 'Férias', href: '/dashboard/vacations', icon: CalendarDays, group: 'Trabalho', roles: COMPANY_ROLES, moduleKey: 'vacations' },
  { id: 'management', label: 'Gestão', href: '/dashboard/management', icon: ShieldCheck, group: 'Trabalho', roles: ['DEV', 'ADMIN', 'RH', 'GESTOR'], moduleKey: 'management', anyPermission: ['platform.manage', 'users.view_team'] },
  { id: 'jobs', label: 'Vagas', href: '/dashboard/jobs', icon: Briefcase, group: 'Trabalho', roles: ['DEV', 'ADMIN', 'RH', 'GESTOR'] },
  { id: 'users', label: 'Usuários', href: '/dashboard/users', icon: UserRoundCog, group: 'Administração', roles: ['DEV', 'ADMIN', 'RH'], anyPermission: ['users.manage_employees'] },
  { id: 'settings', label: 'Configurações', href: '/dashboard/settings', icon: Settings2, group: 'Administração', roles: ALL_ROLES },
  { id: 'support', label: 'Suporte', href: '/dashboard/support', icon: HelpCircle, group: 'Administração', roles: ALL_ROLES },
  { id: 'platform', label: 'Plataforma', href: '/dashboard/platform', icon: Building2, group: 'Operação global', roles: ['DEV', 'CEO', 'COMERCIAL'], anyPermission: ['platform.manage', 'platform.view_finance'] },
  { id: 'accounting', label: 'Contabilidade', href: '/dashboard/platform/accounting', icon: Calculator, group: 'Operação global', roles: ['DEV', 'CEO'] },
];

export function getVisibleNavItems(user: User | null, activeModules: readonly string[] = []): NavItem[] {
  if (!user) return [];
  const role = resolveUserRole(user);
  return NAV_ITEMS.filter((item) => item.roles.includes(role) &&
    (!item.moduleKey || activeModules.includes(item.moduleKey)) &&
    (!item.anyPermission || item.anyPermission.some((permission) => hasPermission(user, permission))));
}

export function tenantRoute(tenant: string, href: string): string {
  return `/${encodeURIComponent(tenant)}${href.startsWith('/') ? href : `/${href}`}`;
}

export function isNavActive(pathname: string, tenant: string, item: NavItem) {
  const route = tenantRoute(tenant, item.href);
  if (item.id === 'dashboard') return pathname === route || pathname === `${route}/`;
  if (item.id === 'platform' && pathname.startsWith(tenantRoute(tenant, '/dashboard/platform/accounting'))) return false;
  return pathname === route || pathname.startsWith(`${route}/`);
}

export type SearchDestination = { id: string; label: string; href: string; group: string; icon: LucideIcon };
const MODULE_DESTINATIONS: { parent: string; label: string; suffix: string; roles?: readonly string[] }[] = [
  ...[['Calendário', 'calendario'], ['Ponto', 'ponto'], ['Equipe', 'equipe'], ['Trocas', 'trocas'], ['Ocorrências', 'ocorrencias'], ['Regras', 'regras'], ['Fechamento', 'fechamento'], ['Documentos', 'documentos']].map(([label, suffix]) => ({ parent: 'escalas', label, suffix })),
  ...[['Agenda', 'agenda'], ['ASO', 'aso'], ['Comunicados', 'notifications']].map(([label, suffix]) => ({ parent: 'management', label, suffix })),
  { parent: 'management', label: 'Folha de pagamento', suffix: 'payroll', roles: ['DEV', 'ADMIN', 'RH'] },
  { parent: 'management', label: 'Admissão', suffix: 'onboarding', roles: ['DEV', 'ADMIN', 'RH'] },
  ...[['Empresas', 'companies'], ['Financeiro', 'finance'], ['Assinaturas', 'subscriptions'], ['Planos', 'plans'], ['Contratos', 'contracts'], ['Propostas', 'proposals'], ['Configuração global', 'configuration'], ['Auditoria', 'audit']].map(([label, suffix]) => ({ parent: 'platform', label, suffix })),
  ...[['Permissões globais', 'permissions'], ['Acessos', 'access'], ['Cupons', 'coupons'], ['Suporte operacional', 'support'], ['Inteligência', 'intelligence'], ['WhatsApp', 'whatsapp']].map(([label, suffix]) => ({ parent: 'platform', label, suffix, roles: ['DEV'] })),
];
export function getSearchDestinations(items: readonly NavItem[], role: string): SearchDestination[] {
  const result: SearchDestination[] = items.map((item) => ({ ...item }));
  for (const entry of MODULE_DESTINATIONS) {
    const parent = items.find((item) => item.id === entry.parent);
    if (parent && (!entry.roles || entry.roles.includes(role))) result.push({ id: `${parent.id}-${entry.suffix}`, label: entry.label, href: `${parent.href}/${entry.suffix}`, group: parent.label, icon: parent.icon });
  }
  return result;
}
