import { describe, expect, it } from 'vitest';
import { isRouteAllowedForRecruiter } from '../../../apps/web/app/[tenant]/dashboard/_components/shell-v2/rs-route-access';

const home = '/acme/dashboard';
describe('rotas do RH_RS', () => {
  it('Vagas e a pagina inicial do dashboard sao permitidas', () => {
    expect(isRouteAllowedForRecruiter('jobs', '/acme/dashboard/jobs/abc', home)).toBe(true);
    expect(isRouteAllowedForRecruiter('dashboard', '/acme/dashboard', home)).toBe(true);
    expect(isRouteAllowedForRecruiter('dashboard', '/acme/dashboard/', home)).toBe(true);
  });
  it('qualquer outra rota e bloqueada, inclusive as sem item de menu que casam por prefixo', () => {
    for (const [owner, path] of [['dashboard', '/acme/dashboard/payroll'], ['dashboard', '/acme/dashboard/notifications'], ['employees', '/acme/dashboard/employees'], ['users', '/acme/dashboard/users'], ['platform', '/acme/dashboard/platform'], [undefined, '/acme/portal']] as const) {
      expect(isRouteAllowedForRecruiter(owner, path, home)).toBe(false);
    }
  });
});