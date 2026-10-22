import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SupportRefundService } from './support-refund.service';
import { SupportSatisfactionService } from './support-satisfaction.service';
import { applyRefundPolicy, suggestedProportionalCents } from './support-refund.policy';

const A = '11111111-1111-4111-8111-111111111111'; // empresa A
const B = '22222222-2222-4222-8222-222222222222'; // empresa B
const PLATFORM = '33333333-3333-4333-8333-333333333333';
const INV = '44444444-4444-4444-8444-444444444444';
const TKT = '55555555-5555-4555-8555-555555555555';
const DAY = 86_400_000;

const admin = { sub: 'admin-a', companyId: A, role: 'ADMIN', email: 'a@a.com', name: 'Admin A' } as any;
const dev1 = { sub: 'dev-1', companyId: PLATFORM, role: 'DEV', email: 'd1@x.com' } as any;
const ceo2 = { sub: 'ceo-2', companyId: PLATFORM, role: 'CEO', email: 'c2@x.com' } as any;

const match = (row: any, where: any): boolean => Object.entries(where).every(([k, v]: [string, any]) => {
  if (k === 'OR') return v.some((w: any) => match(row, w));
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    if ('in' in v) return v.in.includes(row[k]);
    if ('not' in v) return row[k] !== v.not;
  }
  return (row[k] ?? null) === (v ?? null);
});

function makeEnv(opts: { invoice?: any; ops?: any[]; tickets?: any[] } = {}) {
  const tickets = new Map<string, any>();
  for (const t of opts.tickets ?? []) tickets.set(t.id, t);
  const events: any[] = [];
  const invoice = { id: INV, companyId: A, status: 'PAID', amount: 300, refundedAmount: 0, paidAt: new Date(Date.now() - 2 * DAY), dueDate: new Date(), deletedAt: null, description: 'Plano', plan: { cycle: 'MONTHLY' }, ...opts.invoice };
  const prisma: any = {
    platformInvoice: { findFirst: vi.fn(async ({ where }: any) => (where.id === invoice.id && where.companyId === invoice.companyId ? invoice : null)) },
    paymentRefund: { findMany: vi.fn(async () => opts.ops ?? []) },
    supportTicket: {
      findMany: vi.fn(async ({ where }: any) => [...tickets.values()].filter(t => match(t, where))),
      findUnique: vi.fn(async ({ where }: any) => tickets.get(where.id) ?? null),
      findFirst: vi.fn(async ({ where }: any) => [...tickets.values()].find(t => match(t, where)) ?? null),
      update: vi.fn(async ({ where, data }: any) => Object.assign(tickets.get(where.id), data)),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const rows = [...tickets.values()].filter(t => match(t, where));
        rows.forEach(r => Object.assign(r, data));
        return { count: rows.length };
      }),
    },
    supportTicketEvent: { create: vi.fn(async ({ data }: any) => { events.push(data); return data; }) },
  };
  const repository: any = {
    generateTicketNumber: vi.fn(async () => 'SUP-2026-000001'),
    createTicket: vi.fn(async (data: any) => { const t = { id: TKT, status: 'NEW', ...data }; tickets.set(t.id, t); return t; }),
  };
  const sla: any = { calculateDueDates: () => ({ firstResponseDueAt: new Date(), resolutionDueAt: new Date() }) };
  const paymentRefund: any = { request: vi.fn(async (_inv: string, input: any) => ({ id: 'pr-1', status: 'PENDING', amount: input.amount ?? 300 })) };
  const notifier: any = {
    notifyRefundDecision: vi.fn(), notifyRefundAwaitingSecond: vi.fn(), notifyRefundConfirmed: vi.fn(), notifyRefundFailed: vi.fn(),
  };
  const moduleRef: any = { get: () => paymentRefund };
  const service = new SupportRefundService(prisma, repository, sla, moduleRef, notifier);
  return { service, prisma, repository, paymentRefund, notifier, tickets, events, invoice };
}

const refundTicket = (over: any = {}) => ({
  id: TKT, ticketNumber: 'SUP-2026-000001', category: 'REFUND', companyId: A, createdByUserId: 'admin-a', invoiceId: INV,
  refundKind: 'PARTIAL', refundAmount: 100, refundStatus: 'REQUESTED', paymentRefundId: null, refundDecisionById: null, ...over,
});

describe('política de reembolso', () => {
  const base = { paid: 1200, available: 1200, cycle: 'YEARLY', now: new Date('2026-06-01T00:00:00Z'), windowDays: 7 };
  it('TOTAL dentro da janela devolve todo o saldo', () => {
    expect(applyRefundPolicy({ ...base, kind: 'TOTAL', paidAt: new Date('2026-05-28T00:00:00Z') })).toBe(1200);
  });
  it('TOTAL no último dia da janela ainda é aceito e no dia seguinte não', () => {
    expect(applyRefundPolicy({ ...base, kind: 'TOTAL', paidAt: new Date('2026-05-25T00:00:00Z') })).toBe(1200);
    expect(() => applyRefundPolicy({ ...base, kind: 'TOTAL', paidAt: new Date('2026-05-24T00:00:00Z') })).toThrow(BadRequestException);
  });
  it('TOTAL fora da janela informa o valor sugerido proporcional (ciclo anual)', () => {
    try {
      applyRefundPolicy({ ...base, kind: 'TOTAL', paidAt: new Date('2026-03-01T00:00:00Z') });
      throw new Error('deveria falhar');
    } catch (e: any) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect(e.getResponse().suggestedAmount).toBeGreaterThan(0);
      expect(e.getResponse().suggestedAmount).toBeLessThan(1200);
      expect(e.getResponse().message).toContain('parcial');
    }
  });
  it('PARCIAL fora da janela só em ciclo anual', () => {
    const paidAt = new Date('2026-03-01T00:00:00Z');
    expect(() => applyRefundPolicy({ ...base, cycle: 'MONTHLY', kind: 'PARTIAL', amount: 10, paidAt })).toThrow(/ciclo anual/);
  });
  it('PARCIAL anual fora da janela limita ao proporcional não usado', () => {
    const paidAt = new Date('2026-03-01T00:00:00Z');
    const suggested = suggestedProportionalCents({ paid: 1200, available: 1200, paidAt, now: base.now }) / 100;
    expect(suggested).toBeCloseTo(1200 * (1 - 92 / 365), 0);
    expect(applyRefundPolicy({ ...base, kind: 'PARTIAL', amount: suggested, paidAt })).toBe(suggested);
    expect(() => applyRefundPolicy({ ...base, kind: 'PARTIAL', amount: suggested + 0.01, paidAt })).toThrow(/Valor máximo/);
  });
  it('PARCIAL acima do saldo é recusado mesmo dentro da janela', () => {
    expect(() => applyRefundPolicy({ ...base, available: 80, kind: 'PARTIAL', amount: 80.01, paidAt: new Date('2026-05-30T00:00:00Z') })).toThrow(/excede o saldo/);
  });
  it('sem saldo ou parcial sem valor é recusado', () => {
    expect(() => applyRefundPolicy({ ...base, available: 0, kind: 'TOTAL', paidAt: new Date('2026-05-30T00:00:00Z') })).toThrow(/não tem saldo/);
    expect(() => applyRefundPolicy({ ...base, kind: 'PARTIAL', paidAt: new Date('2026-05-30T00:00:00Z') })).toThrow(/valor/);
  });
  describe('REFUND_FULL_WINDOW_DAYS', () => {
    afterEach(() => { delete process.env.REFUND_FULL_WINDOW_DAYS; });
    it('lê a janela do ambiente', () => {
      process.env.REFUND_FULL_WINDOW_DAYS = '30';
      const { windowDays, ...rest } = base;
      expect(applyRefundPolicy({ ...rest, kind: 'TOTAL', paidAt: new Date('2026-05-10T00:00:00Z') })).toBe(1200);
    });
  });
});

describe('SupportRefundService.createRequest', () => {
  it('perfil diferente de ADMIN recebe 403', async () => {
    const { service } = makeEnv();
    for (const role of ['FUNCIONARIO', 'RH', 'GESTOR', 'CEO', 'CONSULTA']) {
      await expect(service.createRequest({ ...admin, role }, { invoiceId: INV, kind: 'TOTAL', reason: 'motivo teste' })).rejects.toThrow(ForbiddenException);
    }
  });
  it('isolamento: fatura de outra empresa devolve 404', async () => {
    const { service } = makeEnv({ invoice: { companyId: B } });
    await expect(service.createRequest(admin, { invoiceId: INV, kind: 'TOTAL', reason: 'motivo teste' })).rejects.toThrow(NotFoundException);
  });
  it('fatura não paga é recusada', async () => {
    const { service } = makeEnv({ invoice: { status: 'OPEN' } });
    await expect(service.createRequest(admin, { invoiceId: INV, kind: 'TOTAL', reason: 'motivo teste' })).rejects.toThrow(/fatura paga/);
  });
  it('cria chamado REFUND ligado à fatura com evento na linha do tempo', async () => {
    const { service, repository, events } = makeEnv();
    const ticket = await service.createRequest(admin, { invoiceId: INV, kind: 'TOTAL', reason: 'cobrança indevida' });
    expect(repository.createTicket).toHaveBeenCalledWith(expect.objectContaining({ category: 'REFUND', invoiceId: INV, refundStatus: 'REQUESTED', refundKind: 'TOTAL', companyId: A, createdByUserId: 'admin-a' }));
    expect(ticket.refundAmount).toBe(300);
    expect(events.map(e => e.eventType)).toEqual(['TICKET_CREATED', 'REFUND_REQUESTED']);
  });
  it('teto: desconta devolvido, estornos em andamento e pedidos pendentes', async () => {
    const { service } = makeEnv({
      invoice: { refundedAmount: 50 }, ops: [{ amount: 100 }],
      tickets: [refundTicket({ id: '66666666-6666-4666-8666-666666666666', refundAmount: 50, refundStatus: 'REQUESTED' })],
    });
    // 300 - 50 - 100 - 50 = 100 disponível
    await expect(service.createRequest(admin, { invoiceId: INV, kind: 'PARTIAL', amount: 100.01, reason: 'motivo teste' })).rejects.toThrow(/excede o saldo/);
    const ok = await service.createRequest(admin, { invoiceId: INV, kind: 'PARTIAL', amount: 100, reason: 'motivo teste' });
    expect(ok.refundAmount).toBe(100);
  });
});

describe('SupportRefundService decisões da plataforma', () => {
  it('somente DEV e CEO decidem (403 para os demais) e o solicitante não decide o próprio pedido', async () => {
    const { service } = makeEnv({ tickets: [refundTicket()] });
    for (const role of ['ADMIN', 'FUNCIONARIO', 'COMERCIAL', 'RH']) {
      await expect(service.approve({ ...dev1, role }, TKT)).rejects.toThrow(ForbiddenException);
      await expect(service.reject({ ...dev1, role }, TKT, 'x')).rejects.toThrow(ForbiddenException);
    }
    await expect(service.approve({ ...dev1, sub: 'admin-a' }, TKT)).rejects.toThrow(ForbiddenException);
    await expect(service.approve({ ...ceo2, companyId: A }, TKT)).rejects.toThrow(ForbiddenException);
  });
  it('aprovação simples chama o estorno com idempotência = id do chamado', async () => {
    const { service, paymentRefund, tickets, events, notifier } = makeEnv({ tickets: [refundTicket()] });
    const res = await service.approve(dev1, TKT);
    expect(paymentRefund.request).toHaveBeenCalledWith(INV, expect.objectContaining({ amount: 100, key: TKT, actorId: 'dev-1' }));
    expect(res.refundStatus).toBe('PROCESSING');
    expect(tickets.get(TKT)).toMatchObject({ refundStatus: 'PROCESSING', paymentRefundId: 'pr-1', refundDecisionById: 'dev-1' });
    expect(events.map(e => e.eventType)).toEqual(['REFUND_APPROVED', 'REFUND_PROCESSING']);
    expect(notifier.notifyRefundDecision).toHaveBeenCalledWith(TKT, true);
  });
  it('TOTAL envia o estorno sem valor (todo o saldo)', async () => {
    const { service, paymentRefund } = makeEnv({ tickets: [refundTicket({ refundKind: 'TOTAL', refundAmount: 300 })] });
    process.env.REFUND_DUAL_APPROVAL_ABOVE = '1000';
    try { await service.approve(dev1, TKT); } finally { delete process.env.REFUND_DUAL_APPROVAL_ABOVE; }
    expect(paymentRefund.request.mock.calls[0][1].amount).toBeUndefined();
  });
  it('idempotência: aprovar duas vezes não estorna duas vezes', async () => {
    const { service, paymentRefund } = makeEnv({ tickets: [refundTicket()] });
    await service.approve(dev1, TKT);
    const again = await service.approve(dev1, TKT);
    const other = await service.approve(ceo2, TKT);
    expect(again.idempotent).toBe(true);
    expect(other.idempotent).toBe(true);
    expect(paymentRefund.request).toHaveBeenCalledTimes(1);
  });
  it('aprovações concorrentes disparam um único estorno', async () => {
    const { service, paymentRefund } = makeEnv({ tickets: [refundTicket()] });
    await Promise.all([service.approve(dev1, TKT), service.approve(ceo2, TKT)]);
    expect(paymentRefund.request).toHaveBeenCalledTimes(1);
  });
  it('acima do limite exige segunda aprovação de OUTRO usuário (mesmo usuário recebe 409)', async () => {
    const { service, paymentRefund, tickets, events, notifier } = makeEnv({ tickets: [refundTicket({ refundAmount: 800, refundKind: 'PARTIAL' })] });
    const first = await service.approve(dev1, TKT);
    expect(first.refundStatus).toBe('AWAITING_SECOND_APPROVAL');
    expect(paymentRefund.request).not.toHaveBeenCalled();
    expect(notifier.notifyRefundAwaitingSecond).toHaveBeenCalled();
    await expect(service.approve(dev1, TKT)).rejects.toThrow(ConflictException);
    expect(paymentRefund.request).not.toHaveBeenCalled();
    const second = await service.approve(ceo2, TKT);
    expect(second.refundStatus).toBe('PROCESSING');
    expect(paymentRefund.request).toHaveBeenCalledTimes(1);
    expect(tickets.get(TKT)).toMatchObject({ refundDecisionById: 'dev-1', refundSecondApproverId: 'ceo-2' });
    expect(events.map(e => e.eventType)).toEqual(['REFUND_FIRST_APPROVAL', 'REFUND_SECOND_APPROVED', 'REFUND_PROCESSING']);
  });
  it('REFUND_DUAL_APPROVAL_ABOVE configurável pelo ambiente', async () => {
    process.env.REFUND_DUAL_APPROVAL_ABOVE = '50';
    try {
      const { service } = makeEnv({ tickets: [refundTicket({ refundAmount: 100 })] });
      expect((await service.approve(dev1, TKT)).refundStatus).toBe('AWAITING_SECOND_APPROVAL');
    } finally { delete process.env.REFUND_DUAL_APPROVAL_ABOVE; }
  });
  it('recusar grava motivo, evento e notifica; depois disso aprovar dá 409', async () => {
    const { service, paymentRefund, tickets, events, notifier } = makeEnv({ tickets: [refundTicket()] });
    await service.reject(dev1, TKT, 'fora da política');
    expect(tickets.get(TKT)).toMatchObject({ refundStatus: 'REJECTED', refundDecisionReason: 'fora da política' });
    expect(events.map(e => e.eventType)).toEqual(['REFUND_REJECTED']);
    expect(notifier.notifyRefundDecision).toHaveBeenCalledWith(TKT, false, 'fora da política');
    await expect(service.approve(ceo2, TKT)).rejects.toThrow(ConflictException);
    expect(paymentRefund.request).not.toHaveBeenCalled();
  });
  it('erro antes da reserva devolve o pedido ao estado anterior para nova tentativa', async () => {
    const { service, paymentRefund, tickets } = makeEnv({ tickets: [refundTicket()] });
    paymentRefund.request.mockRejectedValueOnce(new BadRequestException('Pagamento sem provedor configurado.'));
    await expect(service.approve(dev1, TKT)).rejects.toThrow(/provedor/);
    expect(tickets.get(TKT).refundStatus).toBe('REQUESTED');
    await service.approve(dev1, TKT);
    expect(tickets.get(TKT).refundStatus).toBe('PROCESSING');
  });
  it('pedido inexistente ou de outro tipo devolve 404', async () => {
    const { service } = makeEnv({ tickets: [refundTicket({ id: '77777777-7777-4777-8777-777777777777', category: 'BUG' })] });
    await expect(service.approve(dev1, TKT)).rejects.toThrow(NotFoundException);
    await expect(service.approve(dev1, '77777777-7777-4777-8777-777777777777')).rejects.toThrow(NotFoundException);
    await expect(service.approve(dev1, 'nao-e-uuid')).rejects.toThrow(NotFoundException);
  });
});

describe('confirmação do estorno (gancho do financeiro)', () => {
  const settled = (status: 'CONFIRMED' | 'FAILED') => ({ id: 'pr-1', invoiceId: INV, requestKey: `${INV}:${TKT}`, status, amount: 100, errorMessage: status === 'FAILED' ? 'recusado' : null });
  it('CONFIRMED atualiza o chamado, gera evento e avisa uma única vez', async () => {
    const { service, tickets, events, notifier } = makeEnv({ tickets: [refundTicket({ refundStatus: 'PROCESSING', paymentRefundId: 'pr-1' })] });
    await service.handleSettled(settled('CONFIRMED'));
    await service.handleSettled(settled('CONFIRMED'));
    expect(tickets.get(TKT).refundStatus).toBe('CONFIRMED');
    expect(events.filter(e => e.eventType === 'REFUND_CONFIRMED')).toHaveLength(1);
    expect(notifier.notifyRefundConfirmed).toHaveBeenCalledTimes(1);
  });
  it('FAILED marca o chamado como FAILED', async () => {
    const { service, tickets, events, notifier } = makeEnv({ tickets: [refundTicket({ refundStatus: 'PROCESSING' })] });
    await service.handleSettled(settled('FAILED'));
    expect(tickets.get(TKT).refundStatus).toBe('FAILED');
    expect(events[0].eventType).toBe('REFUND_FAILED');
    expect(notifier.notifyRefundFailed).toHaveBeenCalledWith(TKT, 'recusado');
  });
  it('chave que não é de chamado é ignorada', async () => {
    const { service, prisma } = makeEnv();
    await service.handleSettled({ ...settled('CONFIRMED'), requestKey: `${INV}:legacy:remaining` });
    expect(prisma.supportTicket.updateMany).not.toHaveBeenCalled();
  });
  it('estorno já confirmado na resposta do financeiro fecha o chamado na aprovação', async () => {
    const { service, paymentRefund, tickets } = makeEnv({ tickets: [refundTicket()] });
    paymentRefund.request.mockResolvedValueOnce({ id: 'pr-1', status: 'CONFIRMED', amount: 100 });
    const res = await service.approve(dev1, TKT);
    expect(res.refundStatus).toBe('CONFIRMED');
    expect(tickets.get(TKT).refundStatus).toBe('CONFIRMED');
  });
});

describe('SupportSatisfactionService', () => {
  const closedTicket = (over: any = {}) => ({ id: TKT, companyId: A, createdByUserId: 'admin-a', status: 'RESOLVED', resolvedAt: new Date(Date.now() - 2 * DAY), closedAt: null, satisfactionScore: null, ...over });
  const make = (ticket: any) => {
    const env = makeEnv({ tickets: ticket ? [ticket] : [] });
    return { ...env, sat: new SupportSatisfactionService(env.prisma, {} as any) };
  };
  it('só quem abriu avalia', async () => {
    const { sat } = make(closedTicket());
    await expect(sat.rate({ ...admin, sub: 'outro' }, TKT, 5)).rejects.toThrow(ForbiddenException);
  });
  it('exige status RESOLVED/CLOSED', async () => {
    const { sat } = make(closedTicket({ status: 'IN_PROGRESS' }));
    await expect(sat.rate(admin, TKT, 5)).rejects.toThrow(/resolvidos ou fechados/);
  });
  it('valida nota de 1 a 5', async () => {
    const { sat } = make(closedTicket());
    for (const score of [0, 6, 2.5, NaN]) await expect(sat.rate(admin, TKT, score)).rejects.toThrow(BadRequestException);
  });
  it('grava a avaliação uma vez e registra evento', async () => {
    const { sat, tickets, events } = make(closedTicket({ status: 'CLOSED' }));
    await sat.rate(admin, TKT, 4, ' ótimo ');
    expect(tickets.get(TKT)).toMatchObject({ satisfactionScore: 4, satisfactionComment: 'ótimo' });
    expect(events[0].eventType).toBe('TICKET_RATED');
    await expect(sat.rate(admin, TKT, 5)).rejects.toThrow(ConflictException);
  });
  it('avaliar chamado de outra empresa devolve 404', async () => {
    const { sat } = make(closedTicket({ companyId: B }));
    await expect(sat.rate(admin, TKT, 5)).rejects.toThrow(NotFoundException);
    await expect(sat.reopen(admin, TKT)).rejects.toThrow(NotFoundException);
  });
  it('reabre em até 7 dias e depois não', async () => {
    const { sat, tickets, events } = make(closedTicket({ resolvedAt: new Date(Date.now() - 6 * DAY) }));
    await sat.reopen(admin, TKT);
    expect(tickets.get(TKT)).toMatchObject({ status: 'REOPENED', resolvedAt: null });
    expect(events[0].eventType).toBe('TICKET_REOPENED');
    const late = make(closedTicket({ resolvedAt: new Date(Date.now() - 8 * DAY) }));
    await expect(late.sat.reopen(admin, TKT)).rejects.toThrow(/7 dias/);
  });
  it('reabrir exige chamado encerrado e ser quem abriu', async () => {
    await expect(make(closedTicket({ status: 'IN_PROGRESS' })).sat.reopen(admin, TKT)).rejects.toThrow(BadRequestException);
    await expect(make(closedTicket()).sat.reopen({ ...admin, sub: 'outro', role: 'RH' }, TKT)).rejects.toThrow(ForbiddenException);
  });
});
