import { GoneException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { clampTrackingDays, INTERVIEW_TOKEN_GRACE_MS, issueInterviewToken, issueTrackingToken, resolveInterviewToken, resolveTrackingToken, sha256 } from './recruitment-access-tokens';

function db(over: Record<string, any> = {}) {
  return {
    recruitmentSetting: { findUnique: vi.fn(async () => null) },
    recruitmentAccessToken: { create: vi.fn(async () => ({})), findUnique: vi.fn(async () => null), update: vi.fn(async () => ({})) },
    application: { findUnique: vi.fn(async () => null), update: vi.fn(async () => ({})) },
    applicationInterview: { findUnique: vi.fn(async () => null), update: vi.fn(async () => ({})) },
    ...over,
  } as any;
}
const day = 86_400_000;

describe('RS-C-16: token de acompanhamento', () => {
  it('emite token novo, grava so o hash e expira em 90 dias por padrao', async () => {
    const prisma = db();
    const issued = await issueTrackingToken(prisma, 'app-1', 'co-1');
    const data = prisma.recruitmentAccessToken.create.mock.calls[0][0].data;
    expect(issued.raw).toMatch(/^[a-f0-9]{48}$/);
    expect(data.tokenHash).toBe(sha256(issued.raw));
    expect(JSON.stringify(data)).not.toContain(issued.raw);
    expect(Math.round((data.expiresAt.getTime() - Date.now()) / day)).toBe(90);
  });

  it('o prazo e configuravel por empresa e limitado (7 a 365 dias)', async () => {
    const prisma = db({ recruitmentSetting: { findUnique: vi.fn(async () => ({ trackingTokenDays: 30 })) } });
    await issueTrackingToken(prisma, 'app-1', 'co-1');
    expect(Math.round((prisma.recruitmentAccessToken.create.mock.calls[0][0].data.expiresAt.getTime() - Date.now()) / day)).toBe(30);
    expect(clampTrackingDays(1)).toBe(7);
    expect(clampTrackingDays(9999)).toBe(365);
    expect(clampTrackingDays('x')).toBe(90);
  });

  it('cada e-mail rotaciona: tokens diferentes, todos validos ate expirar', async () => {
    const prisma = db();
    const a = await issueTrackingToken(prisma, 'app-1', 'co-1');
    const b = await issueTrackingToken(prisma, 'app-1', 'co-1');
    expect(a.raw).not.toBe(b.raw);
  });

  it('resolve pelo hash; expirado da 410; desconhecido da 404', async () => {
    const raw = 'a'.repeat(48);
    const ok = db({ recruitmentAccessToken: { findUnique: vi.fn(async () => ({ id: 't1', kind: 'TRACKING', applicationId: 'app-1', expiresAt: new Date(Date.now() + day) })), update: vi.fn(async () => ({})), create: vi.fn() } });
    await expect(resolveTrackingToken(ok, raw)).resolves.toBe('app-1');
    expect(ok.recruitmentAccessToken.findUnique.mock.calls[0][0].where.tokenHash).toBe(sha256(raw));
    const old = db({ recruitmentAccessToken: { findUnique: vi.fn(async () => ({ id: 't1', kind: 'TRACKING', applicationId: 'app-1', expiresAt: new Date(Date.now() - 1000) })), update: vi.fn(), create: vi.fn() } });
    await expect(resolveTrackingToken(old, raw)).rejects.toBeInstanceOf(GoneException);
    await expect(resolveTrackingToken(db(), raw)).rejects.toBeInstanceOf(NotFoundException);
    await expect(resolveTrackingToken(db(), 'lixo!')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('valor bruto antigo (40 hex) e aceito na transicao, vira hash e o bruto e apagado', async () => {
    const raw = 'b'.repeat(40);
    const prisma = db({ application: { findUnique: vi.fn(async () => ({ id: 'app-9', companyId: 'co-1' })), update: vi.fn(async () => ({})) } });
    await expect(resolveTrackingToken(prisma, raw)).resolves.toBe('app-9');
    expect(prisma.recruitmentAccessToken.create.mock.calls[0][0].data).toMatchObject({ applicationId: 'app-9', kind: 'TRACKING', tokenHash: sha256(raw) });
    expect(prisma.application.update.mock.calls[0][0]).toEqual({ where: { id: 'app-9' }, data: { trackingToken: null } });
  });

  it('um token de entrevista nao serve como acompanhamento', async () => {
    const prisma = db({ recruitmentAccessToken: { findUnique: vi.fn(async () => ({ id: 't', kind: 'INTERVIEW', interviewId: 'i', applicationId: 'a', expiresAt: new Date(Date.now() + day) })), update: vi.fn(), create: vi.fn() } });
    await expect(resolveTrackingToken(prisma, 'c'.repeat(48))).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('RS-C-16: token de entrevista', () => {
  const when = new Date(Date.now() + 3 * day);

  it('vale ate 24 h depois do horario marcado e grava so o hash', async () => {
    const prisma = db();
    const issued = await issueInterviewToken(prisma, { id: 'i-1', applicationId: 'app-1', scheduledAt: when });
    const data = prisma.recruitmentAccessToken.create.mock.calls[0][0].data;
    expect(data.expiresAt.getTime()).toBe(when.getTime() + INTERVIEW_TOKEN_GRACE_MS);
    expect(data).toMatchObject({ kind: 'INTERVIEW', interviewId: 'i-1', tokenHash: sha256(issued.raw) });
  });

  it('resolve pelo hash; expirado da 410', async () => {
    const raw = 'd'.repeat(48);
    const ok = db({ recruitmentAccessToken: { findUnique: vi.fn(async () => ({ kind: 'INTERVIEW', interviewId: 'i-1', expiresAt: new Date(Date.now() + day) })), create: vi.fn(), update: vi.fn() } });
    await expect(resolveInterviewToken(ok, raw)).resolves.toBe('i-1');
    const old = db({ recruitmentAccessToken: { findUnique: vi.fn(async () => ({ kind: 'INTERVIEW', interviewId: 'i-1', expiresAt: new Date(Date.now() - 1) })), create: vi.fn(), update: vi.fn() } });
    await expect(resolveInterviewToken(old, raw)).rejects.toBeInstanceOf(GoneException);
  });

  it('valor bruto antigo (32 base64url) e aceito, migra para hash e o bruto e apagado', async () => {
    const raw = 'A'.repeat(32);
    const prisma = db({ applicationInterview: { findUnique: vi.fn(async () => ({ id: 'i-7', applicationId: 'app-7', scheduledAt: when })), update: vi.fn(async () => ({})) } });
    await expect(resolveInterviewToken(prisma, raw)).resolves.toBe('i-7');
    expect(prisma.recruitmentAccessToken.create.mock.calls[0][0].data.tokenHash).toBe(sha256(raw));
    expect(prisma.applicationInterview.update.mock.calls[0][0].data).toEqual({ responseToken: null });
  });

  it('valor bruto antigo de entrevista ja vencida da 410', async () => {
    const prisma = db({ applicationInterview: { findUnique: vi.fn(async () => ({ id: 'i-7', applicationId: 'app-7', scheduledAt: new Date(Date.now() - 3 * day) })), update: vi.fn() } });
    await expect(resolveInterviewToken(prisma, 'A'.repeat(32))).rejects.toBeInstanceOf(GoneException);
  });
});
