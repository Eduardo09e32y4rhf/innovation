import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { CandidateConsentService } from './candidate-consent.service';
import { consentTextHash, CONSENT_TEXTS } from './recruitment-consent';
import { PRIVACY_VERSION } from './recruitment-privacy';

const sha = (v: string) => createHash('sha256').update(v).digest('hex');

function build(over: Record<string, any> = {}) {
  const prisma: any = {
    candidateConsent: {
      create: vi.fn(async ({ data }: any) => ({ id: `c-${Math.random()}`, ...data })),
      findUnique: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
      updateMany: vi.fn(async () => ({ count: 1 })),
      update: vi.fn(async () => ({})),
    },
    application: { findUnique: vi.fn(async () => ({ id: 'app-1', candidate: { name: 'Ana Lima', phone: '11999999999' } })), update: vi.fn(async () => ({})) },
    applicationEvent: { create: vi.fn(async () => ({})) },
    candidateDiversity: { deleteMany: vi.fn(async () => ({ count: 1 })) },
    candidateAccount: { findUnique: vi.fn(async () => null), create: vi.fn(async ({ data }: any) => ({ id: 'acc-new', ...data })), update: vi.fn(async () => ({})), updateMany: vi.fn(async () => ({ count: 1 })) },
    ...over,
  };
  const mail: any = { send: vi.fn(async () => ({ sent: true })) };
  return { svc: new CandidateConsentService(prisma, mail), prisma, mail };
}

const base = { email: 'Ana@X.com', name: 'Ana', applicationId: 'app-1', companyId: 'co-1', jobTitle: 'Dev', company: 'Acme', ip: '9.9.9.9', userAgent: 'UA/1.0' };

describe('RS-D-06: consentimento com prova', () => {
  it('guarda hash do texto, versao, IP e user agent; so o hash do token', async () => {
    const { svc, prisma, mail } = build();
    await svc.recordApplication({ ...base, talentPoolOptIn: false, sensitive: false });
    const rows = prisma.candidateConsent.create.mock.calls.map((c: any) => c[0].data);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ purpose: 'APPLICATION', email: 'ana@x.com', policyVersion: PRIVACY_VERSION, textHash: consentTextHash('APPLICATION'), ip: '9.9.9.9', userAgent: 'UA/1.0', applicationId: 'app-1', companyId: 'co-1' });
    const token = /consentimento\?token=([a-f0-9]{64})/.exec(JSON.stringify(mail.send.mock.calls[0][1]))?.[1] as string;
    expect(rows[0].tokenHash).toBe(sha(token));
    expect(JSON.stringify(rows[0])).not.toContain(token);
  });

  it('o hash e do texto exato mais a versao', () => {
    expect(consentTextHash('TALENT_POOL')).toBe(sha(`${PRIVACY_VERSION}\n${CONSENT_TEXTS.TALENT_POOL}`));
  });

  it('um recibo por e-mail lista todos os consentimentos com link de revogacao', async () => {
    const { svc, prisma, mail } = build();
    await svc.recordApplication({ ...base, talentPoolOptIn: true, sensitive: true });
    expect(prisma.candidateConsent.create).toHaveBeenCalledTimes(3);
    expect(mail.send).toHaveBeenCalledTimes(1);
    const html = JSON.stringify(mail.send.mock.calls[0][1]);
    expect(html).toContain('Banco de talentos');
    expect(html).toContain('acao=revogar');
    expect((html.match(/acao=revogar/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('banco de talentos sem conta exige confirmar pelo e-mail (duplo aceite); os outros valem na hora', async () => {
    const { svc, prisma } = build();
    await svc.recordApplication({ ...base, talentPoolOptIn: true, sensitive: true });
    const byPurpose = Object.fromEntries(prisma.candidateConsent.create.mock.calls.map((c: any) => [c[0].data.purpose, c[0].data]));
    expect(byPurpose.TALENT_POOL.confirmedAt).toBeFalsy();
    expect(byPurpose.APPLICATION.confirmedAt).toBeInstanceOf(Date);
    expect(byPurpose.SENSITIVE_DATA.confirmedAt).toBeInstanceOf(Date);
  });

  it('confirmar o banco de talentos cria conta sem senha so com o consentimento, sem sobrescrever conta existente', async () => {
    const row = { id: 'c-1', purpose: 'TALENT_POOL', email: 'ana@x.com', applicationId: 'app-1', confirmedAt: null, revokedAt: null };
    const created = build({ candidateConsent: { findUnique: vi.fn(async () => row), updateMany: vi.fn(async () => ({ count: 1 })), create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() } });
    await created.svc.confirm('a'.repeat(64));
    expect(created.prisma.candidateAccount.create.mock.calls[0][0].data).toMatchObject({ email: 'ana@x.com', name: 'Ana Lima' });
    expect(created.prisma.candidateAccount.create.mock.calls[0][0].data.talentPoolConsentAt).toBeInstanceOf(Date);
    expect(created.prisma.candidateAccount.create.mock.calls[0][0].data.passwordHash).toBeUndefined();

    const existing = build({
      candidateConsent: { findUnique: vi.fn(async () => row), updateMany: vi.fn(async () => ({ count: 1 })), create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
      candidateAccount: { findUnique: vi.fn(async () => ({ id: 'acc-1', talentPoolConsentAt: null })), create: vi.fn(), update: vi.fn(async () => ({})), updateMany: vi.fn() },
    });
    await existing.svc.confirm('a'.repeat(64));
    expect(existing.prisma.candidateAccount.create).not.toHaveBeenCalled();
    expect(Object.keys(existing.prisma.candidateAccount.update.mock.calls[0][0].data)).toEqual(['talentPoolConsentAt']);
  });

  it('token invalido ou ja confirmado e recusado', async () => {
    await expect(build().svc.confirm('curto')).rejects.toBeInstanceOf(BadRequestException);
    await expect(build().svc.confirm('b'.repeat(64))).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('RS-D-06: revogacao pelo candidato', () => {
  const rowOf = (purpose: string, extra: any = {}) => ({ id: 'c-1', purpose, email: 'ana@x.com', applicationId: 'app-1', companyId: 'co-1', accountId: null, revokedAt: null, ...extra });
  const withRow = (row: any, extra: any = {}) => build({ candidateConsent: { findUnique: vi.fn(async () => row), updateMany: vi.fn(async () => ({ count: 1 })), create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() }, ...extra });

  it('revogar banco de talentos tira a conta do banco', async () => {
    const { svc, prisma } = withRow(rowOf('TALENT_POOL'));
    await svc.revoke('a'.repeat(64));
    expect(prisma.candidateAccount.updateMany.mock.calls[0][0]).toMatchObject({ where: { email: 'ana@x.com' }, data: { talentPoolConsentAt: null } });
    expect(prisma.candidateConsent.updateMany.mock.calls[0][0].data.revokedAt).toBeInstanceOf(Date);
  });

  it('revogar dados sensiveis apaga a diversidade da candidatura', async () => {
    const { svc, prisma } = withRow(rowOf('SENSITIVE_DATA'));
    await svc.revoke('a'.repeat(64));
    expect(prisma.candidateDiversity.deleteMany).toHaveBeenCalledWith({ where: { applicationId: 'app-1' } });
  });

  it('revogar o consentimento da candidatura marca para eliminacao e avisa o RH na linha do tempo', async () => {
    const { svc, prisma } = withRow(rowOf('APPLICATION'));
    await svc.revoke('a'.repeat(64));
    expect(prisma.application.update.mock.calls[0][0].data.retentionUntil).toBeInstanceOf(Date);
    expect(prisma.applicationEvent.create.mock.calls[0][0].data.type).toBe('CONSENT_REVOKED');
  });

  it('revogar duas vezes e inofensivo (idempotente)', async () => {
    const { svc, prisma } = withRow(rowOf('TALENT_POOL', { revokedAt: new Date() }));
    await expect(svc.revoke('a'.repeat(64))).resolves.toMatchObject({ revoked: true });
    expect(prisma.candidateAccount.updateMany).not.toHaveBeenCalled();
  });

  it('conta logada so revoga o que e dela', async () => {
    const { svc } = build({ candidateConsent: { findFirst: vi.fn(async () => null), findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn(), findMany: vi.fn(), update: vi.fn() } });
    await expect(svc.revokeForAccount({ id: 'acc-1', email: 'ana@x.com' } as any, 'c-9')).rejects.toThrow();
  });
});
