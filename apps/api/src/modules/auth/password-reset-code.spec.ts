import { describe, expect, it, vi, beforeAll } from 'vitest';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SecurityStore } from './security-store';

beforeAll(() => { process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!'; });

const memoryStore = () => new SecurityStore({ getStatus: () => false, getClient: () => null } as any);
const HEX64 = /^[0-9a-f]{64}$/;

function build(overrides: Record<string, unknown> = {}) {
  const row: any = {
    id: 'u1', email: 'ana@x.com', name: 'Ana', isActive: true, role: 'FUNCIONARIO', companyId: 'c1', passwordChangedAt: new Date(),
    company: { status: 'ACTIVE', billingStatus: 'ACTIVE' }, resetPasswordCode: null, resetPasswordExpires: null, employee: null, ...overrides,
  };
  const repository: any = {
    findUserWithEmployeeByEmail: vi.fn(async () => row),
    findUserById: vi.fn(async () => row),
    createAuditLog: vi.fn(async () => ({})),
    clearResetCode: vi.fn(async () => { row.resetPasswordCode = null; row.resetPasswordExpires = null; }),
    setResetCode: vi.fn(async (_id: string, code: string | null, expires: Date | null) => { row.resetPasswordCode = code; row.resetPasswordExpires = expires; }),
  };
  const notifications = { createSystemNotice: vi.fn(async () => ({ count: 1 })) };
  const jwt = { signAsync: vi.fn(async () => 'jwt') };
  const service = new AuthService(repository, jwt as any, notifications as any, {} as any, {} as any, {} as any, {} as any, { isConfigured: () => false, send: vi.fn() } as any, memoryStore());
  return { service, repository, notifications, row };
}

const rh = { sub: 'rh1', role: 'RH', companyId: 'c1' } as any;
const settle = () => new Promise((r) => setTimeout(r, 20));

describe('SEG-08: codigo de recuperacao de senha', () => {
  it('o pedido nao grava codigo em claro nem o coloca na notificacao', async () => {
    const { service, repository, notifications } = build();
    service.requestPasswordReset({ email: 'ana@x.com' } as any, {});
    await settle();
    expect(notifications.createSystemNotice).toHaveBeenCalledTimes(1);
    const notice = (notifications.createSystemNotice.mock.calls[0] as any[])[1];
    expect(JSON.stringify(notice)).not.toMatch(/resetCode|"code"/i);
    expect(notice.extraJson?.resetCode).toBeUndefined();
    for (const call of repository.setResetCode.mock.calls) expect(call[1] === null || HEX64.test(call[1])).toBe(true);
  });

  it('o RH gera o codigo uma unica vez: 8 caracteres, so o HMAC e persistido', async () => {
    const { service, repository } = build();
    service.requestPasswordReset({ email: 'ana@x.com' } as any, {});
    await settle();
    const issued = await service.issueResetCode(rh, 'u1', {});
    expect(issued.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    const stored = repository.setResetCode.mock.calls.at(-1)![1];
    expect(stored).toMatch(HEX64);
    expect(stored).not.toContain(issued.code);
    expect(new Date(repository.setResetCode.mock.calls.at(-1)![2]).getTime() - Date.now()).toBeLessThanOrEqual(30 * 60_000 + 1000);
  });

  it('codigo com hash valida; codigo errado nao', async () => {
    const { service } = build();
    service.requestPasswordReset({ email: 'ana@x.com' } as any, {});
    await settle();
    const { code } = await service.issueResetCode(rh, 'u1', {});
    await expect(service.validateResetCode({ email: 'ana@x.com', code: 'AAAAAAAA' } as any)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.validateResetCode({ email: 'ana@x.com', code: code.toLowerCase() } as any)).resolves.toMatchObject({ valid: true });
  });

  it('um valor em claro antigo no banco nunca valida', async () => {
    const { service } = build({ resetPasswordCode: 'ABC123', resetPasswordExpires: new Date(Date.now() + 3_600_000) });
    await expect(service.validateResetCode({ email: 'ana@x.com', code: 'ABC123' } as any)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('so emite sem pedido pendente, para a mesma empresa e por perfil acima de quem pediu', async () => {
    await expect(build().service.issueResetCode(rh, 'u1', {})).rejects.toBeInstanceOf(ForbiddenException); // sem pedido
    const ctx = build({ resetPasswordExpires: new Date(Date.now() + 3_600_000) });
    await expect(ctx.service.issueResetCode({ ...rh, companyId: 'c2' }, 'u1', {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(ctx.service.issueResetCode({ ...rh, role: 'GESTOR' }, 'u1', {})).rejects.toBeInstanceOf(ForbiddenException);
    const rhTarget = build({ role: 'RH', resetPasswordExpires: new Date(Date.now() + 3_600_000) });
    await expect(rhTarget.service.issueResetCode(rh, 'u1', {})).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('codigos gerados variam (sem repeticao em 200 sorteios)', async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(AuthService.generateResetCode());
    expect(seen.size).toBe(200);
  });
});
