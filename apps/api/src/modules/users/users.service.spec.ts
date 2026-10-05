import { BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { UsersService } from './users.service';

vi.mock('bcryptjs', () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

function makeRepository(overrides: Record<string, any> = {}) {
  return {
    findByIdWithPassword: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    countByCompany: vi.fn(),
    getCompanyLimits: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockResolvedValue({ count: 1 }),
    delete: vi.fn(),
    list: vi.fn(),
    listAll: vi.fn(),
    ping: vi.fn(),
    createAuditLog: vi.fn(),
    ...overrides,
  } as any;
}

describe('UsersService: senha provisoria (reset e reemissao)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const admin = { sub: 'admin-1', role: 'ADMIN', email: 'admin@company.com' } as any;
  const target = { id: 'user-1', companyId: 'company-1', role: 'FUNCIONARIO', passwordHash: 'current-hash', previousPasswords: ['old-hash'] };

  it('reemite uma provisoria gerada pelo servidor, forte, com validade e na mesma transacao do hash', async () => {
    const repository = makeRepository({
      findByIdWithPassword: vi.fn().mockResolvedValue(target),
      reissueTemporaryPassword: vi.fn().mockResolvedValue({ count: 1 }),
    });
    vi.mocked(bcrypt.hash).mockResolvedValue('new-hash' as never);
    const result: any = await new UsersService(repository).reissueTemporaryPassword('company-1', admin, 'user-1');

    expect(result.temporaryPassword).toMatch(/^Aa1!/);
    expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(20);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    const [userId, userData, encrypted, expiresAt, scope] = repository.reissueTemporaryPassword.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(userData).toMatchObject({ passwordHash: 'new-hash', previousPasswords: ['current-hash', 'old-hash'], forcePasswordChange: true, failedLoginAttempts: 0 });
    expect(encrypted).not.toContain(result.temporaryPassword);
    expect(expiresAt).toBeInstanceOf(Date);
    expect(scope).toBe('company-1');
  });

  it('nao reemite para si mesmo nem para perfil que o ator nao gere', async () => {
    const repository = makeRepository({ findByIdWithPassword: vi.fn().mockResolvedValue({ ...target, role: 'DEV' }), reissueTemporaryPassword: vi.fn() });
    const service = new UsersService(repository);
    await expect(service.reissueTemporaryPassword('company-1', admin, 'user-1')).rejects.toBeInstanceOf(ForbiddenException);
    repository.findByIdWithPassword.mockResolvedValue({ ...target, id: 'admin-1' });
    await expect(service.reissueTemporaryPassword('company-1', admin, 'admin-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.reissueTemporaryPassword).not.toHaveBeenCalled();
  });

  it('administrador nao define a senha de outro usuario ao editar', async () => {
    const repository = makeRepository({ findById: vi.fn().mockResolvedValue({ id: 'user-1', companyId: 'company-1', role: 'FUNCIONARIO' }), updateWithEmployeeSync: vi.fn() });
    await expect(new UsersService(repository).update('company-1', admin, 'user-1', { password: 'SenhaForte123!' } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateWithEmployeeSync).not.toHaveBeenCalled();
  });

  it('o servico nao oferece mais reset com senha escolhida', () => {
    expect((UsersService.prototype as any).resetPassword).toBeUndefined();
  });
});
describe('UsersService internal platform role protection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not allow a tenant administrator to create a CEO', async () => {
    const repository = makeRepository();
    const service = new UsersService(repository);

    await expect(service.create('company-1', {
      sub: 'admin-1',
      role: 'ADMIN',
      email: 'admin@company.com',
      companyId: 'company-1',
    } as any, {
      name: 'CEO proibido',
      email: 'ceo@company.com',
      password: 'SenhaForte123!',
      role: 'CEO',
    })).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.findByEmail).not.toHaveBeenCalled();
  });

  it('does not allow tenant administrators to create CONTABIL', async () => {
    const repository = makeRepository();
    const service = new UsersService(repository);

    await expect(service.create('company-1', {
      sub: 'admin-1',
      role: 'ADMIN',
      email: 'admin@company.com',
      companyId: 'company-1',
    } as any, {
      name: 'Contabil proibido',
      email: 'contabil@company.com',
      password: 'SenhaForte123!',
      role: 'CONTABIL',
    })).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.findByEmail).not.toHaveBeenCalled();
  });
});
