import { describe, expect, it } from 'vitest';
import { ROLE_ACCESS, type RoleGroup } from '../../../apps/web/app/lib/role-access';
import { NAV_ITEMS } from '../../../apps/web/app/[tenant]/dashboard/_components/shell-v2/nav-config';
import { hasPermission } from '../../../apps/web/app/lib/permissions';
import { backendAllows, loadBackendRoutes, type BackendRoute } from './backend-routes';

const routes = loadBackendRoutes();

function routeFor(method: string, path: string): BackendRoute {
  const found = routes.find((route) => route.method === method && route.path === path);
  if (!found) throw new Error(`Rota ${method} ${path} não existe mais no back: atualize a matriz.`);
  return found;
}

/** Botões/páginas por grupo de perfis → rotas que eles disparam. Cada perfil do grupo precisa ser aceito por todas. */
const BUTTONS: Record<RoleGroup, Array<[string, string]>> = {
  employeeWrite: [
    ['POST', '/employees'], ['PATCH', '/employees/:id'], ['DELETE', '/employees/:id'], ['DELETE', '/employees/:id/permanent'], ['GET', '/employees/:id'],
    ['POST', '/employees/import/validate'], ['POST', '/employees/import/confirm'],
  ],
  employeePointSheet: [['GET', '/employees/:id/documents/point-sheet.pdf']],
  vacationApprove: [['PATCH', '/vacations/:id/status']],
  vacationRequest: [['POST', '/vacations']],
  managementManage: [['GET', '/onboarding'], ['GET', '/payroll']],
  asoView: [['GET', '/management/aso']],
  asoManage: [['POST', '/management/aso'], ['PATCH', '/management/aso/:id']],
  notificationsManage: [['POST', '/notifications/admin'], ['DELETE', '/notifications/:id']],
  promotionsWrite: [['POST', '/promotions'], ['PUT', '/promotions/policy']],
  onboardingManage: [['POST', '/onboarding'], ['PATCH', '/onboarding/tasks/:taskId/complete']],
  payrollAccess: [['GET', '/payroll'], ['POST', '/payroll'], ['PATCH', '/payroll/:id/approve']],
  agendaView: [['GET', '/management/events'], ['GET', '/management/events/kanban']],
  agendaManage: [['POST', '/management/events'], ['PATCH', '/management/events/:id'], ['DELETE', '/management/events/:id']],
  recruitmentAccess: [['GET', '/jobs'], ['GET', '/jobs/:id']],
  recruitmentConfigure: [['GET', '/jobs/pipeline'], ['PUT', '/jobs/pipeline']],
  recruitmentConduct: [
    ['POST', '/jobs/applications/:id/offers'], ['POST', '/jobs/applications/:id/assessments'],
    ['GET', '/jobs/applications/:id/documents'], ['POST', '/jobs/applications/:id/slot-offers'],
  ],
  usersPage: [['GET', '/users'], ['POST', '/users'], ['PATCH', '/users/:id'], ['DELETE', '/users/:id']],
  platformCompanyManage: [['POST', '/platform/companies'], ['PATCH', '/platform/companies/:id']],
};

/** Itens de menu → rota que a página chama ao abrir. Faturas e Escalas usam permissão resolvida no servidor (fora do @Roles). */
const NAV_LANDING: Record<string, [string, string]> = {
  employees: ['GET', '/employees'],
  vacations: ['GET', '/vacations'],
  jobs: ['GET', '/jobs'],
  users: ['GET', '/users'],
  support: ['GET', '/support/tickets'],
  accounting: ['GET', '/accounting/overview'],
};

describe('leitura dos controllers do back', () => {
  it('encontra as rotas e os perfis de cada uma', () => {
    expect(routes.length).toBeGreaterThan(400);
    expect(routeFor('DELETE', '/employees/:id').roles).toEqual(expect.arrayContaining(['ADMIN', 'RH']));
    expect(routeFor('POST', '/vacations').roles).not.toContain('GESTOR');
  });
});

describe('matriz perfil × botão: a tela nunca oferece o que a API recusa', () => {
  for (const [group, targets] of Object.entries(BUTTONS) as Array<[RoleGroup, Array<[string, string]>]>) {
    it(`${group}: ${ROLE_ACCESS[group].join(', ')}`, () => {
      const divergences: string[] = [];
      for (const [method, path] of targets) {
        const route = routeFor(method, path);
        for (const role of ROLE_ACCESS[group]) {
          if (!backendAllows(route, role)) divergences.push(`${role} vê o botão mas ${method} ${path} responde 403`);
        }
      }
      expect(divergences).toEqual([]);
    });
  }
});

describe('matriz perfil × menu', () => {
  for (const [navId, [method, path]] of Object.entries(NAV_LANDING)) {
    it(`menu "${navId}" abre sem 403 para todo perfil que o enxerga`, () => {
      const item = NAV_ITEMS.find((candidate) => candidate.id === navId);
      expect(item, `item de menu ${navId}`).toBeDefined();
      const route = routeFor(method, path);
      const visibleTo = item!.roles.filter((role) =>
        !item!.anyPermission || item!.anyPermission.some((permission) => hasPermission({ role } as never, permission)),
      );
      const denied = visibleTo.filter((role) => !backendAllows(route, role));
      expect(denied, `${navId} aparece para ${denied.join(', ')} mas ${method} ${path} responde 403`).toEqual([]);
    });
  }
});
