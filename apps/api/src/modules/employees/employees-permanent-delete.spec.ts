import { describe, expect, it, vi } from 'vitest';
import { EmployeesService } from './employees.service';
import { EmployeesRepository } from './employees.repository';
import { EmployeesController } from './employees.controller';

describe('exclusão definitiva de funcionário', () => {
  it('exige confirmação explícita para excluir e mantém arquivamento para clientes antigos', async () => {
    const service = { delete: vi.fn(), deletePermanently: vi.fn() };
    const controller = new EmployeesController(service as any, {} as any);
    const actor = { sub: 'rh1', role: 'RH' } as any;
    await controller.delete('c1', actor, 'e1');
    expect(service.delete).toHaveBeenCalledOnce();
    expect(service.deletePermanently).not.toHaveBeenCalled();
    await controller.delete('c1', actor, 'e1', 'true');
    expect(service.deletePermanently).toHaveBeenCalledWith('c1', actor, 'e1');
  });
  it('remove também funcionário desligado com histórico quando a exclusão é confirmada', async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue({ id: 'e1', userId: 'u1', companyId: 'c1', status: 'TERMINATED', user: { role: 'FUNCIONARIO' } }),
      getDeletionImpact: vi.fn().mockResolvedValue({ timeTracks: 2, asoRecords: 1, total: 3 }),
      deletePermanently: vi.fn().mockResolvedValue({ count: 1 }),
    };
    const service = new EmployeesService(repository as any, {} as any);
    const result = await service.deletePermanently('c1', { sub: 'rh1', role: 'RH' } as any, 'e1');
    expect(result).toMatchObject({ deleted: true, archived: false });
    expect(repository.deletePermanently).toHaveBeenCalledWith('c1', 'e1', 'rh1', expect.objectContaining({ total: 3 }));
  });

  it('executa exclusão, bloqueio do acesso e auditoria na mesma transação e empresa', async () => {
    const tx = {
      employee: { findFirst: vi.fn().mockResolvedValue({ id: 'e1', name: 'Pessoa', userId: 'u1' }), deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      user: { updateMany: vi.fn() }, auditLog: { create: vi.fn() },
    };
    const prisma = { $transaction: vi.fn(async (fn) => fn(tx)) };
    await new EmployeesRepository(prisma as any).deletePermanently('c1', 'e1', 'rh1', { total: 3 });
    expect(tx.employee.deleteMany).toHaveBeenCalledWith({ where: { companyId: 'c1', id: 'e1' } });
    expect(tx.user.updateMany).toHaveBeenCalledWith({ where: { companyId: 'c1', id: 'u1' }, data: expect.objectContaining({ isActive: false }) });
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ companyId: 'c1', action: 'EMPLOYEE_DELETED', entityId: 'e1' }) });
  });

  it('RH não exclui funcionário com acesso de ADMIN nem o próprio cadastro', async () => {
    const employee = { id: 'e1', userId: 'u1', user: { role: 'ADMIN' } };
    const repository = { findById: vi.fn().mockResolvedValue(employee), deletePermanently: vi.fn() };
    const service = new EmployeesService(repository as any, {} as any);
    await expect(service.deletePermanently('c1', { sub: 'rh1', role: 'RH' } as any, 'e1')).rejects.toThrow('Seu perfil');
    await expect(service.deletePermanently('c1', { sub: 'u1', role: 'ADMIN' } as any, 'e1')).rejects.toThrow('próprio');
    expect(repository.deletePermanently).not.toHaveBeenCalled();
  });
});
