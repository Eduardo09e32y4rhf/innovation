import { BadRequestException, HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./jobs.service', () => ({ JobsService: class {} }));
vi.mock('../../database/prisma.service', () => ({ PrismaService: class {} }));
vi.mock('../mail/mail.service', () => ({ MailService: class {} }));
vi.mock('./jobs-storage.service', () => ({ JobsStorageService: class {} }));
import { CandidateAccountService } from './candidate-account.service';
import { hashSecret } from './candidate-account.rules';

function build(over: Record<string, any> = {}) {
  const prisma: any = {
    candidateLoginCode: {
      count: vi.fn(async () => 0), create: vi.fn(async () => ({})), findFirst: vi.fn(async () => null), update: vi.fn(async () => ({})), deleteMany: vi.fn(async () => ({})), updateMany: vi.fn(async () => ({ count: 1 })),
    },
    candidateAccount: {
      findUnique: vi.fn(async () => null), create: vi.fn(async ({ data }: any) => ({ id: 'acc-1', ...data })), update: vi.fn(async ({ data }: any) => ({ id: 'acc-1', email: 'c@x.com', ...data })),
    },
    candidateSession: { create: vi.fn(async () => ({})) },
    ...over,
  };
  const mail: any = { send: vi.fn(async () => ({ sent: true })) };
  const svc = new CandidateAccountService(prisma, mail, {} as any, {} as any);
  return { svc, prisma, mail };
}

describe('RS-C-09: verificacao de e-mail da conta do candidato', () => {
  it('cadastro envia codigo de 6 digitos por e-mail, nasce nao verificado e grava so o hash', async () => {
    const { svc, prisma, mail } = build();
    const result = await svc.register('c@x.com', 'segredo123', 'Camila');
    expect(prisma.candidateAccount.create.mock.calls[0][0].data.verifiedAt).toBeUndefined();
    const code = /(\d{6})/.exec(JSON.stringify(mail.send.mock.calls[0][1]))?.[1] as string;
    expect(code).toBeTruthy();
    const row = prisma.candidateLoginCode.create.mock.calls[0][0].data;
    expect(row).toMatchObject({ purpose: 'VERIFY', email: 'c@x.com' });
    expect(row.codeHash).toBe(hashSecret(`c@x.com:${code}`));
    expect(JSON.stringify(row)).not.toContain(code);
    expect(result.token).toBeTruthy();
  });

  it('codigo certo preenche verifiedAt real', async () => {
    const row = { id: 'l-1', codeHash: hashSecret('c@x.com:123456'), attempts: 0 };
    const { svc, prisma } = build({ candidateLoginCode: { findFirst: vi.fn(async () => row), update: vi.fn(), count: vi.fn(), create: vi.fn(), updateMany: vi.fn(async () => ({ count: 1 })) } });
    const profile = await svc.verifyEmail({ id: 'acc-1', email: 'c@x.com', verifiedAt: null } as any, '123456');
    expect(prisma.candidateAccount.update.mock.calls[0][0].data.verifiedAt).toBeInstanceOf(Date);
    expect(profile.emailVerified).toBe(true);
  });

  it('codigo errado conta tentativa e apos 5 tentativas o codigo morre', async () => {
    const update = vi.fn();
    const { svc } = build({ candidateLoginCode: { findFirst: vi.fn(async () => ({ id: 'l-1', codeHash: hashSecret('c@x.com:123456'), attempts: 0 })), update, count: vi.fn(), create: vi.fn(), updateMany: vi.fn() } });
    await expect(svc.verifyEmail({ id: 'a', email: 'c@x.com', verifiedAt: null } as any, '000000')).rejects.toBeInstanceOf(BadRequestException);
    expect(update.mock.calls[0][0].data).toEqual({ attempts: { increment: 1 } });
    const spent = build({ candidateLoginCode: { findFirst: vi.fn(async () => ({ id: 'l-1', codeHash: hashSecret('c@x.com:123456'), attempts: 5 })), update: vi.fn(), count: vi.fn(), create: vi.fn(), updateMany: vi.fn() } });
    await expect(spent.svc.verifyEmail({ id: 'a', email: 'c@x.com', verifiedAt: null } as any, '123456')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('formato invalido nem consulta o banco', async () => {
    const { svc, prisma } = build();
    await expect(svc.verifyEmail({ id: 'a', email: 'c@x.com' } as any, 'abc')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.candidateLoginCode.findFirst).not.toHaveBeenCalled();
  });

  it('reenvio tem intervalo minimo e limite por janela (429)', async () => {
    const recent = build({ candidateLoginCode: { count: vi.fn(async () => 0), findFirst: vi.fn(async () => ({ createdAt: new Date() })), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() } });
    await expect(recent.svc.resendVerification({ id: 'a', email: 'c@x.com', verifiedAt: null } as any)).rejects.toBeInstanceOf(HttpException);
    const many = build({ candidateLoginCode: { count: vi.fn(async () => 3), findFirst: vi.fn(async () => null), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() } });
    await expect(many.svc.resendVerification({ id: 'a', email: 'c@x.com', verifiedAt: null } as any)).rejects.toMatchObject({ status: 429 });
  });

  it('reenvio valido invalida o codigo anterior e envia outro', async () => {
    const { svc, prisma, mail } = build({ candidateLoginCode: { count: vi.fn(async () => 1), findFirst: vi.fn(async () => null), create: vi.fn(async () => ({})), update: vi.fn(), updateMany: vi.fn(async () => ({ count: 1 })) } });
    await expect(svc.resendVerification({ id: 'a', email: 'c@x.com', verifiedAt: null } as any)).resolves.toEqual({ sent: true });
    expect(prisma.candidateLoginCode.updateMany).toHaveBeenCalled();
    expect(mail.send).toHaveBeenCalledTimes(1);
  });

  it('conta ja verificada nao reenvia', async () => {
    const { svc, mail } = build();
    await expect(svc.resendVerification({ id: 'a', email: 'c@x.com', verifiedAt: new Date() } as any)).resolves.toEqual({ sent: false, alreadyVerified: true });
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('perfil informa emailVerified', () => {
    const { svc } = build();
    expect(svc.profile({ email: 'c@x.com', verifiedAt: new Date() } as any).emailVerified).toBe(true);
    expect(svc.profile({ email: 'c@x.com', verifiedAt: null } as any).emailVerified).toBe(false);
  });
});
