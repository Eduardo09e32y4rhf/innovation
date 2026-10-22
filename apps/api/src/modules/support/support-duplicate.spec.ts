import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupportDuplicateService } from './support-duplicate.service';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const T1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const T2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const T3 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const dev = { sub: 'dev-1', role: 'DEV', companyId: 'p' } as any;
const ceo = { sub: 'ceo-1', role: 'CEO', companyId: 'p' } as any;

function setup(rows: any[]) {
  const tickets = new Map(rows.map(r => [r.id, { ...r }]));
  const events: any[] = [];
  const prisma: any = {
    supportTicket: {
      findUnique: vi.fn(async ({ where }: any) => tickets.get(where.id) ?? null),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const t = tickets.get(where.id);
        if (!t || t.status === 'DUPLICATE') return { count: 0 };
        Object.assign(t, data);
        return { count: 1 };
      }),
    },
    supportTicketEvent: { create: vi.fn(async ({ data }: any) => { events.push(data); return data; }) },
  };
  const notifier: any = { notifyDuplicate: vi.fn() };
  return { service: new SupportDuplicateService(prisma, notifier), tickets, events, notifier };
}
const base = [
  { id: T1, ticketNumber: 'SUP-1', status: 'OPEN', companyId: A },
  { id: T2, ticketNumber: 'SUP-2', status: 'IN_PROGRESS', companyId: A, duplicateOfId: null },
  { id: T3, ticketNumber: 'SUP-3', status: 'OPEN', companyId: B },
];

describe('SupportDuplicateService', () => {
  let env: ReturnType<typeof setup>;
  beforeEach(() => { env = setup(base); });

  it('DEV e CEO marcam duplicado, geram evento e avisam o cliente', async () => {
    const res = await env.service.markDuplicate(dev, T1, T2);
    expect(res).toMatchObject({ status: 'DUPLICATE', duplicateOfId: T2, duplicateOfNumber: 'SUP-2' });
    expect(env.tickets.get(T1)).toMatchObject({ status: 'DUPLICATE', duplicateOfId: T2 });
    expect(env.events[0]).toMatchObject({ ticketId: T1, actorUserId: 'dev-1', eventType: 'TICKET_DUPLICATE' });
    expect(env.notifier.notifyDuplicate).toHaveBeenCalledWith(T1, 'SUP-2');
    const other = setup(base);
    await expect(other.service.markDuplicate(ceo, T1, T2)).resolves.toMatchObject({ success: true });
  });

  it.each(['ADMIN', 'RH', 'COMERCIAL', 'FUNCIONARIO'])('perfil %s é recusado', async role => {
    await expect(env.service.markDuplicate({ sub: 'u', role, companyId: A } as any, T1, T2)).rejects.toThrow(ForbiddenException);
    expect(env.tickets.get(T1)!.status).toBe('OPEN');
  });

  it('recusa original de outra empresa (isolamento) e não altera nada', async () => {
    await expect(env.service.markDuplicate(dev, T1, T3)).rejects.toThrow(BadRequestException);
    expect(env.tickets.get(T1)!.status).toBe('OPEN');
    expect(env.events).toHaveLength(0);
    expect(env.notifier.notifyDuplicate).not.toHaveBeenCalled();
  });

  it('aceita dois chamados da plataforma, sem empresa', async () => {
    const e = setup([{ id: T1, ticketNumber: 'P-1', status: 'NEW', companyId: null }, { id: T2, ticketNumber: 'P-2', status: 'NEW', companyId: null }]);
    await expect(e.service.markDuplicate(dev, T1, T2)).resolves.toMatchObject({ success: true });
  });

  it('recusa empresa x plataforma', async () => {
    const e = setup([{ id: T1, ticketNumber: 'P-1', status: 'NEW', companyId: null }, { id: T2, ticketNumber: 'S-2', status: 'NEW', companyId: A }]);
    await expect(e.service.markDuplicate(dev, T1, T2)).rejects.toThrow(BadRequestException);
  });

  it('recusa si mesmo, id inválido, inexistente, original já duplicado e repetição', async () => {
    await expect(env.service.markDuplicate(dev, T1, T1)).rejects.toThrow(BadRequestException);
    await expect(env.service.markDuplicate(dev, 'x', T2)).rejects.toThrow(NotFoundException);
    await expect(env.service.markDuplicate(dev, T1, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd')).rejects.toThrow(NotFoundException);
    env.tickets.get(T2)!.status = 'DUPLICATE';
    await expect(env.service.markDuplicate(dev, T1, T2)).rejects.toThrow(BadRequestException);
    env.tickets.get(T2)!.status = 'OPEN';
    await env.service.markDuplicate(dev, T1, T2);
    await expect(env.service.markDuplicate(dev, T1, T2)).rejects.toThrow(ConflictException);
  });
});
