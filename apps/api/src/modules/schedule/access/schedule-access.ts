import type { UserRole } from '../../../common/types/auth.types';

export type ScheduleCapability =
  | 'calendar.read'
  | 'punch'
  | 'requests.create'
  | 'approvals'
  | 'schedule.write'
  | 'policy.write'
  | 'closing.read'
  | 'closing.write'
  | 'reports.read'
  | 'diagnostics';

export type ScheduleScope = 'self' | 'team' | 'company';

type Matrix = Record<UserRole, Partial<Record<ScheduleCapability, ScheduleScope>>>;

const HR: Partial<Record<ScheduleCapability, ScheduleScope>> = {
  'calendar.read': 'company',
  punch: 'self',
  'requests.create': 'self',
  approvals: 'company',
  'schedule.write': 'company',
  'policy.write': 'company',
  'closing.read': 'company',
  'closing.write': 'company',
  'reports.read': 'company',
};

/** Fonte única de permissões da Central de Escalas. Espelhada em apps/web/app/lib/schedule-access.ts (há teste de paridade). */
export const SCHEDULE_ACCESS: Matrix = {
  FUNCIONARIO: { 'calendar.read': 'self', punch: 'self', 'requests.create': 'self', 'closing.read': 'self' },
  GESTOR: {
    'calendar.read': 'team',
    punch: 'self',
    'requests.create': 'self',
    approvals: 'team',
    'schedule.write': 'team',
    'closing.read': 'team',
    'reports.read': 'team',
  },
  RH: HR,
  ADMIN: HR,
  DEV: { ...HR, punch: undefined, diagnostics: 'company' },
  CEO: { 'calendar.read': 'company', 'closing.read': 'company', 'reports.read': 'company' },
  CONTABIL: { 'closing.read': 'company', 'reports.read': 'company' },
  CONSULTA: { 'calendar.read': 'company', 'reports.read': 'company' },
  COMERCIAL: {},
  RH_RS: {},
};

export function scopeOf(role: UserRole | undefined, capability: ScheduleCapability): ScheduleScope | null {
  return (role && SCHEDULE_ACCESS[role]?.[capability]) || null;
}

export function can(role: UserRole | undefined, capability: ScheduleCapability) {
  return scopeOf(role, capability) !== null;
}

export function rolesWith(capability: ScheduleCapability): UserRole[] {
  return (Object.keys(SCHEDULE_ACCESS) as UserRole[]).filter((role) => can(role, capability));
}

/** Perfis com acesso ao módulo (qualquer capacidade). */
export const SCHEDULE_MODULE_ROLES = (Object.keys(SCHEDULE_ACCESS) as UserRole[]).filter((role) => Object.keys(SCHEDULE_ACCESS[role]).length > 0);
