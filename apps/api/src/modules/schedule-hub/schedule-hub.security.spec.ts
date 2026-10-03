import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { JwtUser } from '../../common/types/auth.types';
import { ScheduleScopeService } from '../schedule/access/schedule-scope.service';
import { RequestsService } from './requests/requests.service';

const actor = (role: JwtUser['role'], sub = 'user-1'): JwtUser => ({ sub, email: `${sub}@x.test`, companyId: 'company-1', role });

function scopeWith(self: any, team: any[] = []) {
  const prisma = {
    employee: {
      findFirst: vi.fn().mockResolvedValue(self),
      findMany: vi.fn().mockResolvedValue(team),
    },
  } as any;
  return { scope: new ScheduleScopeService(prisma), prisma };
}

describe('ScheduleScopeService', () => {
  it('funcionário só enxerga a si mesmo', async () => {
    const { scope } = scopeWith({ id: 'e1', name: 'Ana', managerId: null, department: 'RH' });
    expect(await scope.allowedEmployeeIds(actor('FUNCIONARIO'), 'calendar.read')).toEqual(['e1']);
    await expect(scope.assertEmployee(actor('FUNCIONARIO'), 'calendar.read', 'outro')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('gestor enxerga a si e sua equipe', async () => {
    const { scope } = scopeWith({ id: 'g1', name: 'Gil', managerId: null, department: 'Ops' }, [{ id: 'e1' }, { id: 'e2' }]);
    expect(await scope.allowedEmployeeIds(actor('GESTOR'), 'approvals')).toEqual(['g1', 'e1', 'e2']);
  });

  it('RH/ADMIN têm a empresa inteira; COMERCIAL e CONSULTA (escrita) são barrados', async () => {
    const { scope } = scopeWith(null);
    expect(await scope.allowedEmployeeIds(actor('RH'), 'schedule.write')).toBeNull();
    await expect(scope.allowedEmployeeIds(actor('COMERCIAL'), 'calendar.read')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(scope.allowedEmployeeIds(actor('CONSULTA'), 'schedule.write')).rejects.toBeInstanceOf(ForbiddenException);
    expect(() => scope.assertCapability(actor('CEO'), 'approvals')).toThrow(ForbiddenException);
  });
});

describe('RequestsService — decisão', () => {
  function service(row: any, requester: any, me: any) {
    const prisma = {
      scheduleRequest: { findFirst: vi.fn().mockResolvedValue(row), update: vi.fn(), updateMany: vi.fn() },
      employee: { findUnique: vi.fn().mockResolvedValue(requester) },
      auditLog: { create: vi.fn() },
    } as any;
    const scope = { employeeOf: vi.fn().mockResolvedValue(me) } as any;
    const instance = new RequestsService(prisma, scope, {} as any, {} as any, {} as any, { notify: vi.fn(), hrUserIds: vi.fn().mockResolvedValue([]) } as any);
    return { instance, prisma };
  }
  const row = { id: 'r1', companyId: 'company-1', status: 'PENDING', type: 'TROCA_FOLGA', currentStep: 'MANAGER', steps: [{ step: 'MANAGER', status: 'PENDING' }], payload: {}, peerEmployeeId: null, requesterEmployeeId: 'e1' };
  const requester = { id: 'e1', name: 'Ana', userId: 'u-ana', managerId: 'g1', department: 'Ops' };

  it('ninguém aprova o próprio pedido (nem RH)', async () => {
    const { instance } = service(row, { ...requester, userId: 'user-1' }, { id: 'e1' });
    await expect(instance.decide(actor('RH'), 'r1', { action: 'APPROVE' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('gestor de outra equipe não decide', async () => {
    const { instance } = service(row, requester, { id: 'g2' });
    await expect(instance.decide(actor('GESTOR', 'u-g2'), 'r1', { action: 'APPROVE' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('funcionário não decide pedidos', async () => {
    const { instance } = service(row, requester, { id: 'e9' });
    await expect(instance.decide(actor('FUNCIONARIO', 'u-e9'), 'r1', { action: 'APPROVE' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reprovar exige motivo', async () => {
    const { instance } = service(row, requester, { id: 'g1' });
    await expect(instance.decide(actor('GESTOR', 'u-g1'), 'r1', { action: 'REJECT' })).rejects.toThrow(/motivo/i);
  });

  it('gestor da equipe reprova com motivo e o pedido fica REJECTED', async () => {
    const { instance, prisma } = service(row, requester, { id: 'g1' });
    const result = await instance.decide(actor('GESTOR', 'u-g1'), 'r1', { action: 'REJECT', note: 'Cobertura insuficiente' });
    expect(result.status).toBe('REJECTED');
    expect(prisma.scheduleRequest.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'REJECTED', decisionNote: 'Cobertura insuficiente' }) }));
  });
});
