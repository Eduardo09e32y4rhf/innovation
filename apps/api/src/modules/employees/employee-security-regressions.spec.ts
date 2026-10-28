import { ForbiddenException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { actor, COMPANY_A, employee, makeService } from '../../../../../tests/qa/employees/helpers';

afterEach(() => vi.unstubAllEnvs());

describe('contenção: funcionários e contas protegidas', () => {
  it('cadastro sem ator é recusado antes de qualquer gravação', async () => {
    const { service, repository } = makeService();
    await expect(service.create(COMPANY_A, undefined as never, { name: 'Ana' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it.each(['NO', 'YES'] as const)('RH não edita nem bloqueia conta ADMIN com accessEnabled=%s', async (accessEnabled) => {
    const target = employee({ userId: 'admin-id', user: { id: 'admin-id', role: 'ADMIN' } });
    const { service, repository } = makeService({ findById: vi.fn().mockResolvedValue(target) });
    await expect(service.update(COMPANY_A, actor('RH'), target.id, { name: 'Tomada', accessEnabled })).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.updateUser).not.toHaveBeenCalled();
  });

  it('DEV não reaproveita o proprietário da plataforma pelo e-mail', async () => {
    vi.stubEnv('PLATFORM_OWNER_USER_ID', 'owner-id');
    const { service, repository } = makeService({
      findById: vi.fn().mockResolvedValue(employee()),
      findUserByEmail: vi.fn().mockResolvedValue({ id: 'owner-id', companyId: COMPANY_A, role: 'DEV', email: 'owner@x.com' }),
    });
    await expect(service.createAccess(COMPANY_A, actor('DEV'), 'emp-1', { email: 'owner@x.com' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.updateUser).not.toHaveBeenCalled();
    expect(repository.updateUserLink).not.toHaveBeenCalled();
  });

  it('RH não vincula conta CEO a um funcionário', async () => {
    const { service, repository } = makeService({
      findById: vi.fn().mockResolvedValue(employee()),
      findUserById: vi.fn().mockResolvedValue({ id: 'ceo-id', role: 'CEO' }),
    });
    await expect(service.linkAccess(COMPANY_A, actor('RH'), 'emp-1', 'ceo-id')).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.updateUserLink).not.toHaveBeenCalled();
  });

  it('dossiê de gestor é recusado antes de consultar dados clínicos ou documentos', async () => {
    const target = employee({ managerId: 'boss' });
    const { service, repository } = makeService({
      findById: vi.fn().mockResolvedValue(target),
      findByUserId: vi.fn().mockResolvedValue(employee({ id: 'boss' })),
    });
    await expect(service.dossier(COMPANY_A, actor('GESTOR'), target.id)).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.getDossier).not.toHaveBeenCalled();
  });

  it('projeção do gestor não expõe campos atuais nem campos sensíveis adicionados futuramente', async () => {
    const target = employee({ managerId: 'boss', cpf: 'secret', salary: '9999', bankAccount: '123', futureMedicalField: 'secret', userId: 'linked-id', user: { id: 'linked-id', role: 'FUNCIONARIO', isActive: true, forcePasswordChange: false, email: 'restricted@x.com', passwordHash: 'secret' } });
    const { service } = makeService({
      findById: vi.fn().mockResolvedValue(target),
      findByUserId: vi.fn().mockResolvedValue(employee({ id: 'boss' })),
    });
    const result = await service.get(COMPANY_A, actor('GESTOR'), target.id);
    expect(result).toMatchObject({ id: target.id, name: target.name });
    for (const field of ['cpf', 'salary', 'bankAccount', 'futureMedicalField']) expect(result).not.toHaveProperty(field);
    expect(result.userId).toBe('linked-id');
    expect(result.user).toEqual({ id: 'linked-id', role: 'FUNCIONARIO', isActive: true, forcePasswordChange: false });
  });

  it('gestor da empresa B e autogestão são recusados antes do UPDATE', async () => {
    const target = employee();
    const { service, repository } = makeService({ findById: vi.fn(async (_companyId, id) => id === target.id ? target : null) });
    for (const managerId of [target.id, 'manager-in-company-b']) {
      await expect(service.update(COMPANY_A, actor('RH'), target.id, { managerId })).rejects.toThrow();
    }
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('novo acesso retorna o ID realmente criado', async () => {
    const { service } = makeService({ findById: vi.fn().mockResolvedValue(employee()) });
    await expect(service.createAccess(COMPANY_A, actor('RH'), 'emp-1', { email: 'new@x.com' })).resolves.toMatchObject({ userId: 'new-user' });
  });
});
