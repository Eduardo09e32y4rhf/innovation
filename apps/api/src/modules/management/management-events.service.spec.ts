import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ManagementEventsService, pickEventData } from './management-events.service';

describe('pickEventData', () => {
  it('so aceita os campos do compromisso (companyId e createdBy nunca vem do corpo)', () => {
    const data = pickEventData({ title: ' Reunião ', startDateTime: '2026-10-16T12:00:00Z', companyId: 'outra', createdBy: 'x', id: 'y', meetingUrl: 'meet.google.com/abc' }, 'create') as Record<string, unknown>;
    expect(data.title).toBe('Reunião');
    expect(data.companyId).toBeUndefined();
    expect(data.createdBy).toBeUndefined();
    expect(data.id).toBeUndefined();
    expect(data.eventType).toBe('REUNIAO');
    expect(data.meetingUrl).toBe('https://meet.google.com/abc');
  });
  it('valida link, datas e listas', () => {
    expect(() => pickEventData({ title: 'x', startDateTime: '2026-10-16T12:00:00Z', meetingUrl: 'javascript:alert(1)' }, 'create')).toThrow(BadRequestException);
    expect(() => pickEventData({ title: 'x', startDateTime: '2026-10-16T12:00:00Z', endDateTime: '2026-10-16T11:00:00Z' }, 'create')).toThrow(/antes do início/);
    expect(() => pickEventData({ title: '', startDateTime: '2026-10-16T12:00:00Z' }, 'create')).toThrow(/título/);
    expect(() => pickEventData({ status: 'APAGADO' }, 'update')).toThrow(BadRequestException);
    expect(pickEventData({ meetingUrl: '' }, 'update')).toEqual({ meetingUrl: null });
    expect(pickEventData({ status: 'concluido' }, 'update')).toEqual({ status: 'CONCLUIDO' });
  });
});

describe('agenda do RH - R&S', () => {
  it('lista so os proprios compromissos e cria sem funcionario vinculado', async () => {
    const prisma = { managementEvent: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: 'e1' }) }, employee: { findFirst: vi.fn() } };
    const service = new ManagementEventsService(prisma as never);
    await service.list('c1', { sub: 'u1', role: 'RH_RS' });
    expect(prisma.managementEvent.findMany.mock.calls[0][0].where).toEqual({ companyId: 'c1', OR: [{ createdBy: 'u1' }, { responsibleUserId: 'u1' }] });
    await service.list('c1', { sub: 'u2', role: 'RH' });
    expect(prisma.managementEvent.findMany.mock.calls[1][0].where).toEqual({ companyId: 'c1' });
    await service.create('c1', 'u1', { title: 'Entrevista', startDateTime: '2026-10-16T12:00:00Z', employeeId: 'emp', responsibleUserId: 'outro' }, { sub: 'u1', role: 'RH_RS' });
    const created = prisma.managementEvent.create.mock.calls[0][0].data;
    expect(created).toMatchObject({ companyId: 'c1', createdBy: 'u1', employeeId: null, responsibleUserId: 'u1' });
    expect(prisma.employee.findFirst).not.toHaveBeenCalled();
  });
});
