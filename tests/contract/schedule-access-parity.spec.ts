import { describe, expect, it } from 'vitest';
import { SCHEDULE_ACCESS as backend } from '../../apps/api/src/modules/schedule/access/schedule-access';
import { SCHEDULE_ACCESS as frontend, hasScheduleModule, visibleViews } from '../../apps/web/app/lib/schedule-access';

const clean = (matrix: Record<string, Record<string, string | undefined>>) =>
  Object.fromEntries(Object.entries(matrix).map(([role, caps]) => [role, Object.fromEntries(Object.entries(caps).filter(([, scope]) => scope))]));

describe('Matriz de permissões de Escalas (back × front)', () => {
  it('é idêntica no backend e no frontend', () => {
    expect(clean(frontend as never)).toEqual(clean(backend as never));
  });

  it('o menu respeita as capacidades de cada perfil', () => {
    expect(hasScheduleModule('COMERCIAL')).toBe(false);
    expect(visibleViews('FUNCIONARIO').map((view) => view.id)).toEqual(['hoje', 'calendario', 'ponto', 'solicitacoes', 'fechamento']);
    expect(visibleViews('GESTOR').map((view) => view.id)).toContain('aprovacoes');
    expect(visibleViews('CEO').map((view) => view.id)).toEqual(['hoje', 'calendario', 'ponto', 'fechamento', 'relatorios']);
    expect(visibleViews('CONTABIL').map((view) => view.id)).toEqual(['hoje', 'fechamento', 'relatorios']);
    expect(visibleViews('CONSULTA').map((view) => view.id)).not.toContain('solicitacoes');
    expect(visibleViews('RH').map((view) => view.id)).toEqual(expect.arrayContaining(['modelos', 'aprovacoes', 'fechamento', 'relatorios']));
  });
});
