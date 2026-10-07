import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it, vi } from 'vitest';
import { CreateEmployeeDto } from '../../../apps/api/src/modules/employees/dto/create-employee.dto';
import { UpdateEmployeeDto } from '../../../apps/api/src/modules/employees/dto/update-employee.dto';
import { actor, check, COMPANY_A, employee, makeService } from './helpers';

// ───────────── ANALISTA DE PRODUTO: o sistema faz o que o RH espera? onde o fluxo quebra? ─────────────

const opts = { whitelist: true, forbidNonWhitelisted: true } as const;
const errorsOf = async (Dto: new () => object, body: Record<string, unknown>) => validate(plainToInstance(Dto as never, body) as object, opts);
const admission = new Date('2024-03-10T00:00:00.000Z');

describe('PRODUTO · editar parcialmente não pode destruir dados (PATCH com um único campo)', () => {
  async function patch(dto: Record<string, unknown>, current: Record<string, unknown> = {}) {
    const existing = employee({ id: 'e1', name: 'Ana Souza', position: 'Analista', department: 'Financeiro', status: 'TERMINATED', admissionDate: admission, ...current });
    const { service, repository } = makeService({ findById: vi.fn().mockResolvedValue(existing) } as never);
    await service.update(COMPANY_A, actor('RH'), 'e1', dto as never);
    return repository.update.mock.calls[0][2] as Record<string, unknown>;
  }

  check('alterar só o telefone não renomeia a pessoa para "Funcionario sem nome"', 'Q-01', async () => {
    const data = await patch({ phone: '11999990000' });
    expect(data.name === undefined || data.name === 'Ana Souza').toBe(true);
  });
  check('alterar só o telefone não troca o cargo por "A definir"', 'Q-01', async () => {
    const data = await patch({ phone: '11999990000' });
    expect(data.position === undefined || data.position === 'Analista').toBe(true);
  });
  check('alterar só o telefone não troca o departamento por "A definir"', 'Q-01', async () => {
    const data = await patch({ phone: '11999990000' });
    expect(data.department === undefined || data.department === 'Financeiro').toBe(true);
  });
  check('alterar só o telefone não reativa um funcionário DESLIGADO (status vira ACTIVE)', 'Q-01', async () => {
    const data = await patch({ phone: '11999990000' });
    expect(data.status === undefined || data.status === 'TERMINATED').toBe(true);
  });
  check('alterar só o telefone não sobrescreve a data de admissão com "hoje"', 'Q-01', async () => {
    const data = await patch({ phone: '11999990000' });
    expect(data.admissionDate === undefined || +new Date(data.admissionDate as Date) === +admission).toBe(true);
  });
  check('alterar só o e-mail também não zera nada (cargo, depto, nome, status, admissão)', 'Q-01', async () => {
    const data = await patch({ email: 'novo@x.com' });
    expect([data.name, data.position, data.department, data.status, data.admissionDate].every((v) => v === undefined || v !== 'Funcionario sem nome' && v !== 'A definir' && v !== 'ACTIVE')).toBe(true);
  });
  it('o cadastro completo (todos os campos enviados) grava exatamente o que foi enviado', async () => {
    const data = await patch({ name: 'Ana Maria', position: 'Gerente', department: 'TI', status: 'ACTIVE', admissionDate: '2020-01-02T00:00:00.000Z' });
    expect(data).toMatchObject({ name: 'Ana Maria', position: 'Gerente', department: 'TI', status: 'ACTIVE' });
    expect((data.admissionDate as Date).toISOString().slice(0, 10)).toBe('2020-01-02');
  });
});

describe('PRODUTO · fluxo de admissão (ONBOARDING)', () => {
  check('editar um funcionário "Em admissão" (status=ONBOARDING) é aceito pela API de edição', 'Q-02', async () => {
    const errors = await errorsOf(UpdateEmployeeDto, { name: 'Em admissão', status: 'ONBOARDING' });
    expect(errors).toHaveLength(0);
  });
  it('criar já aceita ONBOARDING (incoerente com a edição)', async () => {
    expect(await errorsOf(CreateEmployeeDto, { name: 'X', status: 'ONBOARDING' })).toHaveLength(0);
  });
});

describe('PRODUTO · CPF: formatos diferentes são a mesma pessoa', () => {
  check('o cadastro normaliza o CPF para dígitos antes de checar duplicidade e gravar', 'Q-03', async () => {
    const { service, repository } = makeService({ findById: vi.fn().mockResolvedValue(employee()) } as never);
    await service.create(COMPANY_A, { name: 'X', cpf: '529.982.247-25' } as never);
    expect(repository.findByCpf).toHaveBeenCalledWith(expect.anything(), '52998224725');
  });
  check('CPF vazio ("") não é gravado como texto vazio (colide com o próximo cadastro sem CPF)', 'Q-03', async () => {
    const { service, repository } = makeService({ findById: vi.fn().mockResolvedValue(employee()) } as never);
    await service.create(COMPANY_A, { name: 'X', cpf: '' } as never);
    expect(repository.create.mock.calls[0][1].cpf).not.toBe('');
  });
  check('CPF com dígito verificador errado é recusado no cadastro (a importação já recusa)', 'Q-03', async () => {
    expect((await errorsOf(CreateEmployeeDto, { name: 'X', cpf: '123.456.789-00' })).length).toBeGreaterThan(0);
  });
});

describe('PRODUTO · "não consigo criar usuário"', () => {
  check('empresa sem registro de assinatura (contrato manual/legado) não fica travada em 1 licença', 'Q-18', async () => {
    const { service } = makeService({
      findById: vi.fn().mockResolvedValue(employee({ id: 'e1' })),
      countByCompany: vi.fn().mockResolvedValue(1),
      getCompanyLimits: vi.fn().mockResolvedValue({ plan: 'PRO', subscription: null }),
    } as never);
    await expect(service.createAccess(COMPANY_A, actor('RH'), 'e1', { email: 'b@x.com' })).resolves.toMatchObject({ success: true });
  });

  check('empresa não encontrada na consulta de limites mostra erro de empresa, não "limite de licenças"', 'Q-18', async () => {
    const { service } = makeService({ findById: vi.fn().mockResolvedValue(employee({ id: 'e1' })), getCompanyLimits: vi.fn().mockResolvedValue(null) } as never);
    await expect(service.createAccess(COMPANY_A, actor('RH'), 'e1', { email: 'b@x.com' })).rejects.not.toThrow(/SEAT_LIMIT/);
  });

  it('com assinatura de 5 licenças e 4 em uso, o 5º usuário é criado; o 6º não', async () => {
    const make = (used: number) => makeService({
      findById: vi.fn().mockResolvedValue(employee({ id: 'e1' })),
      countByCompany: vi.fn().mockResolvedValue(used),
      getCompanyLimits: vi.fn().mockResolvedValue({ subscription: { seatQuantity: 5 } }),
    } as never).service;
    await expect(make(4).createAccess(COMPANY_A, actor('RH'), 'e1', { email: 'b@x.com' })).resolves.toMatchObject({ success: true });
    await expect(make(5).createAccess(COMPANY_A, actor('RH'), 'e1', { email: 'b@x.com' })).rejects.toThrow(/SEAT_LIMIT/);
  });

  it('reativar usuário já existente da mesma empresa não consome licença nova (e hoje também não a verifica)', async () => {
    const { service, repository } = makeService({
      findById: vi.fn().mockResolvedValue(employee({ id: 'e1', userId: 'u1' })),
      findUserByEmail: vi.fn().mockResolvedValue({ id: 'u1', companyId: COMPANY_A, role: 'FUNCIONARIO' }),
      findByUserId: vi.fn().mockResolvedValue(employee({ id: 'e1' })),
      countByCompany: vi.fn().mockResolvedValue(99),
    } as never);
    await expect(service.createAccess(COMPANY_A, actor('RH'), 'e1', { email: 'a@x.com' })).resolves.toMatchObject({ success: true, temporaryPassword: null });
    expect(repository.countByCompany).not.toHaveBeenCalled();
  });

  check('desbloquear (isActive=true) em lote respeita o limite de licenças', 'S-12', async () => {
    const { service, repository } = makeService({
      findById: vi.fn().mockResolvedValue(employee({ id: 'e1', userId: 'u1', user: { role: 'FUNCIONARIO' } })),
      countByCompany: vi.fn().mockResolvedValue(10),
      getCompanyLimits: vi.fn().mockResolvedValue({ subscription: { seatQuantity: 10 } }),
    } as never);
    const [result] = await service.bulkAccess(COMPANY_A, actor('RH'), { employeeIds: ['e1'], action: 'unblock' });
    expect(result.success).toBe(false);
    expect(repository.updateUser).not.toHaveBeenCalled();
  });
});

describe('PRODUTO · desligamento', () => {
  check('desligar duas vezes não gera dois ASO demissionais', 'Q-04', async () => {
    const { service, aso } = makeService({ findById: vi.fn().mockResolvedValue(employee({ id: 'e1' })) } as never);
    await service.terminate(COMPANY_A, actor('RH'), 'e1');
    await service.terminate(COMPANY_A, actor('RH'), 'e1');
    expect(aso.create).toHaveBeenCalledTimes(1);
  });

  check('desligar via edição (status=TERMINATED) também bloqueia o login do funcionário', 'Q-05', async () => {
    const terminated = employee({ id: 'e1', userId: 'u1', status: 'TERMINATED' });
    const { service, repository } = makeService({ findById: vi.fn().mockResolvedValue(terminated) } as never);
    await service.update(COMPANY_A, actor('RH'), 'e1', { status: 'TERMINATED' } as never);
    expect(repository.updateUser).toHaveBeenCalledWith(COMPANY_A, 'u1', expect.objectContaining({ isActive: false }));
  });

  it('desligar via edição cria o ASO demissional uma única vez', async () => {
    const terminated = employee({ id: 'e1', status: 'TERMINATED' });
    const { service, aso } = makeService({ findById: vi.fn().mockResolvedValue(terminated) } as never);
    await service.update(COMPANY_A, actor('RH'), 'e1', { status: 'TERMINATED' } as never);
    expect(aso.create).toHaveBeenCalledTimes(1);
  });
});

describe('PRODUTO · consistência e atomicidade', () => {
  check('se dar acesso ao painel falha, o cadastro não fica pela metade (e o RH consegue tentar de novo)', 'Q-06', async () => {
    const created = employee({ id: 'new-emp', email: 'a@x.com' });
    const { service, repository } = makeService({
      create: vi.fn().mockResolvedValue(created),
      findById: vi.fn().mockResolvedValue(created),
      findUserByEmail: vi.fn().mockResolvedValue({ id: 'x', companyId: 'outra-empresa', role: 'RH' }),
    } as never);
    await expect(service.create(COMPANY_A, { name: 'X', cpf: '52998224725', email: 'a@x.com', accessEnabled: 'YES' } as never)).rejects.toThrow();
    // Ou nada foi gravado, ou o cadastro foi desfeito.
    const persistedAndKept = repository.create.mock.calls.length > 0 && repository.delete.mock.calls.length === 0;
    expect(persistedAndKept).toBe(false);
  });

  check('listagem de ADMIN com fichas de DEV escondidas ainda devolve a página cheia (50 de 50)', 'Q-19', async () => {
    const rows = Array.from({ length: 50 }, (_, i) => employee({ id: `e${i}`, user: { role: i < 5 ? 'DEV' : 'RH' } }));
    const { service } = makeService({ list: vi.fn().mockResolvedValue(rows) } as never);
    const page = await service.list(COMPANY_A, actor('ADMIN'), 1, 50);
    expect(page).toHaveLength(50);
  });
});

describe('PRODUTO · regras de negócio que o cadastro deveria impor (DTO)', () => {
  const create = (over: Record<string, unknown>) => errorsOf(CreateEmployeeDto, { name: 'Fulano', ...over });

  const mustReject: Array<[string, Record<string, unknown>, string]> = [
    ['salário negativo', { salary: -1000 }, 'Q-07'],
    ['salário absurdo (1e15)', { salary: 1e15 }, 'Q-07'],
    ['nome vazio', { name: '' }, 'Q-08'],
    ['nome só com espaços', { name: '     ' }, 'Q-08'],
    ['nome com 5.000 caracteres', { name: 'A'.repeat(5000) }, 'Q-08'],
    ['data de emissão do RG inválida ("abc")', { rgIssueDate: 'abc' }, 'Q-08'],
    ['validade da CNH inválida ("31/31/9999")', { cnhExpiry: '31/31/9999' }, 'Q-08'],
    ['e-mail com 400 caracteres (o validador de e-mail já barra)', { email: `${'a'.repeat(390)}@x.com` }, ''],
    ['observações com 1 MB', { observations: 'x'.repeat(1_000_000) }, 'Q-08'],
    ['UF com 40 caracteres', { state: 'S'.repeat(40) }, 'Q-08'],
    ['dependentes com 2 MB de JSON', { dependents: `[${'{"nome":"x"},'.repeat(200000)}{}]` }, 'Q-08'],
  ];
  for (const [label, body, bug] of mustReject) {
    check(`rejeita ${label}`, bug, async () => {
      expect((await create(body)).length).toBeGreaterThan(0);
    });
  }

  const mustAccept: Array<[string, Record<string, unknown>]> = [
    ['nome com acento e apóstrofo', { name: "D'Ávila José" }],
    ['e-mail simples', { email: 'a@b.co' }],
    ['horário 23:59', { standardEntry: '23:59' }],
    ['jornada 12x36', { workScale: '12X36' }],
    ['status SUSPENDED', { status: 'SUSPENDED' }],
    ['contrato PJ', { contractType: 'PJ' }],
    ['salário com centavos', { salary: 1234.56 }],
    ['gestor com UUID', { managerId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' }],
  ];
  for (const [label, body] of mustAccept) {
    it(`aceita ${label}`, async () => {
      expect(await create(body)).toHaveLength(0);
    });
  }

  const mustRejectTypes: Array<[string, Record<string, unknown>]> = [
    ['horário 24:00', { standardEntry: '24:00' }],
    ['horário 7:5', { standardEntry: '7:5' }],
    ['status inexistente', { status: 'FERIAS' }],
    ['jornada 5x3', { workScale: '5X3' }],
    ['gestor que não é UUID', { managerId: 'meu-chefe' }],
    ['e-mail sem domínio', { email: 'fulano@' }],
    ['salário textual', { salary: 'muito' }],
    ['pisFirstJob textual', { pisFirstJob: 'sim' }],
  ];
  for (const [label, body] of mustRejectTypes) {
    it(`rejeita ${label}`, async () => {
      expect((await create(body)).length).toBeGreaterThan(0);
    });
  }

  check('gestor do funcionário não pode ser ele mesmo, nem alguém de outra empresa', 'Q-20', async () => {
    const { service, repository } = makeService({ findById: vi.fn().mockResolvedValue(employee({ id: 'e1' })) } as never);
    await service.update(COMPANY_A, actor('RH'), 'e1', { managerId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' } as never).catch(() => undefined);
    const lookups = repository.findById.mock.calls.filter((call) => call[1] === '3f2504e0-4f89-41d3-9a0c-0305e82c3301');
    expect(lookups.length).toBeGreaterThan(0);
  });

  check('data de desligamento anterior à admissão é recusada', 'Q-21', async () => {
    const { service } = makeService({ findById: vi.fn().mockResolvedValue(employee({ id: 'e1' })) } as never);
    await expect(service.update(COMPANY_A, actor('RH'), 'e1', { status: 'TERMINATED', admissionDate: '2025-06-01', terminationDate: '2020-01-01' } as never)).rejects.toThrow();
  });
});

describe('PRODUTO · trilha de auditoria de ações sensíveis', () => {
  const sensitive = [
    ['redefinir senha em lote', (s: ReturnType<typeof makeService>) => s.service.bulkAccess(COMPANY_A, actor('RH'), { employeeIds: ['e1'], action: 'reset-password' })],
    ['bloquear acesso em lote', (s: ReturnType<typeof makeService>) => s.service.bulkAccess(COMPANY_A, actor('RH'), { employeeIds: ['e1'], action: 'block' })],
    ['trocar perfil em lote', (s: ReturnType<typeof makeService>) => s.service.bulkAccess(COMPANY_A, actor('RH'), { employeeIds: ['e1'], action: 'set-role', role: 'GESTOR' })],
    ['desligar funcionário', (s: ReturnType<typeof makeService>) => s.service.terminate(COMPANY_A, actor('RH'), 'e1')],
    ['excluir funcionário', (s: ReturnType<typeof makeService>) => s.service.delete(COMPANY_A, actor('RH'), 'e1')],
    ['desvincular acesso', (s: ReturnType<typeof makeService>) => s.service.unlinkAccess(COMPANY_A, actor('RH'), 'e1')],
  ] as const;

  for (const [label, run] of sensitive) {
    check(`${label} grava registro de auditoria (quem fez, em quem, quando)`, 'S-13', async () => {
      const ctx = makeService({ findById: vi.fn().mockResolvedValue(employee({ id: 'e1', userId: 'u1', user: { role: 'FUNCIONARIO' } })) } as never);
      await run(ctx);
      expect(ctx.repository.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ companyId: COMPANY_A, userId: 'user-rh' }));
    });
  }
});
