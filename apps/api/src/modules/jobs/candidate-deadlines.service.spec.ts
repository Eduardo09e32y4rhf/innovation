import { describe, expect, it, vi } from 'vitest';
import { CandidateDeadlinesService } from './candidate-deadlines.service';

const NOW = new Date('2026-11-02T12:00:00Z');
const HOUR = 3_600_000;

function setup() {
  const prisma: any = {
    jobOffer: { updateMany: vi.fn().mockResolvedValue({ count: 2 }), findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
    assessmentInvite: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
    interviewSlotOffer: { updateMany: vi.fn().mockResolvedValue({ count: 3 }), findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
    application: { findMany: vi.fn().mockResolvedValue([{ id: 'a1', anonymizedAt: null, status: 'INTERVIEW', candidate: { name: 'Ana', email: 'ana@x.com' }, job: { title: 'Dev', company: { name: 'Acme' } } }]) },
  };
  const mail = { send: vi.fn().mockResolvedValue({ sent: true }) };
  return { svc: new CandidateDeadlinesService(prisma, mail as any), prisma, mail };
}

describe('RS-C-08: prazos do candidato', () => {
  it('grava EXPIRED só no que estava aberto e vencido', async () => {
    const { svc, prisma } = setup();
    expect(await svc.expireOverdue(NOW)).toEqual({ offers: 2, assessments: 1, slots: 3 });
    expect(prisma.jobOffer.updateMany).toHaveBeenCalledWith({ where: { status: 'SENT', expiresAt: { lt: NOW } }, data: { status: 'EXPIRED' } });
    expect(prisma.assessmentInvite.updateMany).toHaveBeenCalledWith({ where: { status: { in: ['SENT', 'STARTED'] }, expiresAt: { lt: NOW } }, data: { status: 'EXPIRED' } });
    expect(prisma.interviewSlotOffer.updateMany).toHaveBeenCalledWith({ where: { status: 'PENDING', expiresAt: { lt: NOW } }, data: { status: 'EXPIRED' } });
  });

  it('lembra uma única vez, nas últimas 48 h, com o link certo', async () => {
    const { svc, prisma, mail } = setup();
    process.env.APP_URL = 'https://app.exemplo.com';
    prisma.jobOffer.findMany.mockResolvedValue([{ id: 'o1', token: 'tok-o', expiresAt: new Date(NOW.getTime() + 30 * HOUR), applicationId: 'a1' }]);
    const result = await svc.remindExpiring(NOW);
    expect(prisma.jobOffer.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'SENT', reminderSentAt: null, expiresAt: { gt: NOW, lte: new Date(NOW.getTime() + 48 * HOUR) } }) }));
    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(mail.send.mock.calls[0][0]).toBe('ana@x.com');
    expect(JSON.stringify(mail.send.mock.calls[0][1])).toContain('https://app.exemplo.com/carreiras/proposta/tok-o');
    expect(prisma.jobOffer.update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { reminderSentAt: NOW } });
    expect(result.reminded).toBe(1);
  });

  it('não marca como lembrado quando o e-mail não saiu (tenta no próximo ciclo)', async () => {
    const { svc, prisma, mail } = setup();
    mail.send.mockResolvedValue({ sent: false });
    prisma.assessmentInvite.findMany.mockResolvedValue([{ id: 't1', token: 'tok-t', expiresAt: new Date(NOW.getTime() + 10 * HOUR), applicationId: 'a1' }]);
    expect((await svc.remindExpiring(NOW)).reminded).toBe(0);
    expect(prisma.assessmentInvite.update).not.toHaveBeenCalled();
  });
});
