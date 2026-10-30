import { GoneException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RecruitmentPrivacyService } from './recruitment-privacy.service';
import { sha256 } from './recruitment-access-tokens';

function build(over: Record<string, any> = {}) {
  const app = { id: 'app-1', companyId: 'co-1', consentGiven: true, candidate: { id: 'c-1', name: 'Ana', email: 'ana@x.com', phone: null }, job: { title: 'Dev', company: { name: 'Acme' } }, trackingToken: null, anonymizedAt: null };
  const prisma: any = {
    application: { findUnique: vi.fn(async () => app), update: vi.fn(async () => ({})) },
    recruitmentSetting: { findUnique: vi.fn(async () => null) },
    recruitmentAccessToken: { create: vi.fn(async () => ({})), findUnique: vi.fn(async () => null), update: vi.fn(async () => ({})) },
    candidateDiversity: { upsert: vi.fn() },
    ...over,
  };
  const mail: any = { send: vi.fn(async () => ({ sent: true })) };
  return { svc: new RecruitmentPrivacyService(prisma, mail, {} as any), prisma, mail };
}

describe('RS-C-16: fluxo do token de acompanhamento', () => {
  it('apos candidatar: o banco guarda so o hash e o e-mail leva o link bruto', async () => {
    process.env.APP_URL = 'https://app.exemplo.com';
    const { svc, prisma, mail } = build();
    await svc.afterApply('app-1');
    const stored = prisma.recruitmentAccessToken.create.mock.calls[0][0].data;
    const link = /acompanhar\/([a-f0-9]{48})/.exec(JSON.stringify(mail.send.mock.calls[0][1]))?.[1] as string;
    expect(link).toBeTruthy();
    expect(stored.tokenHash).toBe(sha256(link));
    expect(prisma.application.update.mock.calls[0][0].data).not.toHaveProperty('trackingToken');
    expect(JSON.stringify(prisma.application.update.mock.calls[0][0])).not.toContain(link);
  });

  it('pagina publica: link expirado responde 410 e nao revela dados', async () => {
    const { svc } = build({ recruitmentAccessToken: { findUnique: vi.fn(async () => ({ id: 't', kind: 'TRACKING', applicationId: 'app-1', expiresAt: new Date(Date.now() - 1000) })), update: vi.fn(), create: vi.fn() } });
    await expect(svc.publicStatus('e'.repeat(48))).rejects.toBeInstanceOf(GoneException);
  });

  it('pagina publica: token valido devolve a candidatura', async () => {
    const full = { id: 'app-1', job: { title: 'Dev', company: { name: 'Acme' } }, createdAt: new Date(), status: 'APPLIED', stage: null, events: [], retentionUntil: null, anonymizedAt: null };
    const { svc } = build({
      application: { findUnique: vi.fn(async () => full), update: vi.fn() },
      recruitmentAccessToken: { findUnique: vi.fn(async () => ({ id: 't', kind: 'TRACKING', applicationId: 'app-1', expiresAt: new Date(Date.now() + 1e9) })), update: vi.fn(async () => ({})), create: vi.fn() },
    });
    await expect(svc.publicStatus('f'.repeat(48))).resolves.toMatchObject({ job: 'Dev', company: 'Acme' });
  });

  it('anonimizar o candidato apaga os tokens', async () => {
    const tx = vi.fn(async () => []);
    const { svc, prisma } = build({
      application: { updateMany: vi.fn() },
      candidate: { findUnique: vi.fn(async () => ({ id: 'c-1', status: 'NEW', applications: [{ id: 'app-1', resumeUrl: null, status: 'APPLIED' }] })), update: vi.fn() },
      recruitmentDocument: { findMany: vi.fn(async () => []), deleteMany: vi.fn() },
      applicationAnswer: { deleteMany: vi.fn() }, applicationNote: { deleteMany: vi.fn() },
      recruitmentAccessToken: { deleteMany: vi.fn() },
      $transaction: tx,
    });
    await svc.anonymizeCandidate('c-1');
    expect(prisma.recruitmentAccessToken.deleteMany).toHaveBeenCalledWith({ where: { applicationId: { in: ['app-1'] } } });
  });
});
