import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../apps/web/app/lib/permissions', () => ({ hasPermission: () => true }));
import { getVisibleNavItems } from '../../../apps/web/app/[tenant]/dashboard/_components/shell-v2/nav-config';
import { canEditCompanyFor, sectionsFor } from '../../../apps/web/app/[tenant]/dashboard/settings/_hub/types';
import { isRecruiterOnlyAccount, usesRecruiterAgenda } from '../../../apps/web/app/lib/recruiter-account';

const FULL = ['employees', 'time-track', 'vacations', 'management', 'recruitment'];
const RS = ['recruitment'];
const user = (profile: string) => ({ id: 'u', name: 'X', email: 'x@x.com', profile, role: profile, companyId: 'c' }) as never;
const ids = (profile: string, modules: string[]) => getVisibleNavItems(user(profile), modules).map((item) => item.id);

describe('conta autonoma de R&S e perfil RH_RS', () => {
  it('detecta a conta so de Recrutamento', () => {
    expect(isRecruiterOnlyAccount(RS)).toBe(true);
    expect(isRecruiterOnlyAccount(FULL)).toBe(false);
    expect(usesRecruiterAgenda('RH_RS', FULL)).toBe(true);
    expect(usesRecruiterAgenda('ADMIN', RS)).toBe(true);
    expect(usesRecruiterAgenda('ADMIN', FULL)).toBe(false);
  });

  it('todo perfil ve Configuracoes (trocar senha)', () => {
    for (const profile of ['DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'RH_RS', 'GESTOR', 'FUNCIONARIO', 'CONSULTA']) {
      expect(ids(profile, FULL)).toContain('settings');
      expect(sectionsFor(profile, false)).toEqual(expect.arrayContaining(['conta', 'seguranca']));
    }
  });

  it('R&S ve Gestao apontando so para a Agenda', () => {
    const rs = getVisibleNavItems(user('RH_RS'), FULL);
    expect(rs.map((item) => item.id)).toEqual(expect.arrayContaining(['dashboard', 'jobs', 'management', 'settings']));
    expect(rs.find((item) => item.id === 'management')?.href).toBe('/dashboard/management/agenda');
    const autonomo = getVisibleNavItems(user('ADMIN'), RS);
    expect(autonomo.find((item) => item.id === 'management')?.href).toBe('/dashboard/management/agenda');
    expect(autonomo.map((item) => item.id)).not.toContain('employees');
    const empresa = getVisibleNavItems(user('ADMIN'), FULL);
    expect(empresa.find((item) => item.id === 'management')?.href).toBe('/dashboard/management');
  });

  it('dados da empresa: recrutador autonomo edita o proprio cadastro; RH_RS de empresa completa nao', () => {
    expect(sectionsFor('RH_RS', true)).toEqual(['conta', 'seguranca', 'empresa']);
    expect(canEditCompanyFor('RH_RS', true)).toBe(true);
    expect(sectionsFor('RH_RS', false)).toEqual(['conta', 'seguranca']);
    expect(canEditCompanyFor('RH_RS', false)).toBe(false);
    expect(sectionsFor('ADMIN', true)).not.toContain('horaextra');
    expect(sectionsFor('ADMIN', false)).toContain('horaextra');
  });
});
