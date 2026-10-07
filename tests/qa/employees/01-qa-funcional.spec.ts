import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { BadRequestException, ConflictException, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EmployeesController } from '../../../apps/api/src/modules/employees/employees.controller';
import { RolesGuard } from '../../../apps/api/src/common/guards/roles.guard';
import { actor, check, COMPANY_A, employee, makeService, ROLES } from './helpers';

// ───────────────────────── QA SÊNIOR: uso funcional completo, inclusive o uso errado ─────────────────────────

describe('QA · listagem por perfil', () => {
  it('ADMIN/RH/DEV/CONSULTA recebem a lista da empresa com skip/take corretos', async () => {
    for (const role of ['ADMIN', 'RH', 'DEV', 'CONSULTA'] as const) {
      const { service, repository } = makeService({ list: vi.fn().mockResolvedValue([employee()]) } as never);
      const result = await service.list(COMPANY_A, actor(role), 3, 20, 'ana', 'ACTIVE');
      expect(result).toHaveLength(1);
      expect(repository.list).toHaveBeenCalledWith(COMPANY_A, 40, 20, 'ana', 'ACTIVE');
    }
  });

  it('GESTOR vê a si mesmo e a própria equipe, sem duplicar o próprio registro', async () => {
    const me = employee({ id: 'boss', userId: 'user-gestor' });
    const { service } = makeService({
      findByUserId: vi.fn().mockResolvedValue(me),
      listByManager: vi.fn().mockResolvedValue([me, employee({ id: 'a' }), employee({ id: 'b' })]),
    } as never);
    const result = await service.list(COMPANY_A, actor('GESTOR'), 1, 50);
    expect(result.map((e: { id: string }) => e.id)).toEqual(['boss', 'a', 'b']);
  });

  it('GESTOR sem ficha de funcionário recebe lista vazia (não erro)', async () => {
    const { service } = makeService({ findByUserId: vi.fn().mockResolvedValue(null) } as never);
    await expect(service.list(COMPANY_A, actor('GESTOR'), 1, 50)).resolves.toEqual([]);
  });

  it('FUNCIONARIO recebe só a própria ficha', async () => {
    const me = employee({ id: 'me' });
    const { service } = makeService({ findByUserId: vi.fn().mockResolvedValue(me) } as never);
    await expect(service.list(COMPANY_A, actor('FUNCIONARIO'), 1, 50)).resolves.toEqual([me]);
  });

  it('perfis sem acesso (CONTABIL, COMERCIAL) recebem lista vazia', async () => {
    for (const role of ['CONTABIL', 'COMERCIAL'] as const) {
      const { service } = makeService();
      await expect(service.list(COMPANY_A, actor(role), 1, 50)).resolves.toEqual([]);
    }
  });

  it('usuários DEV ficam ocultos para quem não é DEV, e visíveis para DEV', async () => {
    const rows = [employee({ id: 'x', user: { role: 'DEV' } }), employee({ id: 'y', user: { role: 'RH' } })];
    const hidden = await makeService({ list: vi.fn().mockResolvedValue(rows) } as never).service.list(COMPANY_A, actor('RH'), 1, 50);
    expect(hidden.map((e: { id: string }) => e.id)).toEqual(['y']);
    const all = await makeService({ list: vi.fn().mockResolvedValue(rows) } as never).service.list(COMPANY_A, actor('DEV'), 1, 50);
    expect(all).toHaveLength(2);
  });
});

describe('QA · parâmetros de paginação no controller (uso errado de propósito)', () => {
  const hostile = ['abc', '', ' ', '-1', '0', '1.5', '1e3', 'NaN', 'Infinity', '9'.repeat(30), '١٢٣', '0x10', '1; DROP TABLE', '[]', 'null', 'undefined'];

  // parseInt(valor) vira NaN para texto não numérico e Infinity; números gigantes estouram o INT do banco (skip enorme).
  const BAD_PAGE = new Set([' ', 'abc', 'NaN', 'null', 'undefined', '[]', '١٢٣', 'Infinity', '9'.repeat(30)]);
  const BAD_SIZE = new Set([' ', 'abc', 'NaN', 'null', 'undefined', '[]', '١٢٣', 'Infinity']);

  for (const page of hostile) {
    check(`page=${JSON.stringify(page)} chega ao serviço como inteiro entre 1 e 1.000.000`, BAD_PAGE.has(page) ? 'QA-01' : null, async () => {
      const list = vi.fn().mockResolvedValue([]);
      const controller = new EmployeesController({ list } as never, {} as never);
      await controller.list(COMPANY_A, actor('RH'), page, '10');
      const pageArg = list.mock.calls[0][2];
      expect(Number.isInteger(pageArg) && pageArg >= 1 && pageArg <= 1_000_000).toBe(true);
    });
  }

  for (const pageSize of hostile) {
    check(`pageSize=${JSON.stringify(pageSize)} chega ao serviço como inteiro entre 1 e 100`, BAD_SIZE.has(pageSize) ? 'QA-01' : null, async () => {
      const list = vi.fn().mockResolvedValue([]);
      const controller = new EmployeesController({ list } as never, {} as never);
      await controller.list(COMPANY_A, actor('RH'), '1', pageSize);
      const sizeArg = list.mock.calls[0][3];
      expect(Number.isInteger(sizeArg) && sizeArg >= 1 && sizeArg <= 100).toBe(true);
    });
  }
  it('pageSize acima de 100 é limitado a 100 (proteção contra dump)', async () => {
    const list = vi.fn().mockResolvedValue([]);
    await new EmployeesController({ list } as never, {} as never).list(COMPANY_A, actor('RH'), '1', '100000');
    expect(list.mock.calls[0][3]).toBe(100);
  });
});

describe('QA · criar funcionário', () => {
  it('cria, gera ASO admissional pendente e devolve a ficha', async () => {
    const { service, repository, aso } = makeService({ findById: vi.fn().mockResolvedValue(employee({ id: 'new-emp' })) } as never);
    const created = await service.create(COMPANY_A, { name: 'Bruno Lima', email: 'bruno@x.com' } as never);
    expect(created.id).toBe('new-emp');
    expect(repository.create).toHaveBeenCalledWith(COMPANY_A, expect.objectContaining({ name: 'Bruno Lima' }));
    expect(aso.create).toHaveBeenCalledWith(COMPANY_A, undefined, expect.objectContaining({ asoType: 'ADMISSIONAL', status: 'PENDING' }));
  });

  it('CPF já cadastrado → 409', async () => {
    const { service } = makeService({ findByCpf: vi.fn().mockResolvedValue(employee()) } as never);
    await expect(service.create(COMPANY_A, { name: 'X', cpf: '12345678909' } as never)).rejects.toBeInstanceOf(ConflictException);
  });

  it('matrícula repetida (qualquer caixa) → 409', async () => {
    const { service } = makeService({ findByRegistration: vi.fn().mockResolvedValue(employee({ id: 'other' })) } as never);
    await expect(service.create(COMPANY_A, { name: 'X', registration: 'a-001' } as never)).rejects.toBeInstanceOf(ConflictException);
  });

  it('dependentes com JSON inválido → 400', async () => {
    const { service } = makeService();
    await expect(service.create(COMPANY_A, { name: 'X', dependents: '{not json' } as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('dependentes com JSON válido são gravados como objeto', async () => {
    const { service, repository } = makeService({ findById: vi.fn().mockResolvedValue(employee()) } as never);
    await service.create(COMPANY_A, { name: 'X', dependents: '[{"nome":"Filha"}]' } as never);
    expect(repository.create.mock.calls[0][1].dependents).toEqual([{ nome: 'Filha' }]);
  });

  it('accessEnabled=YES cria usuário com senha temporária forte e vincula', async () => {
    const { service, repository } = makeService({ findById: vi.fn().mockResolvedValue(employee({ id: 'new-emp', email: 'novo@x.com' })) } as never);
    await service.create(COMPANY_A, { name: 'X', email: 'novo@x.com', accessEnabled: 'YES', accessProfile: 'GESTOR' } as never);
    const created = repository.createUser.mock.calls[0][0];
    expect(created).toMatchObject({ companyId: COMPANY_A, role: 'GESTOR', forcePasswordChange: true });
    expect(created.temporaryPassword.value).toMatch(/^Aa1!/);
    expect(created.temporaryPassword.value.length).toBeGreaterThanOrEqual(20);
    expect(created.passwordHash).not.toContain(created.temporaryPassword.value);
  });

  it('acesso pedido sem e-mail → 409 claro', async () => {
    const { service } = makeService({ create: vi.fn().mockResolvedValue(employee({ id: 'new-emp', email: null })), findById: vi.fn().mockResolvedValue(employee({ id: 'new-emp', email: null })) } as never);
    await expect(service.create(COMPANY_A, { name: 'X', accessEnabled: 'YES' } as never)).rejects.toBeInstanceOf(ConflictException);
  });

  it('e-mail de outra empresa → 409 (sem vazar a empresa)', async () => {
    const { service } = makeService({
      findById: vi.fn().mockResolvedValue(employee({ id: 'new-emp', email: 'a@x.com' })),
      findUserByEmail: vi.fn().mockResolvedValue({ id: 'u', companyId: 'outra', role: 'RH' }),
    } as never);
    await expect(service.create(COMPANY_A, { name: 'X', email: 'a@x.com', accessEnabled: 'YES' } as never)).rejects.toThrow(/another company/);
  });

  it('funcionário em ONBOARDING nunca ganha acesso ao painel', async () => {
    const onboarding = employee({ id: 'new-emp', status: 'ONBOARDING', userId: 'u1' });
    const { service, repository } = makeService({ create: vi.fn().mockResolvedValue(onboarding), findById: vi.fn().mockResolvedValue(onboarding) } as never);
    await service.create(COMPANY_A, { name: 'X', status: 'ONBOARDING', accessEnabled: 'YES', email: 'a@x.com' } as never);
    expect(repository.createUser).not.toHaveBeenCalled();
    expect(repository.updateUser).toHaveBeenCalledWith(COMPANY_A, 'u1', { isActive: false });
  });
});

describe('QA · consultar, desligar, excluir', () => {
  it('get de id inexistente → 404', async () => {
    const { service } = makeService();
    await expect(service.get(COMPANY_A, actor('RH'), 'nao-existe')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('terminate marca TERMINATED, cria ASO demissional e desativa o login', async () => {
    const target = employee({ id: 'e9', userId: 'u9', status: 'ACTIVE' });
    const { service, repository, aso } = makeService({ findById: vi.fn().mockResolvedValue(target) } as never);
    await service.terminate(COMPANY_A, actor('RH'), 'e9');
    expect(repository.update).toHaveBeenCalledWith(COMPANY_A, 'e9', { status: 'TERMINATED' });
    expect(aso.create).toHaveBeenCalledWith(COMPANY_A, 'user-rh', expect.objectContaining({ asoType: 'DEMISSIONAL' }));
    expect(repository.updateUser).toHaveBeenCalledWith(COMPANY_A, 'u9', { isActive: false, forcePasswordChange: true });
  });

  it('delete com histórico arquiva (não apaga) e bloqueia o acesso', async () => {
    const target = employee({ id: 'e9', userId: 'u9' });
    const { service, repository } = makeService({ findById: vi.fn().mockResolvedValue(target), getDeletionImpact: vi.fn().mockResolvedValue({ total: 4 }) } as never);
    const result = await service.delete(COMPANY_A, actor('RH'), 'e9');
    expect(result).toMatchObject({ deleted: false, archived: true });
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('delete sem histórico remove de vez', async () => {
    const target = employee({ id: 'e9' });
    const { service, repository } = makeService({ findById: vi.fn().mockResolvedValue(target) } as never);
    const result = await service.delete(COMPANY_A, actor('RH'), 'e9');
    expect(result).toMatchObject({ deleted: true, archived: false });
    expect(repository.delete).toHaveBeenCalledWith(COMPANY_A, 'e9');
  });

  it('delete de id inexistente → 404 e nada é apagado', async () => {
    const { service, repository } = makeService();
    await expect(service.delete(COMPANY_A, actor('RH'), 'x')).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('o arquivamento registra a trilha nas observações sem perder o texto anterior', async () => {
    const target = employee({ id: 'e9', observations: 'nota antiga' });
    const { service, repository } = makeService({ findById: vi.fn().mockResolvedValue(target), getDeletionImpact: vi.fn().mockResolvedValue({ total: 1 }) } as never);
    await service.delete(COMPANY_A, actor('RH'), 'e9');
    const note = repository.update.mock.calls[0][2].observations as string;
    expect(note.startsWith('nota antiga\n[')).toBe(true);
    expect(note).toContain('arquivado');
  });
});

describe('QA · acesso ao painel (criar, vincular, desvincular, em lote)', () => {
  it('createAccess cria usuário novo, devolve senha temporária e grava auditoria', async () => {
    const { service, repository } = makeService({ findById: vi.fn().mockResolvedValue(employee({ id: 'e1' })) } as never);
    const result = await service.createAccess(COMPANY_A, actor('RH'), 'e1', { email: '  NOVO@X.com ', role: 'FUNCIONARIO' });
    expect(result).toMatchObject({ success: true, email: 'novo@x.com', role: 'FUNCIONARIO' });
    expect(result.temporaryPassword).toMatch(/^Aa1!/);
    expect(repository.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'USER_CREATED', companyId: COMPANY_A }));
  });

  it('licenças esgotadas → 409 SEAT_LIMIT_REACHED', async () => {
    const { service } = makeService({
      findById: vi.fn().mockResolvedValue(employee({ id: 'e1' })),
      countByCompany: vi.fn().mockResolvedValue(10),
      getCompanyLimits: vi.fn().mockResolvedValue({ subscription: { seatQuantity: 10 } }),
    } as never);
    await expect(service.createAccess(COMPANY_A, actor('RH'), 'e1', { email: 'a@x.com' })).rejects.toThrow(/SEAT_LIMIT_REACHED/);
  });

  it('RH não cria ADMIN; GESTOR/FUNCIONARIO/CONSULTA não criam nada', async () => {
    const { service } = makeService({ findById: vi.fn().mockResolvedValue(employee({ id: 'e1' })) } as never);
    await expect(service.createAccess(COMPANY_A, actor('RH'), 'e1', { email: 'a@x.com', role: 'ADMIN' })).rejects.toBeInstanceOf(ForbiddenException);
    for (const role of ['GESTOR', 'FUNCIONARIO', 'CONSULTA'] as const) {
      await expect(service.createAccess(COMPANY_A, actor(role), 'e1', { email: 'a@x.com', role: 'FUNCIONARIO' })).rejects.toBeInstanceOf(ForbiddenException);
    }
  });

  it('linkAccess recusa usuário inexistente e usuário já vinculado a outro', async () => {
    const base = { findById: vi.fn().mockResolvedValue(employee({ id: 'e1' })) };
    await expect(makeService({ ...base, findUserById: vi.fn().mockResolvedValue(null) } as never).service.linkAccess(COMPANY_A, actor('RH'), 'e1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      makeService({ ...base, findUserById: vi.fn().mockResolvedValue({ id: 'u1' }), findByUserId: vi.fn().mockResolvedValue(employee({ id: 'outro' })) } as never).service.linkAccess(COMPANY_A, actor('RH'), 'e1', 'u1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('unlinkAccess sem vínculo → 409', async () => {
    const { service } = makeService({ findById: vi.fn().mockResolvedValue(employee({ id: 'e1', userId: null })) } as never);
    await expect(service.unlinkAccess(COMPANY_A, actor('RH'), 'e1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('bulk: ação inválida, funcionário inexistente e sem e-mail/vínculo geram erro por item, sem derrubar o lote', async () => {
    const { service } = makeService({
      findById: vi.fn().mockImplementation(async (_c: string, id: string) => (id === 'sem-email' ? employee({ id, email: null }) : id === 'sem-user' ? employee({ id, userId: null }) : null)),
    } as never);
    const out = await service.bulkAccess(COMPANY_A, actor('RH'), { employeeIds: ['nao-existe', 'sem-email'], action: 'create' });
    expect(out.map((r) => r.success)).toEqual([false, false]);
    const noUser = await service.bulkAccess(COMPANY_A, actor('RH'), { employeeIds: ['sem-user'], action: 'block' });
    expect(noUser[0]).toMatchObject({ success: false, error: 'Employee has no linked user' });
    const invalid = await service.bulkAccess(COMPANY_A, actor('RH'), { employeeIds: ['sem-user'], action: 'explode' });
    expect(invalid[0]).toMatchObject({ success: false, error: 'Invalid action' });
  });

  it('bulk com lista vazia devolve lista vazia', async () => {
    const { service } = makeService();
    await expect(service.bulkAccess(COMPANY_A, actor('RH'), { employeeIds: [], action: 'block' })).resolves.toEqual([]);
  });
});

describe('QA · matriz de rotas × perfis (RolesGuard real)', () => {
  const guard = new RolesGuard(new Reflector());
  const proto = EmployeesController.prototype as unknown as Record<string, (...a: never[]) => unknown>;
  const ctx = (handler: unknown, role: string) =>
    ({
      getHandler: () => handler,
      getClass: () => EmployeesController,
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    }) as unknown as ExecutionContext;

  const VIEW = ['DEV', 'CEO', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];
  const WRITE = ['DEV', 'ADMIN', 'RH'];
  const ACCESS = ['DEV', 'CEO', 'ADMIN', 'RH'];
  const DOCS = ['DEV', 'ADMIN', 'RH'];
  const policy: Record<string, string[]> = {
    list: VIEW, dossier: VIEW, get: VIEW, listSwapCandidates: VIEW,
    pointSheetPdf: DOCS, occurrencesPdf: DOCS, employeeRecordPdf: DOCS,
    create: WRITE, update: WRITE, delete: WRITE, terminate: WRITE,
    createAccess: ACCESS, linkAccess: ACCESS, unlinkAccess: ACCESS, bulkAccess: ACCESS,
  };

  for (const [method, allowed] of Object.entries(policy)) {
    for (const role of ROLES) {
      const expected = allowed.includes(role);
      it(`${method} · ${role} ${expected ? 'pode' : 'é barrado'}`, () => {
        const run = () => guard.canActivate(ctx(proto[method], role));
        if (expected) expect(run()).toBe(true);
        else expect(run).toThrow(ForbiddenException);
      });
    }
  }
});
