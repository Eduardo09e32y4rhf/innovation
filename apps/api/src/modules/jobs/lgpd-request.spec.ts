import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { RecruitmentPrivacyService } from './recruitment-privacy.service';
import { PublicCandidateController } from './recruitment-privacy.controller';
import { TurnstileGuard } from '../../common/turnstile/turnstile.guard';

const sha = (v: string) => createHash('sha256').update(v).digest('hex');

function build(over: Record<string, any> = {}) {
  const prisma: any = {
    candidate: { findMany: vi.fn(async () => [{ companyId: 'co-1' }, { companyId: 'co-2' }, { companyId: 'co-1' }]) },
    candidateAccount: { findUnique: vi.fn(async () => null) },
    candidateRequestVerification: {
      count: vi.fn(async () => 0),
      create: vi.fn(async ({ data }: any) => ({ id: 'v-1', ...data })),
      findUnique: vi.fn(async () => null),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    candidateRequest: {
      count: vi.fn(async () => 0),
      create: vi.fn(async ({ data }: any) => ({ id: 'r-1', ...data })),
      findFirst: vi.fn(async () => null),
      update: vi.fn(async ({ data }: any) => ({ id: 'r-1', ...data })),
    },
    company: { findUnique: vi.fn(async () => ({ name: 'Acme' })) },
    auditLog: { create: vi.fn(async () => ({})) },
    ...over,
  };
  const mail: any = { send: vi.fn(async () => ({ sent: true })) };
  const svc = new RecruitmentPrivacyService(prisma, mail, { remove: vi.fn() } as any);
  return { svc, prisma, mail };
}

describe('RS-C-01: pedido LGPD com confirmacao do titular', () => {
  it('criar pedido NAO abre CandidateRequest: envia link de confirmacao e guarda so o hash', async () => {
    const { svc, prisma, mail } = build();
    const result = await svc.createRequest({ email: 'Maria@X.com', type: 'DELETION' }, { ip: '1.2.3.4' });
    expect(result).toEqual({ received: true });
    expect(prisma.candidateRequest.create).not.toHaveBeenCalled();
    const stored = prisma.candidateRequestVerification.create.mock.calls[0][0].data;
    const link = JSON.stringify(mail.send.mock.calls[0][1]);
    const token = /confirmar\?token=([a-f0-9]{64})/.exec(link)?.[1] as string;
    expect(token).toBeTruthy();
    expect(stored.tokenHash).toBe(sha(token));
    expect(JSON.stringify(stored)).not.toContain(token);
    expect(mail.send.mock.calls[0][0]).toBe('maria@x.com');
  });

  it('resposta igual e nenhum e-mail quando nao ha candidatura nem conta com o e-mail', async () => {
    const { svc, prisma, mail } = build({ candidate: { findMany: vi.fn(async () => []) } });
    expect(await svc.createRequest({ email: 'ninguem@x.com', type: 'ACCESS' })).toEqual({ received: true });
    expect(mail.send).not.toHaveBeenCalled();
    expect(prisma.candidateRequestVerification.create).not.toHaveBeenCalled();
  });

  it('limita confirmacoes por e-mail (nao vira disparador de e-mails)', async () => {
    const { svc, mail } = build();
    const { prisma } = { prisma: null };
    void prisma;
    const b = build({ candidateRequestVerification: { count: vi.fn(async () => 3), create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() } });
    expect(await b.svc.createRequest({ email: 'maria@x.com', type: 'ACCESS' })).toEqual({ received: true });
    expect(b.mail.send).not.toHaveBeenCalled();
    void svc; void mail;
  });

  it('confirmar com token valido abre um pedido por empresa com prazo de 15 dias', async () => {
    const token = 'a'.repeat(64);
    const { svc, prisma } = build({
      candidateRequestVerification: {
        count: vi.fn(), create: vi.fn(), updateMany: vi.fn(async () => ({ count: 1 })),
        findUnique: vi.fn(async () => ({ id: 'v-1', email: 'maria@x.com', type: 'DELETION', message: 'apagar', expiresAt: new Date(Date.now() + 60_000), usedAt: null })),
      },
    });
    const result = await svc.confirmRequest(token);
    expect(prisma.candidateRequestVerification.findUnique.mock.calls[0][0].where.tokenHash).toBe(sha(token));
    expect(prisma.candidateRequest.create).toHaveBeenCalledTimes(2);
    const data = prisma.candidateRequest.create.mock.calls[0][0].data;
    expect(data.confirmedAt).toBeInstanceOf(Date);
    expect(Math.round((data.dueAt.getTime() - data.confirmedAt.getTime()) / 86_400_000)).toBe(15);
    expect(result).toMatchObject({ confirmed: true, deadlineDays: 15 });
  });

  it('token expirado, usado ou inexistente e recusado', async () => {
    const expired = build({ candidateRequestVerification: { count: vi.fn(), create: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn(async () => ({ id: 'v', email: 'a@x.com', type: 'ACCESS', expiresAt: new Date(Date.now() - 1000), usedAt: null })) } });
    await expect(expired.svc.confirmRequest('b'.repeat(64))).rejects.toBeInstanceOf(BadRequestException);
    const used = build({ candidateRequestVerification: { count: vi.fn(), create: vi.fn(), updateMany: vi.fn(async () => ({ count: 0 })), findUnique: vi.fn(async () => ({ id: 'v', email: 'a@x.com', type: 'ACCESS', expiresAt: new Date(Date.now() + 9999), usedAt: new Date() })) } });
    await expect(used.svc.confirmRequest('c'.repeat(64))).rejects.toBeInstanceOf(BadRequestException);
    await expect(build().svc.confirmRequest('curto')).rejects.toBeInstanceOf(BadRequestException);
    await expect(build().svc.confirmRequest('d'.repeat(64))).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('RS-C-01: exclusao so com decisao explicita do RH', () => {
  const open = { id: 'r-1', companyId: 'co-1', email: 'maria@x.com', type: 'DELETION', status: 'OPEN' };
  const withRequest = () => build({
    candidateRequest: { count: vi.fn(), create: vi.fn(), findFirst: vi.fn(async () => open), update: vi.fn(async ({ data }: any) => ({ ...open, ...data })) },
    candidate: { findMany: vi.fn(async () => []) },
  });

  it('sem perform explicito a exclusao e recusada e nada e apagado', async () => {
    const { svc, prisma } = withRequest();
    const spy = vi.spyOn(svc, 'anonymizeByEmail');
    await expect(svc.answerRequest('co-1', 'r-1', 'u-1', { response: 'ok ok' })).rejects.toBeInstanceOf(BadRequestException);
    expect(spy).not.toHaveBeenCalled();
    expect(prisma.candidateRequest.update).not.toHaveBeenCalled();
  });

  it('perform=true executa, registra decisao e auditoria', async () => {
    const { svc, prisma } = withRequest();
    const spy = vi.spyOn(svc, 'anonymizeByEmail').mockResolvedValue(1);
    await svc.answerRequest('co-1', 'r-1', 'u-1', { response: 'Excluido.', perform: true });
    expect(spy).toHaveBeenCalledWith('co-1', 'maria@x.com');
    expect(prisma.candidateRequest.update.mock.calls[0][0].data.decision).toBe('EXECUTED');
    expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: 'LGPD_DELETION_EXECUTED', userId: 'u-1', companyId: 'co-1' });
  });

  it('perform=false nega sem apagar, com auditoria', async () => {
    const { svc, prisma } = withRequest();
    const spy = vi.spyOn(svc, 'anonymizeByEmail');
    await svc.answerRequest('co-1', 'r-1', 'u-1', { response: 'Retencao legal.', perform: false });
    expect(spy).not.toHaveBeenCalled();
    expect(prisma.candidateRequest.update.mock.calls[0][0].data.decision).toBe('DENIED');
    expect(prisma.auditLog.create.mock.calls[0][0].data.action).toBe('LGPD_DELETION_DENIED');
  });
});

describe('RS-C-01: rota publica protegida', () => {
  it('POST /public/candidate-requests usa o TurnstileGuard', () => {
    const guards = Reflect.getMetadata('__guards__', PublicCandidateController.prototype.request) as unknown[];
    expect(guards).toContain(TurnstileGuard);
  });
});
