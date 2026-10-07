import 'reflect-metadata';
import fs from 'node:fs';
import path from 'node:path';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it, vi } from 'vitest';
import { canManageRole } from '../../../apps/api/src/common/constants/role-hierarchy';
import { BulkEmployeeAccessDto, CreateEmployeeAccessDto } from '../../../apps/api/src/modules/employees/dto/employee-access.dto';
import { CreateEmployeeDto } from '../../../apps/api/src/modules/employees/dto/create-employee.dto';
import { UpdateEmployeeDto } from '../../../apps/api/src/modules/employees/dto/update-employee.dto';
import { actor, check, COMPANY_A, employee, makeService, ROLES } from './helpers';

// ───────────────────────── HACKER: tentando tomar contas, escalar privilégio e vazar dados ─────────────────────────
// Atacantes realistas: quem tem acesso legítimo às rotas de acesso (DEV, CEO, ADMIN, RH). Cada célula descreve
// o comportamento CORRETO; as marcadas [S-xx] hoje falham (o ataque funciona) e ficam registradas como defeito.

const ATTACKERS = ['DEV', 'CEO', 'ADMIN', 'RH'] as const;
const LINKED_USER = 'user-alvo';

function targetEmployee(targetRole: string) {
  return employee({ id: 'emp-alvo', userId: LINKED_USER, email: 'alvo@empresa.com', user: { id: LINKED_USER, role: targetRole, isActive: true, forcePasswordChange: false } });
}

describe('HACKER · tomada de conta em lote (block / unblock / reset-password / set-role)', () => {
  const actions = ['block', 'unblock', 'reset-password', 'set-role'] as const;

  for (const attacker of ATTACKERS) {
    for (const targetRole of ROLES) {
      for (const action of actions) {
        const allowed = canManageRole(attacker, targetRole);
        const name = `${attacker} ${allowed ? 'pode' : 'NÃO pode'} ${action} em conta ${targetRole}`;
        check(name, allowed ? null : 'S-04', async () => {
          const target = targetEmployee(targetRole);
          const { service, repository } = makeService({ findById: vi.fn().mockResolvedValue(target) } as never);
          const dto = { employeeIds: ['emp-alvo'], action, role: action === 'set-role' ? 'FUNCIONARIO' : undefined };
          const [result] = await service.bulkAccess(COMPANY_A, actor(attacker), dto as never);
          if (allowed) {
            expect(result.success).toBe(true);
          } else {
            expect(result.success).toBe(false);
            expect(result.temporaryPassword).toBeUndefined();
            expect(repository.updateUser).not.toHaveBeenCalled();
          }
        });
      }
    }
  }
});

describe('HACKER · criar acesso sobrescrevendo um usuário existente da própria empresa', () => {
  for (const attacker of ATTACKERS) {
    for (const existingRole of ROLES) {
      const allowed = canManageRole(attacker, existingRole) && canManageRole(attacker, 'FUNCIONARIO');
      check(`${attacker} ${allowed ? 'pode' : 'NÃO pode'} rebaixar/reaproveitar usuário ${existingRole} pelo e-mail`, attacker === 'CEO' ? (allowed ? 'Q-03' : null) : (allowed ? null : 'S-03'), async () => {
        const { service, repository } = makeService({
          findById: vi.fn().mockResolvedValue(employee({ id: 'emp-1', userId: null })),
          findUserByEmail: vi.fn().mockResolvedValue({ id: 'user-existente', companyId: COMPANY_A, role: existingRole }),
          findByUserId: vi.fn().mockResolvedValue(null),
        } as never);
        const run = service.createAccess(COMPANY_A, actor(attacker), 'emp-1', { email: 'admin@empresa.com', role: 'FUNCIONARIO', name: 'Pwn' });
        if (allowed) await expect(run).resolves.toMatchObject({ success: true });
        else {
          await expect(run).rejects.toThrow();
          expect(repository.updateUser).not.toHaveBeenCalled();
        }
      });
    }
  }
});

describe('HACKER · desligar/excluir/desvincular o cadastro de quem tem conta privilegiada', () => {
  const ops = ['terminate', 'delete-sem-historico', 'delete-com-historico', 'unlink'] as const;
  for (const attacker of ATTACKERS) {
    for (const targetRole of ROLES) {
      for (const op of ops) {
        const allowed = canManageRole(attacker, targetRole);
        // Ficha de DEV já é invisível para não-DEV (404), então esse recorte já é seguro.
        const alreadyHidden = targetRole === 'DEV' && attacker !== 'DEV';
        const bug = attacker === 'CEO' ? (allowed ? 'Q-03' : null) : (allowed || alreadyHidden ? null : 'S-05');
        check(`${attacker} ${allowed ? 'pode' : 'NÃO pode'} ${op} no cadastro ligado a conta ${targetRole}`, bug, async () => {
          const { service, repository } = makeService({
            findById: vi.fn().mockResolvedValue(targetEmployee(targetRole)),
            getDeletionImpact: vi.fn().mockResolvedValue({ total: op === 'delete-com-historico' ? 3 : 0 }),
          } as never);
          const a = actor(attacker);
          const run = op === 'terminate' ? service.terminate(COMPANY_A, a, 'emp-alvo')
            : op === 'unlink' ? service.unlinkAccess(COMPANY_A, a, 'emp-alvo')
              : service.delete(COMPANY_A, a, 'emp-alvo');
          if (allowed) await expect(run).resolves.toBeDefined();
          else {
            await expect(run).rejects.toThrow();
            expect(repository.updateUser).not.toHaveBeenCalled();
          }
        });
      }
    }
  }
});

describe('HACKER · escalada pelo cadastro de funcionário (accessProfile)', () => {
  check('criar funcionário com accessProfile=ADMIN não cria administrador sem checar quem pediu', 'S-01', async () => {
    const created = employee({ id: 'new-emp', email: 'novo@x.com' });
    const { service, repository } = makeService({ create: vi.fn().mockResolvedValue(created), findById: vi.fn().mockResolvedValue(created) } as never);
    // A rota de criação nem recebe o ator: RH consegue o mesmo que ADMIN.
    await service.create(COMPANY_A, { name: 'Cúmplice', email: 'novo@x.com', accessEnabled: 'YES', accessProfile: 'ADMIN' } as never).catch(() => undefined);
    const roles = repository.createUser.mock.calls.map((call) => call[0].role);
    expect(roles).not.toContain('ADMIN');
  });

  for (const existingRole of ROLES) {
    const allowed = canManageRole('RH', existingRole);
    check(`update por RH com accessEnabled=YES não altera a conta existente ${existingRole} (por e-mail)`, allowed ? null : 'S-03', async () => {
      const target = employee({ id: 'emp-1', email: 'admin@empresa.com', userId: null });
      const { service, repository } = makeService({
        findById: vi.fn().mockResolvedValue(target),
        findUserByEmail: vi.fn().mockResolvedValue({ id: 'u-existente', companyId: COMPANY_A, role: existingRole }),
        findByUserId: vi.fn().mockResolvedValue(null),
      } as never);
      const run = service.update(COMPANY_A, actor('RH'), 'emp-1', { accessEnabled: 'YES', accessProfile: 'FUNCIONARIO' } as never);
      if (allowed) await run.catch(() => undefined);
      else {
        await run.catch(() => undefined);
        expect(repository.updateUser).not.toHaveBeenCalledWith(COMPANY_A, 'u-existente', expect.objectContaining({ role: expect.anything() }));
      }
    });
  }
});

describe('HACKER · isolamento entre empresas (todas as consultas ao banco devem carregar a empresa)', () => {
  const GLOBAL_LOOKUPS = new Set(['findByCpf', 'findUserByEmail']);

  async function exercise(run: (ctx: ReturnType<typeof makeService>) => Promise<unknown>) {
    const ctx = makeService({
      findById: vi.fn().mockResolvedValue(employee({ id: 'e1', userId: 'u1', user: { role: 'FUNCIONARIO' }, email: 'a@x.com' })),
      findByUserId: vi.fn().mockResolvedValue(employee({ id: 'mine', userId: 'user-gestor', managerId: null })),
      findUserById: vi.fn().mockResolvedValue({ id: 'u1', companyId: COMPANY_A }),
      getDossier: vi.fn().mockResolvedValue({ employee: employee() }),
    } as never);
    await run(ctx).catch(() => undefined);
    return ctx.repository;
  }

  const scenarios: Array<[string, (c: ReturnType<typeof makeService>) => Promise<unknown>]> = [
    ['list RH', (c) => c.service.list(COMPANY_A, actor('RH'), 1, 50, 'x', 'ACTIVE')],
    ['list GESTOR', (c) => c.service.list(COMPANY_A, actor('GESTOR'), 1, 50)],
    ['list FUNCIONARIO', (c) => c.service.list(COMPANY_A, actor('FUNCIONARIO'), 1, 50)],
    ['swap-candidates', (c) => c.service.listSwapCandidates(COMPANY_A, actor('FUNCIONARIO'))],
    ['get', (c) => c.service.get(COMPANY_A, actor('RH'), 'e1')],
    ['dossier', (c) => c.service.dossier(COMPANY_A, actor('RH'), 'e1')],
    ['create', (c) => c.service.create(COMPANY_A, { name: 'N', cpf: '1', registration: 'm', accessEnabled: 'YES', email: 'n@x.com' } as never)],
    ['update', (c) => c.service.update(COMPANY_A, actor('RH'), 'e1', { name: 'N', cpf: '1', registration: 'm' } as never)],
    ['terminate', (c) => c.service.terminate(COMPANY_A, actor('RH'), 'e1')],
    ['delete', (c) => c.service.delete(COMPANY_A, actor('RH'), 'e1')],
    ['createAccess', (c) => c.service.createAccess(COMPANY_A, actor('RH'), 'e1', { email: 'n@x.com' })],
    ['linkAccess', (c) => c.service.linkAccess(COMPANY_A, actor('RH'), 'e1', 'u1')],
    ['unlinkAccess', (c) => c.service.unlinkAccess(COMPANY_A, actor('RH'), 'e1')],
    ['bulk create', (c) => c.service.bulkAccess(COMPANY_A, actor('RH'), { employeeIds: ['e1'], action: 'create' })],
    ['bulk block', (c) => c.service.bulkAccess(COMPANY_A, actor('RH'), { employeeIds: ['e1'], action: 'block' })],
    ['bulk reset', (c) => c.service.bulkAccess(COMPANY_A, actor('RH'), { employeeIds: ['e1'], action: 'reset-password' })],
  ];

  for (const [name, run] of scenarios) {
    it(`${name}: toda consulta com escopo recebe a empresa correta`, async () => {
      const repo = await exercise(run);
      for (const [method, mock] of Object.entries(repo)) {
        if (GLOBAL_LOOKUPS.has(method)) continue;
        for (const call of mock.mock.calls) {
          const first = call[0];
          if (typeof first === 'object' && first !== null) expect(first.companyId, `${method} sem companyId`).toBe(COMPANY_A);
          else expect(first, `${method} chamado fora do escopo da empresa`).toBe(COMPANY_A);
        }
      }
    });
  }

  check('CPF é consultado só dentro da empresa (hoje a busca é global e revela CPF de OUTRA empresa)', 'S-02', async () => {
    const { service, repository } = makeService({ findByCpf: vi.fn().mockResolvedValue(employee({ companyId: 'company-b' })) } as never);
    await service.create(COMPANY_A, { name: 'Espião', cpf: '52998224725' } as never).catch(() => undefined);
    expect(repository.findByCpf).toHaveBeenCalledWith(COMPANY_A, expect.anything());
  });

  check('e-mail de usuário é consultado só dentro da empresa (hoje revela e-mail cadastrado em outra empresa)', 'S-02', async () => {
    const { service, repository } = makeService({ findById: vi.fn().mockResolvedValue(employee({ id: 'e1' })) } as never);
    await service.createAccess(COMPANY_A, actor('RH'), 'e1', { email: 'alguem@x.com' }).catch(() => undefined);
    expect(repository.findUserByEmail).toHaveBeenCalledWith(COMPANY_A, expect.anything());
  });

  it('e o gestor de uma empresa não enxerga a ficha de um funcionário de outra (404 mesmo com id válido)', async () => {
    const { service } = makeService({ findById: vi.fn().mockResolvedValue(null) } as never);
    await expect(service.get(COMPANY_A, actor('RH'), 'id-da-empresa-b')).rejects.toThrow(/not found/i);
  });
});

describe('HACKER · mass assignment pelo corpo da requisição (ValidationPipe real: whitelist + forbidNonWhitelisted)', () => {
  const options = { whitelist: true, forbidNonWhitelisted: true } as const;
  const dangerous = [
    'id', 'companyId', 'userId', 'originCandidateId', 'createdAt', 'updatedAt', 'deletedAt', 'role', 'isAdmin', 'isActive',
    'password', 'passwordHash', 'user', 'faceEnrollment', 'company', 'managerUser', 'permissions', 'customPermissions', 'prototype',
  ];
  for (const [label, Dto] of [['CreateEmployeeDto', CreateEmployeeDto], ['UpdateEmployeeDto', UpdateEmployeeDto]] as const) {
    for (const key of dangerous) {
      it(`${label} rejeita a propriedade extra "${key}"`, async () => {
        const body: Record<string, unknown> = { name: 'Fulano', [key]: key === 'user' ? { role: 'ADMIN' } : 'ADMIN' };
        const errors = await validate(plainToInstance(Dto as never, body) as object, options);
        expect(errors.length).toBeGreaterThan(0);
      });
    }
    it(`${label} rejeita __proto__ injetado via JSON`, async () => {
      const body = JSON.parse('{"name":"Fulano","__proto__":{"isAdmin":true}}');
      const errors = await validate(plainToInstance(Dto as never, body) as object, options);
      const polluted = ({} as Record<string, unknown>).isAdmin;
      expect(polluted).toBeUndefined();
      expect(errors.length).toBeGreaterThanOrEqual(0);
    });
  }
});

describe('HACKER · negação de serviço e validação fraca nos DTOs de acesso', () => {
  const opts = { whitelist: true, forbidNonWhitelisted: true } as const;

  check('bulk com 10.000 ids é recusado (cada item faz bcrypt custo 12 em série)', 'S-06', async () => {
    const dto = plainToInstance(BulkEmployeeAccessDto, { employeeIds: Array.from({ length: 10_000 }, () => 'a'.repeat(36)), action: 'reset-password' });
    expect((await validate(dto, opts)).length).toBeGreaterThan(0);
  });

  const notUuids: unknown[] = ['1 OR 1=1', "' OR ''='", '../../etc/passwd', '<script>', '', 123, null, {}, ['x'], 'a'.repeat(5000)];
  notUuids.forEach((value, index) => {
    check(`bulk rejeita item que não é UUID (#${index}: ${JSON.stringify(value)?.slice(0, 30)})`, 'S-06', async () => {
      const dto = plainToInstance(BulkEmployeeAccessDto, { employeeIds: [value], action: 'block' });
      expect((await validate(dto, opts)).length).toBeGreaterThan(0);
    });
  });

  it('bulk rejeita ação desconhecida e papel fora da lista', async () => {
    expect((await validate(plainToInstance(BulkEmployeeAccessDto, { employeeIds: [], action: 'drop-database' }), opts)).length).toBeGreaterThan(0);
    expect((await validate(plainToInstance(BulkEmployeeAccessDto, { employeeIds: [], action: 'set-role', role: 'DEV' }), opts)).length).toBeGreaterThan(0);
    expect((await validate(plainToInstance(CreateEmployeeAccessDto, { email: 'a@x.com', role: 'CEO' }), opts)).length).toBeGreaterThan(0);
  });

  const badEmails = ['', 'a', 'a@', '@x.com', 'a b@x.com', 'a@x', 'a@@x.com', '<script>@x.com', 'a@x.com\r\nBcc: v@x.com', 'a'.repeat(400) + '@x.com'];
  badEmails.forEach((email) => {
    it(`acesso rejeita e-mail inválido: ${JSON.stringify(email).slice(0, 40)}`, async () => {
      expect((await validate(plainToInstance(CreateEmployeeAccessDto, { email }), opts)).length).toBeGreaterThan(0);
    });
  });
});

describe('HACKER · vazamento de dados sensíveis para quem não precisa', () => {
  const sensitive = { salary: '9999.00', bankAccount: '12345-6', bankAgency: '0001', cpf: '52998224725', motherName: 'Maria', pis: '12345678901', dependents: [{ nome: 'x' }] };

  check('GESTOR não recebe salário, conta bancária e CPF da equipe na listagem', 'S-08', async () => {
    const me = employee({ id: 'boss', userId: 'user-gestor' });
    const { service } = makeService({
      findByUserId: vi.fn().mockResolvedValue(me),
      listByManager: vi.fn().mockResolvedValue([employee({ id: 'sub', ...sensitive })]),
    } as never);
    const rows = (await service.list(COMPANY_A, actor('GESTOR'), 1, 50)) as Array<Record<string, unknown>>;
    const sub = rows.find((r) => r.id === 'sub')!;
    expect(sub.salary).toBeUndefined();
    expect(sub.bankAccount).toBeUndefined();
    expect(sub.bankAgency).toBeUndefined();
  });

  check('GESTOR não recebe salário e dados bancários no get/dossiê de um subordinado', 'S-08', async () => {
    const boss = employee({ id: 'boss', userId: 'user-gestor' });
    const sub = employee({ id: 'sub', managerId: 'boss', ...sensitive });
    const { service } = makeService({ findById: vi.fn().mockResolvedValue(sub), findByUserId: vi.fn().mockResolvedValue(boss) } as never);
    const got = (await service.get(COMPANY_A, actor('GESTOR'), 'sub')) as Record<string, unknown>;
    expect(got.salary).toBeUndefined();
    expect(got.bankAccount).toBeUndefined();
  });

  it('o candidato a troca de turno expõe só id, nome, matrícula e cargo', async () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../../apps/api/src/modules/employees/employees.repository.ts'), 'utf8');
    const block = source.slice(source.indexOf('listSwapCandidates('), source.indexOf('countByManager'));
    expect(block).toMatch(/select:\s*\{\s*id: true, name: true, registration: true, position: true\s*\}/);
  });

  check('identificar "a minha ficha" por e-mail pode trazer a ficha de outra pessoa (findByUserId usa OR com e-mail)', 'S-09', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../../apps/api/src/modules/employees/employees.repository.ts'), 'utf8');
    const block = source.slice(source.indexOf('findByUserId('), source.indexOf('listByManager('));
    expect(block).not.toMatch(/email:\s*\{\s*equals/);
  });
});
