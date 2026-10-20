/**
 * Fonte única dos perfis que a TELA usa para mostrar botões e páginas.
 * O servidor continua sendo quem autoriza (RolesGuard); `tests/unit/web/permission-matrix.spec.ts`
 * compara estes grupos com os `@Roles` dos controllers e falha se a tela oferecer algo que a API recusa.
 */
const roles = (...list: string[]): readonly string[] => list;

export const ROLE_ACCESS = {
  /** Criar, editar, desligar e importar funcionários. */
  employeeWrite: roles('DEV', 'ADMIN', 'RH'),
  /** Baixar a folha de ponto do funcionário. */
  employeePointSheet: roles('RH'),
  vacationApprove: roles('ADMIN', 'RH', 'DEV'),
  /** Solicitar férias: espelha `POST /vacations`; GESTOR e FUNCIONARIO não têm essa rota. */
  vacationRequest: roles('ADMIN', 'RH', 'DEV'),
  asoView: roles('DEV', 'ADMIN', 'RH', 'GESTOR', 'CEO', 'CONSULTA'),
  asoManage: roles('DEV', 'ADMIN', 'RH'),
  notificationsManage: roles('DEV', 'ADMIN', 'RH'),
  promotionsWrite: roles('DEV', 'ADMIN', 'RH'),
  onboardingManage: roles('DEV', 'ADMIN', 'RH'),
  payrollAccess: roles('DEV', 'ADMIN', 'RH'),
  agendaView: roles('DEV', 'ADMIN', 'RH', 'GESTOR', 'RH_RS'),
  agendaManage: roles('DEV', 'ADMIN', 'RH', 'RH_RS'),
  recruitmentAccess: roles('DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR'),
  recruitmentConfigure: roles('DEV', 'ADMIN', 'RH'),
  recruitmentConduct: roles('DEV', 'ADMIN', 'RH', 'RH_RS'),
  usersPage: roles('DEV', 'CEO', 'ADMIN', 'RH'),
  platformCompanyManage: roles('DEV', 'CEO', 'COMERCIAL'),
} as const;

export type RoleGroup = keyof typeof ROLE_ACCESS;

export function roleIn(group: readonly string[], role: string | null | undefined): boolean {
  return group.includes(String(role ?? '').trim().toUpperCase());
}
