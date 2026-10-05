import { ForbiddenException, NotFoundException } from '@nestjs/common';
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
  const target = {
    id: targetId,
    companyId,
    name: 'Pessoa Teste',
    email: 'pessoa@company-a.test',
    role: 'FUNCIONARIO',
    isActive: true,
    passwordHash: 'hash-atual',
    previousPasswords: [],
  };
  return {
    target,
    repository: {
      findByIdWithPassword: vi.fn(),
      reissueTemporaryPassword: vi.fn().mockResolvedValue({ count: 1 }),
      createAuditLog: vi.fn(),
    },
  };
}

// O reset administrativo emite uma provisoria nova; o administrador nunca escolhe a senha de outra pessoa.
describe('UsersService.reissueTemporaryPassword (reset administrativo)', () => {
  it('emite a provisoria dentro do tenant do ator e devolve o segredo uma unica vez', async () => {
    const { repository, target } = repositoryDouble();
    repository.findByIdWithPassword.mockResolvedValue(target);
    const service = new UsersService(repository as never);

    const result: any = await service.reissueTemporaryPassword(companyId, actor, targetId);

    expect(repository.findByIdWithPassword).toHaveBeenCalledWith(targetId, companyId);
    expect(repository.reissueTemporaryPassword).toHaveBeenCalledWith(
      targetId,
      expect.objectContaining({ forcePasswordChange: true, failedLoginAttempts: 0 }),
      expect.any(String),
      expect.any(Date),
      companyId,
    );
    expect(result.temporaryPassword).toMatch(/^Aa1!/);
  });

  it('nao emite para usuario ausente do tenant do ator', async () => {
    const { repository } = repositoryDouble();
    repository.findByIdWithPassword.mockResolvedValue(null);
    const service = new UsersService(repository as never);

    await expect(service.reissueTemporaryPassword(companyId, actor, targetId)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findByIdWithPassword).toHaveBeenCalledWith(targetId, companyId);
    expect(repository.reissueTemporaryPassword).not.toHaveBeenCalled();
  });

  it('bloqueia a reemissao da propria senha', async () => {
    const { repository, target } = repositoryDouble();
    repository.findByIdWithPassword.mockResolvedValue({ ...target, id: actor.sub, role: 'ADMIN' });
    const service = new UsersService(repository as never);

    await expect(service.reissueTemporaryPassword(companyId, actor, actor.sub)).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.reissueTemporaryPassword).not.toHaveBeenCalled();
  });
});