import { BadRequestException, ConflictException } from '@nestjs/common';
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
    ...overrides,
  } as any;
}

describe('UsersService.resetPassword', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates the password hash, forces a change on login and clears recovery state', async () => {
    const repository = makeRepository({
      findByIdWithPassword: vi.fn().mockResolvedValue({
        id: 'user-1',
        companyId: 'company-1',
        role: 'FUNCIONARIO',
        passwordHash: 'current-hash',
        previousPasswords: ['old-hash'],
      }),
      findById: vi.fn().mockResolvedValue({
        id: 'user-1',
        companyId: 'company-1',
        role: 'FUNCIONARIO',
        forcePasswordChange: true,
      }),
    });
    const compareSpy = vi.mocked(bcrypt.compare);
    const hashSpy = vi.mocked(bcrypt.hash);
    compareSpy.mockResolvedValue(false as never);
    hashSpy.mockResolvedValue('new-hash' as never);
    const service = new UsersService(repository);

    const result = await service.resetPassword('company-1', { sub: 'admin-1', role: 'ADMIN', email: 'admin@company.com' } as any, 'user-1', {
      newPassword: 'SenhaForte123!',
    });

    expect(compareSpy).toHaveBeenCalledWith('SenhaForte123!', 'current-hash');
    expect(hashSpy).toHaveBeenCalledWith('SenhaForte123!', 12);
    expect(repository.update).toHaveBeenCalledWith('user-1', expect.objectContaining({
      passwordHash: 'new-hash',
      previousPasswords: ['current-hash', 'old-hash'],
      forcePasswordChange: true,
      failedLoginAttempts: 0,
      resetPasswordCode: null,
      resetPasswordExpires: null,
      passwordChangedAt: expect.any(Date),
    }), 'company-1');
    expect(result).toEqual({
      id: 'user-1',
      companyId: 'company-1',
      role: 'FUNCIONARIO',
      forcePasswordChange: true,
    });
  });

  it('rejects weak passwords before touching the repository', async () => {
    const repository = makeRepository({
      findByIdWithPassword: vi.fn().mockResolvedValue({
        id: 'user-1',
        companyId: 'company-1',
        role: 'FUNCIONARIO',
        passwordHash: 'current-hash',
        previousPasswords: [],
      }),
    });
    const service = new UsersService(repository);

    await expect(service.resetPassword('company-1', { sub: 'admin-1', role: 'ADMIN', email: 'admin@company.com' } as any, 'user-1', {
      newPassword: 'weak',
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.findByIdWithPassword).toHaveBeenCalledWith('user-1', 'company-1');
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects password reuse based on the current hash and the historical hashes', async () => {
    const repository = makeRepository({
      findByIdWithPassword: vi.fn().mockResolvedValue({
        id: 'user-1',
        companyId: 'company-1',
        role: 'FUNCIONARIO',
        passwordHash: 'current-hash',
        previousPasswords: ['historical-hash'],
      }),
    });
    vi.mocked(bcrypt.compare).mockImplementation(async (candidate: string, hash: string) => candidate === 'SenhaForte123!' && (hash === 'current-hash' || hash === 'historical-hash'));
    const service = new UsersService(repository);

    await expect(service.resetPassword('company-1', { sub: 'admin-1', role: 'ADMIN', email: 'admin@company.com' } as any, 'user-1', {
      newPassword: 'SenhaForte123!',
    })).rejects.toBeInstanceOf(ConflictException);
  });
});
