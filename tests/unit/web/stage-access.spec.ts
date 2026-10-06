import { describe, expect, it } from 'vitest';
import { canHire, selectableStages } from '../../../apps/web/app/[tenant]/dashboard/jobs/stage-access';

const stages = [{ id: 'a', kind: 'APPLIED' }, { id: 'h', kind: 'HIRED' }, { id: 'r', kind: 'REJECTED' }];

describe('etapa Contratado por perfil', () => {
  it('RH_RS nao recebe a etapa Contratado; os demais recebem', () => {
    expect(selectableStages('RH_RS', stages).map((s) => s.id)).toEqual(['a', 'r']);
    expect(selectableStages('rh_rs', stages)).toHaveLength(2);
    for (const role of ['RH', 'ADMIN', 'DEV', 'GESTOR', undefined]) expect(selectableStages(role, stages)).toHaveLength(3);
  });
  it('so DEV, ADMIN, RH e GESTOR contratam (igual a API)', () => {
    for (const r of ['DEV', 'ADMIN', 'RH', 'GESTOR']) expect(canHire(r)).toBe(true);
    for (const r of ['RH_RS', 'CEO', 'CONSULTA', 'FUNCIONARIO', null]) expect(canHire(r)).toBe(false);
  });
});