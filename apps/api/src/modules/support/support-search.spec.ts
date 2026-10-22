import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { SupportService } from './support.service';

const SCOPE = { companyId: 'company-a', OR: [{ affectedUserId: 'u1' }] };

function make(over: Record<string, any> = {}) {
  const repository: any = {
    findTickets: vi.fn().mockResolvedValue([]),
    findIdByProtocol: vi.fn().mockResolvedValue({ id: 'ticket-1' }),
    findClientTicketById: vi.fn().mockResolvedValue(rawTicket()),
    findPlatformTicketById: vi.fn().mockResolvedValue(rawTicket()),
    ...over,
  };
  const auth: any = {
    buildTicketListWhere: vi.fn().mockResolvedValue(SCOPE),
    assertCanViewTicket: vi.fn().mockResolvedValue(true),
  };
  return { service: new SupportService(repository, auth, {} as any), repository, auth };
}
const actor = (role: string) => ({ sub: 'u1', companyId: 'company-a', role, name: 'X', email: 'x@x.com' }) as any;

function rawTicket() {
  return {
    id: 'ticket-1', ticketNumber: '202610211020121', companyId: 'company-a', status: 'IN_PROGRESS',
    events: [
      { id: 'e1', eventType: 'TICKET_CREATED', createdAt: new Date('2026-10-21T13:20:00Z') },
      { id: 'e2', eventType: 'INTERNAL_NOTE', createdAt: new Date('2026-10-21T13:25:00Z') },
    ],
    messages: [
      { id: 'm1', visibility: 'PUBLIC', message: 'Ola, cliente', createdAt: new Date('2026-10-21T13:21:00Z'), author: { name: 'Suporte' } },
      { id: 'm2', visibility: 'INTERNAL', message: 'segredo da equipe', createdAt: new Date('2026-10-21T13:25:00Z'), author: { name: 'Suporte' } },
    ],
    attachments: [],
  };
}

const whereOf = (repository: any) => repository.findTickets.mock.calls[0][0];

describe('SupportService.listTickets: protocolo e data', () => {
  it('sem filtros devolve so o escopo do perfil', async () => {
    const { service, repository } = make();
    await service.listTickets(actor('ADMIN'), {} as any);
    expect(whereOf(repository)).toEqual(SCOPE);
  });

  it('protocolo completo busca igualdade exata; parcial busca por trecho', async () => {
    const { service, repository } = make();
    await service.listTickets(actor('ADMIN'), { protocol: '2026.1021-1020121' } as any);
    expect(whereOf(repository).AND).toContainEqual({ ticketNumber: '202610211020121' });
    await service.listTickets(actor('ADMIN'), { protocol: '20261021' } as any);
    expect(repository.findTickets.mock.calls[1][0].AND).toContainEqual({ ticketNumber: { contains: '20261021' } });
  });

  it('o filtro nunca sobrescreve o OR de visibilidade do perfil (cliente nao ve chamado alheio)', async () => {
    const { service, repository } = make();
    await service.listTickets(actor('FUNCIONARIO'), { protocol: '2026', search: 'senha', status: 'NEW' } as any);
    const where = whereOf(repository);
    expect(where.AND[0]).toEqual(SCOPE);
    expect(where.OR).toBeUndefined();
  });

  it('datas sao dias de Sao Paulo: dateTo inclui o dia inteiro', async () => {
    const { service, repository } = make();
    await service.listTickets(actor('ADMIN'), { dateFrom: '2026-10-21', dateTo: '2026-10-21' } as any);
    const range = whereOf(repository).AND.find((f: any) => f.createdAt).createdAt;
    expect(range.gte.toISOString()).toBe('2026-10-21T03:00:00.000Z');
    expect(range.lt.toISOString()).toBe('2026-10-22T03:00:00.000Z');
  });

  it('so dateFrom ou so dateTo tambem funcionam', async () => {
    const { service, repository } = make();
    await service.listTickets(actor('ADMIN'), { dateFrom: '2026-10-01' } as any);
    const only = whereOf(repository).AND.find((f: any) => f.createdAt).createdAt;
    expect(only.gte).toBeInstanceOf(Date);
    expect(only.lt).toBeUndefined();
  });

  it('recusa data inexistente e intervalo invertido', async () => {
    const { service } = make();
    await expect(service.listTickets(actor('ADMIN'), { dateFrom: '2026-02-31' } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.listTickets(actor('ADMIN'), { dateFrom: '2026-10-22', dateTo: '2026-10-21' } as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SupportService.getTicketByProtocol', () => {
  it('procura dentro do escopo do perfil e devolve o chamado com historico', async () => {
    const { service, repository } = make();
    const ticket: any = await service.getTicketByProtocol(actor('ADMIN'), '2026 1021 1020121');
    expect(repository.findIdByProtocol).toHaveBeenCalledWith('202610211020121', SCOPE);
    expect(ticket.ticketNumber).toBe('202610211020121');
    expect(Array.isArray(ticket.timeline)).toBe(true);
  });

  it('protocolo de outra empresa ou inexistente = 404 (nao revela que existe)', async () => {
    const { service } = make({ findIdByProtocol: vi.fn().mockResolvedValue(null) });
    await expect(service.getTicketByProtocol(actor('ADMIN'), '202610211020121')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('protocolo vazio ou so letras = 400', async () => {
    const { service } = make();
    await expect(service.getTicketByProtocol(actor('ADMIN'), ' abc ')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SupportService.getTicket: historico e notas internas', () => {
  it('cliente (ADMIN da empresa) nao recebe nota interna nem no historico', async () => {
    const { service } = make();
    const ticket: any = await service.getTicket(actor('ADMIN'), 'ticket-1');
    expect(JSON.stringify(ticket)).not.toContain('segredo da equipe');
    expect(ticket.messages).toHaveLength(1);
    expect(ticket.events.map((e: any) => e.eventType)).toEqual(['TICKET_CREATED']);
    expect(ticket.timeline.map((entry: any) => entry.label)).toEqual(['Chamado aberto', 'Resposta']);
  });

  it('COMERCIAL (plataforma) tambem nao ve nota interna: so DEV', async () => {
    const { service } = make();
    const ticket: any = await service.getTicket(actor('COMERCIAL'), 'ticket-1');
    expect(JSON.stringify(ticket)).not.toContain('segredo da equipe');
  });

  it('DEV ve a nota interna e o historico completo', async () => {
    const { service } = make();
    const ticket: any = await service.getTicket(actor('DEV'), 'ticket-1');
    expect(ticket.timeline.map((entry: any) => entry.label)).toEqual(['Chamado aberto', 'Resposta', 'Nota interna']);
  });
});
