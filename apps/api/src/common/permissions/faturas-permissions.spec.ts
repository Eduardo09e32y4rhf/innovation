import { describe, expect, it } from 'vitest';
import { userHasFaturasPermission } from './faturas-permissions';

describe('userHasFaturasPermission', () => {
  it('usa o padrão do perfil quando não há permissões personalizadas', () => {
    expect(userHasFaturasPermission({ role: 'ADMIN' }, 'faturas.pagar')).toBe(true);
    expect(userHasFaturasPermission({ role: 'RH', customPermissions: [] }, 'faturas.ver')).toBe(true);
    expect(userHasFaturasPermission({ role: 'GESTOR' }, 'faturas.ver')).toBe(false);
  });

  it('contador só vê e anexa NF; não cobra nem reembolsa', () => {
    expect(userHasFaturasPermission({ role: 'CONTABIL' }, 'faturas.todas_empresas')).toBe(true);
    expect(userHasFaturasPermission({ role: 'CONTABIL' }, 'faturas.nf_anexar')).toBe(true);
    expect(userHasFaturasPermission({ role: 'CONTABIL' }, 'faturas.cobrar')).toBe(false);
    expect(userHasFaturasPermission({ role: 'CONTABIL' }, 'faturas.reembolsar')).toBe(false);
  });

  it('permissões personalizadas substituem o padrão do perfil', () => {
    expect(userHasFaturasPermission({ role: 'GESTOR', customPermissions: ['faturas.ver'] }, 'faturas.ver')).toBe(true);
    expect(userHasFaturasPermission({ role: 'ADMIN', customPermissions: ['users.view_team'] }, 'faturas.ver')).toBe(false);
  });

  it('DEV sempre passa', () => {
    expect(userHasFaturasPermission({ role: 'DEV', customPermissions: ['x'] }, 'faturas.reembolsar')).toBe(true);
  });
});
