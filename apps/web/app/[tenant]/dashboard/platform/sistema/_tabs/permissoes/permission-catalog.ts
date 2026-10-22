'use client';



export type GlobalRole = 'DEV' | 'ADMIN' | 'COMERCIAL' | 'RH' | 'GESTOR' | 'FUNCIONARIO' | 'CONSULTA';
export type PermissionCode =
  | 'admin'
  | 'config_company'
  | 'config_payroll'
  | 'config_time'
  | 'time_admin'
  | 'time_approve'
  | 'time_view'
  | 'time_clock'
  | 'manage_employees'
  | 'payroll'
  | 'documents'
  | 'settings_basic';

export const ROLES: GlobalRole[] = ['DEV', 'ADMIN', 'COMERCIAL', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];

export const ROLE_LABELS: Record<GlobalRole, string> = {
  DEV: 'DEV / Super Admin',
  ADMIN: 'Administrador',
  COMERCIAL: 'Comercial',
  RH: 'Recursos Humanos',
  GESTOR: 'Gestor',
  FUNCIONARIO: 'Funcionario',
  CONSULTA: 'Apenas consulta',
};

export const ROLE_DEFAULTS: Record<GlobalRole, PermissionCode[]> = {
  DEV: ['admin', 'config_company', 'config_payroll', 'config_time', 'time_admin', 'time_approve', 'time_view', 'time_clock', 'manage_employees', 'payroll', 'documents', 'settings_basic'],
  ADMIN: ['admin', 'config_company', 'config_payroll', 'config_time', 'time_admin', 'time_approve', 'time_view', 'time_clock', 'manage_employees', 'payroll', 'documents', 'settings_basic'],
  COMERCIAL: [],
  RH: ['time_admin', 'time_approve', 'time_view', 'time_clock', 'manage_employees', 'payroll', 'documents', 'settings_basic'],
  GESTOR: ['time_approve', 'time_view', 'time_clock', 'manage_employees', 'settings_basic'],
  FUNCIONARIO: ['time_view', 'time_clock', 'settings_basic'],
  CONSULTA: ['time_view'],
};

export const PERMISSION_LABELS: Record<PermissionCode, string> = {
  admin: 'Acesso administrativo total',
  config_company: 'Configurar empresa e plano',
  config_payroll: 'Configurar folha e beneficios',
  config_time: 'Configurar jornada e regras',
  time_admin: 'Administrar ponto da equipe',
  time_approve: 'Aprovar ajustes de ponto',
  time_view: 'Visualizar ponto',
  time_clock: 'Bater ponto',
  manage_employees: 'Gerenciar funcionarios',
  payroll: 'Acessar calculos de folha',
  documents: 'Visualizar documentos',
  settings_basic: 'Acessos basicos de configuracao',
};

export const PERMISSION_GROUPS: Array<{ title: string; description: string; items: PermissionCode[] }> = [
  {
    title: 'Administracao',
    description: 'Permissoes que controlam o acesso mais sensivel da plataforma.',
    items: ['admin', 'config_company', 'config_payroll', 'config_time'],
  },
  {
    title: 'Ponto e jornada',
    description: 'Controle de batida, visao de equipe e aprovacao manual.',
    items: ['time_admin', 'time_approve', 'time_view', 'time_clock'],
  },
  {
    title: 'RH e documentos',
    description: 'Acesso a cadastro, arquivos e calculos operacionais.',
    items: ['manage_employees', 'payroll', 'documents'],
  },
  {
    title: 'Ajustes gerais',
    description: 'Acessos basicos para configuracoes e navegacao da plataforma.',
    items: ['settings_basic'],
  },
];
