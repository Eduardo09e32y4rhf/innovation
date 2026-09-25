import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from '../../../apps/api/node_modules/bcryptjs/index.js';
import { describe, expect, it, vi } from 'vitest';
import { UsersService } from '../../../apps/api/src/modules/users/users.service';

const companyId = 'company-a';
const targetId = 'user-target';
const actor = {
  sub: 'admin-a',
  email: 'admin@company-a.test',
  companyId,
  role: 'ADMIN' as const,
};

function repositoryDouble() {
  const safeUser = {
    id: targetId,
    companyId,
    name: 'Pessoa Teste',
    email: 'pessoa@company-a.test',
    role: 'FUNCIONARIO',
    isActive: true,
    forcePasswordChange: true,
  };

  return {
    safeUser,
    repository: {
      findByIdWithPassword: vi.fn(),
      update: vi.fn().mockResolvedValue({ count: 1 }),
      findById: vi.fn().mockResolvedValue(safeUser),
      createAuditLog: vi.fn(),
    },
  };
}

describe('UsersService.resetPassword', () => {
  it('updates the password inside the actor tenant and returns the refreshed safe user', async () => {
    const { repository, safeUser } = repositoryDouble();
    repository.findByIdWithPassword.mockResolvedValue({
      ...safeUser,
      passwordHash: await bcrypt.hash('SenhaAntiga@123', 4),
      previousPasswords: [],
    });
    const service = new UsersService(repository as never);

    const result = await service.resetPassword(
      companyId,
      actor,
      targetId,
      { newPassword: 'SenhaNova@123' },
    );

    expect(repository.findByIdWithPassword).toHaveBeenCalledWith(targetId, companyId);
    expect(repository.update).toHaveBeenCalledWith(
      targetId,
      expect.objectContaining({
        forcePasswordChange: true,
        failedLoginAttempts: 0,
        resetPasswordCode: null,
        resetPasswordExpires: null,
      }),
      companyId,
    );
    expect(repository.findById).toHaveBeenCalledWith(targetId, companyId);
    expect(result).toEqual(safeUser);

    const persisted = repository.update.mock.calls[0][1];
    expect(await bcrypt.compare('SenhaNova@123', persisted.passwordHash)).toBe(true);
  });

  it('does not reset a user that is absent from the actor tenant', async () => {
    const { repository } = repositoryDouble();
    repository.findByIdWithPassword.mockResolvedValue(null);
    const service = new UsersService(repository as never);

    await expect(
      service.resetPassword(companyId, actor, targetId, { newPassword: 'SenhaNova@123' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findByIdWithPassword).toHaveBeenCalledWith(targetId, companyId);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('blocks the administrative reset of the actor own password', async () => {
    const { repository, safeUser } = repositoryDouble();
    repository.findByIdWithPassword.mockResolvedValue({
      ...safeUser,
      id: actor.sub,
      role: 'ADMIN',
      passwordHash: await bcrypt.hash('SenhaAntiga@123', 4),
      previousPasswords: [],
    });
    const service = new UsersService(repository as never);

    await expect(
      service.resetPassword(companyId, actor, actor.sub, { newPassword: 'SenhaNova@123' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
