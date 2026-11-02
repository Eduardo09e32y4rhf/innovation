import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException, HttpException, ServiceUnavailableException } from '@nestjs/common';
import { RecruitmentDocumentsService } from './recruitment-documents.service';
import { codeMatches, generateAccessToken, generateVerificationCode, hashVerificationCode, maskEmail } from './recruitment-documents.rules';

const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(32)]);

function build(extra: any = {}, email: string | null = 'ana.silva@exemplo.com') {
  const { token, hash } = generateAccessToken();
  const state: any = { verifiedAt: null, codeHash: null, codeExpiresAt: null, codeAttempts: 0, codeSentAt: null, ...extra };
  const make = () => ({ id: 'req-1', companyId: 'c1', applicationId: 'app-1', items: ['RG ou CNH'], expiresAt: new Date(Date.now() + 1e8), revokedAt: null, ...state, application: { forwardedAt: null, candidate: { name: 'Ana Silva', email }, job: { title: 'Dev', company: { name: 'Acme' } } } });
  const tx: any = { $executeRaw: vi.fn(), recruitmentDocument: { updateMany: vi.fn(), create: vi.fn(async () => ({})) } };
  const sent: any[] = [];
  const prisma: any = {
    recruitmentDocumentRequest: {
      findUnique: vi.fn(async (a: any) => (a.where.tokenHash === hash ? make() : null)),
      update: vi.fn(async (a: any) => { Object.assign(state, a.data); return {}; }),
      updateMany: vi.fn(async (a: any) => {
        const inc = a.data.codeAttempts?.increment;
        if (inc) { if (state.codeAttempts >= (a.where.codeAttempts?.lt ?? 99)) return { count: 0 }; state.codeAttempts += inc; }
        return { count: 1 };
      }),
    },
    recruitmentDocument: { findFirst: vi.fn(async () => null), findMany: vi.fn(async () => []) },
    $transaction: vi.fn(async (fn: any) => fn(tx)),
  };
  const mail: any = { send: vi.fn(async (to: string, c: any) => { sent.push({ to, ...c }); return { sent: true }; }) };
  const storage: any = { save: vi.fn(), remove: vi.fn() };
  const svc = new RecruitmentDocumentsService(prisma, storage, { assertClean: vi.fn() } as any, {} as any, mail);
  return { svc, token, state, sent, mail, prisma, storage, tx };
}
const codeFrom = (sent: any[]) => /(\d{6})/.exec(sent[0].text)![1];

describe('codigo por e-mail antes do upload (RS-D-17)', () => {
  it('gera 6 digitos, guarda so o hash amarrado ao link e compara em tempo constante', () => {
    const code = generateVerificationCode();
    expect(code).toMatch(/^\d{6}$/);
    const h = hashVerificationCode('req-1', code);
    expect(codeMatches('req-1', code, h)).toBe(true);
    expect(codeMatches('req-2', code, h)).toBe(false);
    expect(codeMatches('req-1', '000000', h)).toBe(code === '000000');
    expect(maskEmail('ana.silva@exemplo.com')).toBe('a***@exemplo.com');
  });
  it('upload sem confirmar o codigo e recusado antes de ler o arquivo', async () => {
    const { svc, token, storage } = build();
    await expect(svc.publicUpload(token, 'RG ou CNH', { buffer: pdf })).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.save).not.toHaveBeenCalled();
  });
  it('fluxo completo: pedir codigo, confirmar, enviar', async () => {
    const { svc, token, state, sent, storage } = build();
    const asked = await svc.sendVerificationCode(token);
    expect(asked).toEqual({ verified: false, sent: true, emailHint: 'a***@exemplo.com' });
    expect(sent[0].to).toBe('ana.silva@exemplo.com');
    const code = codeFrom(sent);
    expect(state.codeHash).toBe(hashVerificationCode('req-1', code));
    expect(JSON.stringify(state)).not.toContain(code);
    expect(await svc.verifyCode(token, code)).toEqual({ verified: true });
    expect(state.verifiedAt).toBeInstanceOf(Date);
    expect(state.codeHash).toBeNull();
    await expect(svc.publicUpload(token, 'RG ou CNH', { buffer: pdf })).resolves.toEqual({ received: true });
    expect(storage.save).toHaveBeenCalled();
  });
  it('codigo errado conta tentativa e apos 5 erros bloqueia ate pedir outro', async () => {
    const { svc, token, sent } = build();
    await svc.sendVerificationCode(token);
    const good = codeFrom(sent);
    const wrong = good === '111111' ? '222222' : '111111';
    for (let i = 0; i < 5; i++) await expect(svc.verifyCode(token, wrong)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.verifyCode(token, good)).rejects.toMatchObject({ status: 429 });
  });
  it('codigo expirado e recusado; novo pedido respeita o intervalo de 60 s', async () => {
    const { svc, token, sent } = build();
    const t0 = new Date('2026-11-10T12:00:00Z');
    await svc.sendVerificationCode(token, t0);
    await expect(svc.sendVerificationCode(token, new Date(t0.getTime() + 30_000))).rejects.toBeInstanceOf(HttpException);
    await expect(svc.verifyCode(token, codeFrom(sent), new Date(t0.getTime() + 11 * 60_000))).rejects.toThrow(/expirado/);
    await expect(svc.sendVerificationCode(token, new Date(t0.getTime() + 61_000))).resolves.toMatchObject({ sent: true });
  });
  it('sem e-mail cadastrado nao ha o que verificar: vale o link; sem provedor de e-mail o pedido de codigo falha com 503', async () => {
    const noEmail = build({}, null);
    await expect(noEmail.svc.publicUpload(noEmail.token, 'RG ou CNH', { buffer: pdf })).resolves.toEqual({ received: true });
    await expect(noEmail.svc.sendVerificationCode(noEmail.token)).rejects.toBeInstanceOf(BadRequestException);
    const down = build();
    down.mail.send.mockResolvedValue({ sent: false });
    await expect(down.svc.sendVerificationCode(down.token)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('a visao publica informa se falta confirmar, com e-mail mascarado', async () => {
    const { svc, token } = build();
    expect((await svc.publicView(token)).verification).toEqual({ required: true, verified: false, emailHint: 'a***@exemplo.com' });
  });
});
