import { BadRequestException, ForbiddenException, GoneException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { BEHAVIORAL_ITEMS, normalizeTechnicalQuestions, publicBehavioralItems, publicTechnicalQuestions, scoreBehavioral, scoreTechnical } from './assessment-rules';
import { AssessmentsService } from './assessments.service';
import { InterviewFollowupService, averageRating, normalizeSlots } from './interview-followup.service';
import { buildInterviewIcs } from './interview-rules';
import { JobOfferService, canApproveOffer, normalizeOffer, offerApproval } from './job-offer.service';
import { isPublicToken, newPublicToken } from './recruitment-tokens';

const HOUR = 3_600_000;
const token = newPublicToken();
const notifier = () => ({ notify: vi.fn(async () => undefined) });

describe('links publicos', () => {
  it('token de 32 caracteres e recusa qualquer outra coisa', () => {
    expect(isPublicToken(token)).toBe(true);
    for (const bad of ['', 'abc', `${token}x`, '../../etc/passwd', null]) expect(isPublicToken(bad)).toBe(false);
  });
});

describe('convite de agenda (.ics)', () => {
  it('evento com horario em UTC, alarme e cancelamento com o mesmo UID', () => {
    const start = new Date('2026-10-16T17:30:00Z');
    const ics = buildInterviewIcs({ uid: 'i1', start, minutes: 45, title: 'Entrevista: Vendedor, loja; centro', description: 'linha 1\nlinha 2', location: 'Rua A, 10', organizerEmail: 'nao-responda@mail.x.com', attendeeEmail: 'c@x.com' });
    expect(ics).toContain('METHOD:REQUEST');
    expect(ics).toContain('DTSTART:20261016T173000Z');
    expect(ics).toContain('DTEND:20261016T181500Z');
    expect(ics).toContain('SUMMARY:Entrevista: Vendedor\\, loja\; centro');
    expect(ics).toContain('DESCRIPTION:linha 1\\nlinha 2');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics.split('\r\n').every((line) => Buffer.byteLength(line) <= 75)).toBe(true);
    const cancel = buildInterviewIcs({ uid: 'i1', start, minutes: 45, title: 'x', description: 'y', cancel: true });
    expect(cancel).toContain('METHOD:CANCEL');
    expect(cancel).toContain('UID:i1@innovationia.com.br');
    expect(cancel).toContain('STATUS:CANCELLED');
  });
});

describe('testes online', () => {
  const questions = normalizeTechnicalQuestions([
    { text: 'Quanto e 2+2?', options: ['3', '4'], correct: 1, weight: 1 },
    { text: 'Capital do Brasil?', options: ['Rio', 'Brasília', 'SP'], correct: 1, weight: 3 },
  ]);
  it('valida perguntas e corrige com peso', () => {
    expect(() => normalizeTechnicalQuestions([{ text: 'x', options: ['a'], correct: 0 }])).toThrow(BadRequestException);
    expect(() => normalizeTechnicalQuestions([{ text: 'x', options: ['a', 'b'], correct: 5 }])).toThrow(/correta/);
    expect(scoreTechnical(questions, { [questions[0].id]: 1, [questions[1].id]: 1 })).toEqual({ score: 100, correct: 2, total: 2 });
    expect(scoreTechnical(questions, { [questions[0].id]: 1 }).score).toBe(25);
    expect(JSON.stringify(publicTechnicalQuestions(questions))).not.toMatch(/correct|weight/);
  });
  it('comportamental: percentuais somam ~100, exige todas as respostas e nao entrega o perfil pela posicao', () => {
    const allExecutor = Object.fromEntries(BEHAVIORAL_ITEMS.map((item) => [item.id, 0]));
    const result = scoreBehavioral(allExecutor);
    expect(result.dominant).toBe('EXECUTOR');
    expect(result.percent.EXECUTOR).toBe(100);
    expect(() => scoreBehavioral({ b1: 0 })).toThrow(/todas/);
    const items = publicBehavioralItems();
    expect(items).toHaveLength(16);
    expect(new Set(items.slice(0, 4).map((item) => item.options[0].value)).size).toBe(4);
    expect(JSON.stringify(items)).not.toMatch(/EXECUTOR|ANALISTA/);
  });
});

describe('proposta: aprovacao interna', () => {
  it('quem aprova o que', () => {
    expect(offerApproval('ADMIN').auto).toBe(true);
    expect(offerApproval('RH').approvers).toEqual(['ADMIN', 'DEV']);
    expect(offerApproval('RH_RS').approvers).toContain('RH');
    expect(canApproveOffer({ sub: 'u1', role: 'ADMIN' }, { createdById: 'u1' }, 'RH')).toBe(false);
    expect(canApproveOffer({ sub: 'u2', role: 'ADMIN' }, { createdById: 'u1' }, 'RH')).toBe(true);
    expect(canApproveOffer({ sub: 'u2', role: 'RH' }, { createdById: 'u1' }, 'RH')).toBe(false);
    expect(canApproveOffer({ sub: 'u2', role: 'RH' }, { createdById: 'u1' }, 'RH_RS')).toBe(true);
  });
  it('valida os dados', () => {
    expect(normalizeOffer({ contractType: 'clt', salary: 3500.5, startDate: '2026-11-03', benefits: [' VR ', ''] }, 'Vendedor')).toMatchObject({ contractType: 'CLT', positionTitle: 'Vendedor', benefits: ['VR'], validDays: 7 });
    expect(() => normalizeOffer({ contractType: 'X' }, 'V')).toThrow(/contrato/);
    expect(() => normalizeOffer({ contractType: 'PJ', startDate: '03/11/2026' }, 'V')).toThrow(/início/);
  });

  function offerService(offer: Record<string, unknown>) {
    const prisma: any = {
      jobOffer: { findUnique: vi.fn(async () => offer), findFirst: vi.fn(async () => offer), update: vi.fn(async () => ({})), updateMany: vi.fn(async () => ({ count: 1 })) },
      application: { findFirst: vi.fn(async () => ({ id: 'a1', status: 'OFFER', anonymizedAt: null, candidate: { name: 'Maria', email: 'm@x.com' }, job: { id: 'j1', title: 'Vendedor', company: { name: 'ACME' } } })) },
      applicationEvent: { create: vi.fn(async () => ({})) },
      user: { findUnique: vi.fn(async ({ where }: any) => ({ role: where.id === 'creator' ? 'RH' : 'ADMIN', name: 'X' })) },
    };
    const n = notifier();
    return { svc: new JobOfferService(prisma, { send: vi.fn() } as any, {} as any, n as any), prisma, n };
  }

  it('candidato aceita uma vez; segunda resposta e recusada', async () => {
    const { svc, prisma, n } = offerService({ id: 'o1', companyId: 'c1', applicationId: 'a1', status: 'SENT', sentAt: new Date(), expiresAt: new Date(Date.now() + 86_400_000), createdById: 'creator', approvedById: 'adm', positionTitle: 'Vendedor', benefits: [] });
    await svc.respond(token, { accept: true });
    expect(prisma.jobOffer.updateMany).toHaveBeenCalledWith({ where: { id: 'o1', status: 'SENT' }, data: expect.objectContaining({ status: 'ACCEPTED' }) });
    expect(n.notify).toHaveBeenCalledWith(expect.objectContaining({ kind: 'OFFER_ACCEPTED', userIds: ['creator', 'adm'] }));
    prisma.jobOffer.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(svc.respond(token, { accept: false })).rejects.toThrow(GoneException);
  });
  it('proposta vencida nao aceita resposta; quem criou nao aprova', async () => {
    const { svc } = offerService({ id: 'o1', companyId: 'c1', applicationId: 'a1', status: 'SENT', sentAt: new Date(), expiresAt: new Date(Date.now() - 1000), createdById: 'creator', positionTitle: 'V', benefits: [] });
    await expect(svc.respond(token, { accept: true })).rejects.toThrow(/prazo/);
    const pending = offerService({ id: 'o2', companyId: 'c1', applicationId: 'a1', status: 'PENDING_APPROVAL', createdById: 'creator' });
    await expect(pending.svc.approve('c1', { sub: 'creator', role: 'RH' }, 'o2')).rejects.toThrow(ForbiddenException);
    await expect(pending.svc.approve('c1', { sub: 'boss', role: 'ADMIN' }, 'o2')).resolves.toMatchObject({ status: 'APPROVED' });
  });
  it('rascunho nunca aparece para o candidato', async () => {
    const { svc } = offerService({ id: 'o1', companyId: 'c1', applicationId: 'a1', status: 'PENDING_APPROVAL', sentAt: null });
    await expect(svc.publicOffer(token)).rejects.toThrow(/não encontrada/);
  });
});

describe('autoagendamento e confirmacao', () => {
  it('horarios: futuros, sem repeticao, no maximo 8', () => {
    const now = new Date('2026-10-15T12:00:00Z');
    const a = '2026-10-16T13:00:00.000Z';
    expect(normalizeSlots([a, a, '2026-10-16T12:00:00.000Z'], now).map((d) => d.toISOString())).toEqual(['2026-10-16T12:00:00.000Z', a]);
    expect(() => normalizeSlots(['2026-10-15T12:30:00Z'], now)).toThrow(/1 hora/);
    expect(() => normalizeSlots([], now)).toThrow(BadRequestException);
    expect(() => normalizeSlots(Array.from({ length: 9 }, (_, i) => new Date(now.getTime() + (i + 2) * HOUR).toISOString()), now)).toThrow(/8/);
  });
  it('media das notas', () => {
    expect(averageRating([{ score: 4 }, { score: 5 }])).toBe(4.5);
    expect(averageRating([])).toBeNull();
  });

  function followup(interview: Record<string, unknown>) {
    const prisma: any = {
      recruitmentAccessToken: { findUnique: vi.fn(async () => null), create: vi.fn(async () => ({})), update: vi.fn(async () => ({})) },
      applicationInterview: { findUnique: vi.fn(async () => interview), update: vi.fn(async () => ({})), findMany: vi.fn(async () => [interview]), updateMany: vi.fn(async () => ({ count: 1 })) },
      applicationEvent: { create: vi.fn(async () => ({})) },
      managementEvent: { findFirst: vi.fn(async () => ({ title: 'Entrevista: Maria · Vendedor' })), update: vi.fn(async () => ({})) },
      application: { findMany: vi.fn(async () => []) },
    };
    const privacy: any = { sendInterviewEmail: vi.fn(async () => true), afterRejected: vi.fn() };
    const n = notifier();
    return { svc: new InterviewFollowupService(prisma, {} as any, privacy, {} as any, n as any), prisma, privacy, n };
  }
  const base = () => ({ id: 'i1', applicationId: 'a1', scheduledAt: new Date(Date.now() + 20 * HOUR), mode: 'ONLINE', agendaEventId: 'ev1', createdById: 'u1', candidateResponse: null, application: { id: 'a1', companyId: 'c1', jobId: 'j1', status: 'INTERVIEW', anonymizedAt: null, candidate: { name: 'Maria Souza' }, job: { title: 'Vendedor', company: { name: 'ACME', logoUrl: null } } } });

  it('candidato avisa que nao pode: grava motivo, marca na agenda e avisa o RH', async () => {
    const { svc, prisma, n } = followup(base());
    const page: any = await svc.respond(token, { response: 'DECLINED', reason: 'Consulta médica' });
    expect(prisma.applicationInterview.update).toHaveBeenCalledWith({ where: { id: 'i1' }, data: expect.objectContaining({ candidateResponse: 'DECLINED', declineReason: 'Consulta médica' }) });
    expect(prisma.managementEvent.update.mock.calls[0][0].data.title).toBe('Candidato não pode: Entrevista: Maria · Vendedor');
    expect(n.notify).toHaveBeenCalledWith(expect.objectContaining({ kind: 'INTERVIEW_DECLINED', priority: 'HIGH', userIds: ['u1'] }));
    expect(page.candidate).toBe('Maria');
  });
  it('RS-C-04: candidato pede outro horario: grava como nao-pode, registra o pedido e avisa o RH com prioridade alta', async () => {
    const { svc, prisma, n } = followup(base());
    await svc.respond(token, { response: 'RESCHEDULE', reason: 'Prefiro terça ou quarta à tarde' });
    expect(prisma.applicationInterview.update).toHaveBeenCalledWith({ where: { id: 'i1' }, data: expect.objectContaining({ candidateResponse: 'DECLINED', declineReason: 'Prefiro terça ou quarta à tarde' }) });
    expect(prisma.applicationEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'INTERVIEW_RESCHEDULE_REQUESTED' }) });
    expect(n.notify).toHaveBeenCalledWith(expect.objectContaining({ kind: 'INTERVIEW_RESCHEDULE_REQUESTED', priority: 'HIGH', userIds: ['u1'] }));
  });
  it('nao responde entrevista que ja passou', async () => {
    const { svc } = followup({ ...base(), scheduledAt: new Date(Date.now() - HOUR) });
    await expect(svc.respond(token, { response: 'CONFIRMED' })).rejects.toThrow(GoneException);
  });
  it('lembrete: reserva antes de enviar e nao manda duas vezes', async () => {
    const { svc, prisma, privacy } = followup(base());
    expect(await svc.sendReminders()).toBe(1);
    expect(privacy.sendInterviewEmail).toHaveBeenCalledWith('a1', expect.anything(), 'REMINDER');
    const where = prisma.applicationInterview.findMany.mock.calls[0][0].where;
    expect(where.reminderSentAt).toBeNull();
    expect(where.OR).toEqual([{ candidateResponse: null }, { candidateResponse: 'CONFIRMED' }]);
    prisma.applicationInterview.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await svc.sendReminders()).toBe(0);
  });
});

describe('teste: envio e resposta', () => {
  it('teste tecnico abaixo da nota com reprovacao automatica move para reprovado', async () => {
    const questions = normalizeTechnicalQuestions([{ text: 'a?', options: ['x', 'y'], correct: 1 }]);
    const invite = { id: 'v1', companyId: 'c1', applicationId: 'a1', kind: 'TECHNICAL', assessmentId: 's1', status: 'STARTED', expiresAt: new Date(Date.now() + 86_400_000), startedAt: new Date(), createdById: 'u1' };
    const prisma: any = {
      assessmentInvite: { findUnique: vi.fn(async () => invite), updateMany: vi.fn(async () => ({ count: 1 })) },
      application: { findFirst: vi.fn(async ({ select }: any) => (select?.stage ? { status: 'SCREENING', stage: { pipelineId: 'p1' }, job: { pipelineId: null } } : { id: 'a1', status: 'SCREENING', anonymizedAt: null, jobId: 'j1', candidate: { name: 'Ana' }, job: { title: 'V', company: { name: 'ACME' } } })) },
      jobAssessment: { findUnique: vi.fn(async () => ({ id: 's1', title: 'T', timeLimitMinutes: null, passingScore: 70, autoReject: true, questions })) },
      applicationEvent: { create: vi.fn(async () => ({})) },
      pipelineStage: { findFirst: vi.fn(async () => ({ id: 'rej' })) },
    };
    const recruitment: any = { moveApplication: vi.fn(async () => ({})) };
    const svc = new AssessmentsService(prisma, {} as any, recruitment, notifier() as any);
    await svc.submit(token, { [questions[0].id]: 0 });
    expect(prisma.assessmentInvite.updateMany.mock.calls[0][0].data).toMatchObject({ status: 'COMPLETED', score: 0, passed: false });
    expect(recruitment.moveApplication).toHaveBeenCalledWith('c1', null, 'a1', expect.objectContaining({ stageId: 'rej' }));
  });
});
