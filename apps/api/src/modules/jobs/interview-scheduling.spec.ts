import { describe, expect, it, vi } from 'vitest';
import { RecruitmentService } from './recruitment.service';

const future = new Date(Date.now() + 2 * 86_400_000).toISOString();

function build(emailed = true) {
  const prisma: any = {
    application: {
      findFirst: vi.fn(async () => ({ id: 'a1', jobId: 'j1' })),
      findUnique: vi.fn(async () => ({ candidate: { name: 'Maria' }, job: { title: 'Atendente' } })),
    },
    managementEvent: { create: vi.fn(async () => ({ id: 'ev1' })), deleteMany: vi.fn(async () => ({ count: 1 })) },
    applicationInterview: {
      create: vi.fn(async ({ data }: any) => ({ id: 'i1', ...data })),
      update: vi.fn(async () => ({})),
      findFirst: vi.fn(),
      delete: vi.fn(async () => ({})),
    },
    applicationEvent: { create: vi.fn(async () => ({})) },
  };
  const privacy: any = { sendInterviewEmail: vi.fn(async () => emailed) };
  return { svc: new RecruitmentService(prisma, privacy), prisma, privacy };
}

describe('agendar entrevista', () => {
  it('online: cria na Agenda de quem agendou, envia o convite e marca como avisado', async () => {
    const { svc, prisma, privacy } = build();
    const result: any = await svc.addInterview('c1', 'u1', 'a1', { scheduledAt: future, mode: 'ONLINE', meetingUrl: 'https://meet.google.com/abc', durationMinutes: 45, interviewerRole: 'GESTOR', interviewer: 'Ana' } as any);
    const agenda = prisma.managementEvent.create.mock.calls[0][0].data;
    expect(agenda).toMatchObject({ companyId: 'c1', eventType: 'ENTREVISTA', responsibleUserId: 'u1', createdBy: 'u1', meetingUrl: 'https://meet.google.com/abc', location: null });
    expect(agenda.title).toBe('Entrevista: Maria · Atendente');
    expect(agenda.endDateTime.getTime() - agenda.startDateTime.getTime()).toBe(45 * 60_000);
    expect(prisma.applicationInterview.create.mock.calls[0][0].data).toMatchObject({ mode: 'ONLINE', agendaEventId: 'ev1', interviewerRole: 'GESTOR', createdById: 'u1' });
    expect(privacy.sendInterviewEmail).toHaveBeenCalledWith('a1', expect.objectContaining({ mode: 'ONLINE' }), 'SCHEDULED');
    expect(prisma.applicationInterview.update).toHaveBeenCalledWith({ where: { id: 'i1' }, data: { notifiedAt: expect.any(Date) } });
    expect(result).toMatchObject({ emailed: true, emailRequested: true });
  });

  it('sem enviar convite: agenda, mas nao manda e-mail', async () => {
    const { svc, privacy, prisma } = build();
    const result: any = await svc.addInterview('c1', 'u1', 'a1', { scheduledAt: future, mode: 'PRESENCIAL', location: 'Rua A, 10', notifyCandidate: false } as any);
    expect(privacy.sendInterviewEmail).not.toHaveBeenCalled();
    expect(prisma.applicationInterview.update).not.toHaveBeenCalled();
    expect(result).toMatchObject({ emailed: false, emailRequested: false });
  });

  it('e-mail falhou: a entrevista continua agendada e o retorno avisa', async () => {
    const { svc, prisma } = build(false);
    const result: any = await svc.addInterview('c1', 'u1', 'a1', { scheduledAt: future, mode: 'PRESENCIAL', location: 'Rua A, 10' } as any);
    expect(prisma.applicationInterview.create).toHaveBeenCalled();
    expect(prisma.applicationInterview.update).not.toHaveBeenCalled();
    expect(result).toMatchObject({ emailed: false, emailRequested: true });
  });

  it('presencial sem endereco e recusada antes de gravar', async () => {
    const { svc, prisma } = build();
    await expect(svc.addInterview('c1', 'u1', 'a1', { scheduledAt: future, mode: 'PRESENCIAL' } as any)).rejects.toThrow(/endereço/);
    expect(prisma.managementEvent.create).not.toHaveBeenCalled();
  });
});

describe('cancelar entrevista', () => {
  it('avisa o candidato que ja tinha sido convidado e tira da Agenda', async () => {
    const { svc, prisma, privacy } = build();
    prisma.applicationInterview.findFirst.mockResolvedValue({ id: 'i1', applicationId: 'a1', scheduledAt: new Date(future), mode: 'ONLINE', notifiedAt: new Date(), agendaEventId: 'ev1' });
    const result = await svc.deleteInterview('c1', 'a1', 'i1');
    expect(prisma.managementEvent.deleteMany).toHaveBeenCalledWith({ where: { id: 'ev1', companyId: 'c1' } });
    expect(privacy.sendInterviewEmail).toHaveBeenCalledWith('a1', expect.anything(), 'CANCELED');
    expect(result).toEqual({ deleted: true, emailed: true });
  });

  it('nao avisa quem nunca foi convidado', async () => {
    const { svc, prisma, privacy } = build();
    prisma.applicationInterview.findFirst.mockResolvedValue({ id: 'i1', applicationId: 'a1', scheduledAt: new Date(future), mode: 'ONLINE', notifiedAt: null, agendaEventId: null });
    await svc.deleteInterview('c1', 'a1', 'i1');
    expect(privacy.sendInterviewEmail).not.toHaveBeenCalled();
    expect(prisma.managementEvent.deleteMany).not.toHaveBeenCalled();
  });
});
