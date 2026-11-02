import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { rolesWith } from './access/schedule-access';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

// API-06: GET /schedules/:id devolve o MODELO de escala (jornada) da empresa, o mesmo conteudo de GET /schedules, sem dado de
// colaborador. Por isso nao ha escopo de equipe a aplicar: o limite correto e papel (calendar.read) + empresa.
describe('API-06 GET /schedules/:id papel x recurso', () => {
  it('so perfis com calendar.read alcancam a rota (COMERCIAL, RH_RS e CONTABIL ficam de fora)', () => {
    const roles: string[] = Reflect.getMetadata(ROLES_KEY, ScheduleController);
    expect(roles).toEqual(rolesWith('calendar.read'));
    for (const out of ['COMERCIAL', 'RH_RS', 'CONTABIL']) expect(roles).not.toContain(out);
  });
  it('escala de outra empresa e 404 e a consulta sempre filtra por companyId', async () => {
    const findFirst = vi.fn(async () => null);
    const svc = Object.assign(Object.create(ScheduleService.prototype), { prisma: { schedule: { findFirst } } });
    await expect(svc.getSchedule('c1', 's-de-c2')).rejects.toMatchObject({ status: 404 });
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 's-de-c2', companyId: 'c1' } });
  });
});
