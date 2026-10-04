import type { User } from '@/app/contexts/AuthContext';
import { resolveUserRole } from './user-role';

export type Permission =
  | 'time_tracking.clock_in'
  | 'time_tracking.view_own'
  | 'time_tracking.view_team'
  | 'time_tracking.view_all'
  | 'time_tracking.approve_team'
  | 'time_tracking.approve_all'
  | 'vacations.request_own'
  | 'vacations.request_team'
  | 'vacations.approve'
  | 'settings.change_own_password'
  | 'settings.change_team_password'
  | 'settings.change_all_passwords'
  | 'users.view_team'
  | 'users.manage_employees'
  | 'users.view_employee_files'
  | 'admin.manage_rh'
  | 'admin.delete_employees'
  | 'platform.manage'
  | 'platform.view_finance'
  | 'faturas.ver'
  | 'faturas.pagar'
  | 'faturas.nf_anexar'
  | 'faturas.cobrar'
  | 'faturas.desconto'
  | 'faturas.reembolsar'
  | 'faturas.todas_empresas';

export const PERMISSIONS_LABELS: Record<Permission, string> = {
  'time_tracking.clock_in': 'Bater ponto',
  'time_tracking.view_own': 'Ver próprio ponto',
  'time_tracking.view_team': 'Ver ponto da equipe',
  'time_tracking.view_all': 'Ver ponto de toda a empresa',
  'time_tracking.approve_team': 'Aprovar ponto da equipe (manual)',
  'time_tracking.approve_all': 'Aprovar ponto de todos (manual)',
  'vacations.request_own': 'Solicitar férias para si',
  'vacations.request_team': 'Solicitar férias para equipe',
  'vacations.approve': 'Aprovar férias',
  'settings.change_own_password': 'Mudar própria senha',
  'settings.change_team_password': 'Mudar senha da equipe',
  'settings.change_all_passwords': 'Mudar senha de todos',
  'users.view_team': 'Visualizar equipe',
  'users.manage_employees': 'Gerenciar funcionários (Aba RH)',
  'users.view_employee_files': 'Ver Ficha do Funcionário',
  'admin.manage_rh': 'Gerenciar acessos do RH',
  'admin.delete_employees': 'Deletar/Demitir funcionários',
  'platform.manage': 'Acessar aba Plataforma / Gestão Superior'
,
  'platform.view_finance': 'Visualizar financeiro da Plataforma',
  'faturas.ver': 'Faturas: ver faturas, comprovantes e notas fiscais',
  'faturas.pagar': 'Faturas: pagar faturas em aberto',
  'faturas.nf_anexar': 'Faturas: anexar nota fiscal e comprovante',
  'faturas.cobrar': 'Faturas: gerar cobranças, trocar plano e cancelar',
  'faturas.desconto': 'Faturas: dar desconto, cupom e dias grátis',
  'faturas.reembolsar': 'Faturas: reembolsar pagamentos',
  'faturas.todas_empresas': 'Faturas: ver todas as empresas (visão plataforma)'
};

const FATURAS_EMPRESA: Permission[] = ['faturas.ver', 'faturas.pagar'];
const FATURAS_TUDO: Permission[] = [
  'faturas.ver', 'faturas.pagar', 'faturas.nf_anexar', 'faturas.cobrar',
  'faturas.desconto', 'faturas.reembolsar', 'faturas.todas_empresas'
];

const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  'funcionario': [
    'time_tracking.clock_in',
    'time_tracking.view_own',
    'settings.change_own_password'
  ],
  'gestor': [
    'time_tracking.clock_in',
    'time_tracking.view_own',
    'time_tracking.view_team',
    'vacations.request_own',
    'vacations.request_team',
    'settings.change_own_password',
    'settings.change_team_password',
    'users.view_team'
  ],
  'rh': [
    'time_tracking.view_all',
    'time_tracking.approve_all',
    'vacations.approve',
    'settings.change_own_password',
    'settings.change_team_password',
    'settings.change_all_passwords',
    'users.manage_employees',
    'users.view_employee_files',
    'platform.manage',
    'platform.view_finance',
    ...FATURAS_EMPRESA
  ],
  'admin': [
    'time_tracking.clock_in',
    'time_tracking.view_own',
    'time_tracking.view_team',
    'time_tracking.view_all',
    'time_tracking.approve_team',
    'time_tracking.approve_all',
    'vacations.request_own',
    'vacations.request_team',
    'vacations.approve',
    'settings.change_own_password',
    'settings.change_team_password',
    'settings.change_all_passwords',
    'users.view_team',
    'users.manage_employees',
    'users.view_employee_files',
    'admin.manage_rh',
    'admin.delete_employees',
    'platform.manage',
    'platform.view_finance',
    ...FATURAS_EMPRESA
  ],
  'dev': [
    'time_tracking.clock_in',
    'time_tracking.view_own',
    'time_tracking.view_team',
    'time_tracking.view_all',
    'time_tracking.approve_team',
    'time_tracking.approve_all',
    'vacations.request_own',
    'vacations.request_team',
    'vacations.approve',
    'settings.change_own_password',
    'settings.change_team_password',
    'settings.change_all_passwords',
    'users.view_team',
    'users.manage_employees',
    'users.view_employee_files',
    'admin.manage_rh',
    'admin.delete_employees',
    'platform.manage',
    'platform.view_finance',
    ...FATURAS_TUDO
  ],
  'ceo': [
    'time_tracking.view_all',
    'time_tracking.approve_all',
    'vacations.approve',
    'settings.change_own_password',
    'settings.change_team_password',
    'settings.change_all_passwords',
    'users.view_team',
    'users.manage_employees',
    'users.view_employee_files',
    'admin.manage_rh',
    'admin.delete_employees',
    'platform.manage',
    'platform.view_finance',
    ...FATURAS_TUDO
  ],
  'contabil': [
    'time_tracking.view_all',
    'settings.change_own_password',
    'platform.view_finance',
    'faturas.ver',
    'faturas.nf_anexar',
    'faturas.todas_empresas'
  ],
  'comercial': [
    'settings.change_own_password',
    'platform.view_finance',
    'faturas.ver',
    'faturas.todas_empresas'
  ],
  'consulta': [
    'time_tracking.view_all',
    'time_tracking.view_team',
    'users.view_team'
  ]
};

export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;

  if (Array.isArray(user.customPermissions) && user.customPermissions.length > 0) {
    return user.customPermissions.includes(permission);
  }

  const role = resolveUserRole(user).toLowerCase();
  const defaultPerms = DEFAULT_PERMISSIONS[role] || [];
  return defaultPerms.includes(permission);
}

export function getDefaultPermissions(role: string): Permission[] {
  return DEFAULT_PERMISSIONS[role.toLowerCase()] || [];
}
