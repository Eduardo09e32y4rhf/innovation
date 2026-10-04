import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { JwtUser } from '../../common/types/auth.types';
import { EmployeesService } from './employees.service';

const actor = (role: JwtUser['role'], sub = 'user-1'): JwtUser => ({ sub, email: `${sub}@x.com`, name: sub, companyId: 'c1', role });

function setup(mine: { id: string } | null, target: Record<string, unknown> | null) {
  const repository = {
    findById: vi.fn().mockResolvedValue(target),
    findByUserId: vi.fn().mockResolvedValue(mine),
    getDossier: vi.fn().mockResolvedValue({ ok: true }),
  };
  return { service: new EmployeesService(repository as never, {} as never), repository };
}

const colleague = { id: 'e-colleague', userId: 'u-colleague', managerId: 'e-boss', user: { role: 'FUNCIONARIO' } };

describe('escopo de leitura da ficha do funcionário', () => {
  it('FUNCIONARIO lê a própria ficha, mas não a de colegas (get e dossiê)', async () => {
    const own = { id: 'e-me', userId: 'user-1', user: { role: 'FUNCIONARIO' } };
    await expect(setup({ id: 'e-me' }, own).service.get('c1', actor('FUNCIONARIO'), 'e-me')).resolves.toBe(own);
    const denied = setup({ id: 'e-me' }, colleague);
    await expect(denied.service.get('c1', actor('FUNCIONARIO'), 'e-colleague')).rejects.toBeInstanceOf(NotFoundException);
    await expect(denied.service.dossier('c1', actor('FUNCIONARIO'), 'e-colleague')).rejects.toBeInstanceOf(NotFoundException);
    expect(denied.repository.getDossier).not.toHaveBeenCalled();
  });

  it('GESTOR lê a si e à sua equipe, não a quem é de outro gestor', async () => {
    const mine = { id: 'e-boss' };
    await expect(setup(mine, colleague).service.get('c1', actor('GESTOR'), 'e-colleague')).resolves.toBe(colleague);
    const other = { ...colleague, managerId: 'e-other-boss' };
    await expect(setup(mine, other).service.get('c1', actor('GESTOR'), 'e-colleague')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('RH, ADMIN, DEV e CONSULTA leem qualquer ficha da empresa', async () => {
    for (const role of ['RH', 'ADMIN', 'DEV', 'CONSULTA'] as const) {
      await expect(setup(null, colleague).service.get('c1', actor(role), 'e-colleague')).resolves.toBe(colleague);
    }
  });

  it('CEO não lê fichas individuais e usuário sem ficha não lê nada', async () => {
    await expect(setup({ id: 'x' }, colleague).service.get('c1', actor('CEO'), 'e-colleague')).rejects.toBeInstanceOf(NotFoundException);
    await expect(setup(null, colleague).service.get('c1', actor('FUNCIONARIO'), 'e-colleague')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ficha de DEV continua invisível para quem não é DEV', async () => {
    const devRecord = { id: 'e-dev', userId: 'u-dev', managerId: null, user: { role: 'DEV' } };
    await expect(setup(null, devRecord).service.get('c1', actor('RH'), 'e-dev')).rejects.toBeInstanceOf(NotFoundException);
  });
});