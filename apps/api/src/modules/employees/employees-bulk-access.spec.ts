import { describe, expect, it, vi } from 'vitest';
import { EmployeesService } from './employees.service';

const OWNER = 'owner-1';

function build(users: Record<string, { id: string; role: string; passwordHash: string; email: string }>) {
  const employees: Record<string, any> = {
    e1: { id: 'e1', userId: 'u-func' }, e2: { id: 'e2', userId: 'u-admin' }, e3: { id: 'e3', userId: OWNER },
    e4: { id: 'e4', userId: 'actor' }, e5: { id: 'e5', userId: null }, e6: { id: 'e6', userId: 'u-gone' },
  };
  const repo: any = {
    findById: vi.fn(async (_c: string, id: string) => employees[id] ?? null),
    findUserById: vi.fn(async (_c: string, id: string) => users[id] ?? null),
    updateUser: vi.fn(async () => ({ count: 1 })),
    reissueTemporaryPassword: vi.fn(async () => ({ count: 1 })),
  };
  return { service: new EmployeesService(repo, {} as any), repo };
}

const users = {
  'u-func': { id: 'u-func', role: 'FUNCIONARIO', passwordHash: 'h', email: 'f@x.com' },
  'u-admin': { id: 'u-admin', role: 'ADMIN', passwordHash: 'h', email: 'a@x.com' },
  [OWNER]: { id: OWNER, role: 'DEV', passwordHash: 'h', email: 'dev@x.com' },
  actor: { id: 'actor', role: 'RH', passwordHash: 'h', email: 'rh@x.com' },
};

describe('bulkAccess: autorizacao e resultado por item', () => {
  it('RH reseta funcionario com provisoria; nega admin, dono, si mesmo, sem usuario e usuario inexistente', async () => {
    process.env.PLATFORM_OWNER_USER_ID = OWNER;
    const { service, repo } = build(users);
    const actor: any = { sub: 'actor', role: 'RH', email: 'rh@x.com', companyId: 'c1' };
    const res: any[] = await service.bulkAccess('c1', actor, { employeeIds: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'], action: 'reset-password' });
    const by = Object.fromEntries(res.map((r) => [r.employeeId, r]));
    expect(by.e1.success).toBe(true);
    expect(by.e1.temporaryPassword).toMatch(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{6}$/);
    for (const id of ['e2', 'e3', 'e4', 'e5', 'e6']) expect(by[id].success).toBe(false);
    expect(repo.reissueTemporaryPassword).toHaveBeenCalledTimes(1);
    expect(repo.reissueTemporaryPassword.mock.calls[0][1]).toBe('u-func');
  });

  it('CEO nao bloqueia o dono; block sem linha afetada nao vira sucesso', async () => {
    process.env.PLATFORM_OWNER_USER_ID = OWNER;
    const { service, repo } = build(users);
    repo.updateUser.mockResolvedValueOnce({ count: 0 });
    const actor: any = { sub: 'ceo-1', role: 'CEO', email: 'c@x.com', companyId: 'c1' };
    const res: any[] = await service.bulkAccess('c1', actor, { employeeIds: ['e3', 'e1'], action: 'block' });
    expect(res[0].success).toBe(false);
    expect(res[1].success).toBe(false);
    expect(repo.updateUser).toHaveBeenCalledTimes(1);
  });
});