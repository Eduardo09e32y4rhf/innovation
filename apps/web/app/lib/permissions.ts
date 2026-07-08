import { User } from '@/app/contexts/AuthContext';

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
  | 'platform.manage';

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
};

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
    'time_tracking.approve_team',
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
    'platform.manage'
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
    'platform.manage'
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
    'platform.manage'
  ]
};

export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;
  
  if (Array.isArray(user.customPermissions) && user.customPermissions.length > 0) {
    return user.customPermissions.includes(permission);
  }
  
  const role = user.profile.toLowerCase();
  const defaultPerms = DEFAULT_PERMISSIONS[role] || [];
  return defaultPerms.includes(permission);
}

export function getDefaultPermissions(role: string): Permission[] {
  return DEFAULT_PERMISSIONS[role.toLowerCase()] || [];
}
