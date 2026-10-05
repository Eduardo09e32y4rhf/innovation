export type ScheduleRole = 'DEV' | 'CEO' | 'CONTABIL' | 'COMERCIAL' | 'ADMIN' | 'RH' | 'RH_RS' | 'GESTOR' | 'FUNCIONARIO' | 'CONSULTA';

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

type Matrix = Record<ScheduleRole, Partial<Record<ScheduleCapability, ScheduleScope>>>;

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

/** Espelho de apps/api/src/modules/schedule/access/schedule-access.ts (há teste de paridade em tests/contract). */
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

export function normalizeRole(role?: string | null): ScheduleRole | undefined {
  const value = String(role ?? '').toUpperCase();
  return value in SCHEDULE_ACCESS ? (value as ScheduleRole) : undefined;
}

export function scopeOf(role: string | null | undefined, capability: ScheduleCapability): ScheduleScope | null {
  const normalized = normalizeRole(role);
  return (normalized && SCHEDULE_ACCESS[normalized][capability]) || null;
}

export function can(role: string | null | undefined, capability: ScheduleCapability) {
  return scopeOf(role, capability) !== null;
}

export function hasScheduleModule(role: string | null | undefined) {
  const normalized = normalizeRole(role);
  return Boolean(normalized && Object.values(SCHEDULE_ACCESS[normalized]).some(Boolean));
}

export type HubView = 'hoje' | 'calendario' | 'ponto' | 'solicitacoes' | 'aprovacoes' | 'modelos' | 'fechamento' | 'relatorios';

export const HUB_VIEWS: { id: HubView; label: string; description: string; visible: (role: string | null | undefined) => boolean }[] = [
  { id: 'hoje', label: 'Hoje', description: 'Resumo do dia', visible: hasScheduleModule },
  { id: 'calendario', label: 'Calendário', description: 'Escala do mês', visible: (role) => can(role, 'calendar.read') },
  { id: 'ponto', label: 'Ponto', description: 'Bater ponto e espelho', visible: (role) => can(role, 'punch') || can(role, 'calendar.read') },
  { id: 'solicitacoes', label: 'Solicitações', description: 'Trocas, folgas e ajustes', visible: (role) => can(role, 'requests.create') },
  { id: 'aprovacoes', label: 'Aprovações', description: 'Pedidos para decidir', visible: (role) => can(role, 'approvals') },
  { id: 'modelos', label: 'Escalas e regras', description: 'Modelos, regras de ponto e cercas', visible: (role) => can(role, 'schedule.write') || can(role, 'policy.write') },
  { id: 'fechamento', label: 'Fechamento', description: 'Folha de ponto do período', visible: (role) => can(role, 'closing.read') },
  { id: 'relatorios', label: 'Relatórios', description: 'Indicadores e exportação', visible: (role) => can(role, 'reports.read') },
];

export function visibleViews(role: string | null | undefined) {
  return HUB_VIEWS.filter((view) => view.visible(role));
}
