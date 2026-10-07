import 'reflect-metadata';
import fs from 'node:fs';
import path from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EmployeesImportService } from '../../../apps/api/src/modules/employees/employees-import.service';
import { check, cpfFromBase, COMPANY_A, prng, VALID_CPF } from './helpers';

// ───────────── Importação de planilha (CSV/XLSX): QA + hacker na mesma superfície ─────────────

const HEADER = 'Nome,CPF,E-mail,Departamento,Cargo,Data de admissão,Matrícula,Telefone,Perfil de acesso,Criar acesso';
const row = (over: Partial<Record<string, string>> = {}) => {
  const v = { nome: 'Maria Silva', cpf: VALID_CPF, email: 'maria@x.com', dep: 'RH', cargo: 'Analista', data: '01/02/2026', mat: '', tel: '', perfil: '', acesso: '', ...over };
  return [v.nome, v.cpf, v.email, v.dep, v.cargo, v.data, v.mat, v.tel, v.perfil, v.acesso].join(',');
};
const csv = (...rows: string[]) => Buffer.from([HEADER, ...rows].join('\n'), 'utf8');
const file = (buffer: Buffer, filename = 'funcionarios.csv') => ({ filename, mimetype: 'text/csv', buffer });

function makeImport() {
  const created: Array<Record<string, unknown>> = [];
  const store = new Map<string, unknown>();
  const cache = {
    set: vi.fn(async (key: string, value: unknown) => { store.set(key, value); }),
    get: vi.fn(async (key: string) => store.get(key)),
    del: vi.fn(async (key: string) => { store.delete(key); }),
  };
  const tx = {
    employee: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { const e = { id: `e${created.length + 1}`, ...data }; created.push(e); return e; }), update: vi.fn().mockResolvedValue({}) },
    employeeAsoRecord: { create: vi.fn().mockResolvedValue({}) },
    user: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: `u-${data.email}`, ...data })) },
    temporaryCredential: { create: vi.fn().mockResolvedValue({}) },
  };
  const prisma = {
    employee: { findMany: vi.fn().mockResolvedValue([]) },
    company: { findUnique: vi.fn().mockResolvedValue({ subscription: { seatQuantity: 3 } }) },
    user: { count: vi.fn().mockResolvedValue(0) },
    $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const service = new EmployeesImportService(prisma as never, cache as never);
  return { service, prisma, cache, tx, created, store };
}

const errorsOf = async (buffer: Buffer, filename?: string) => {
  const { service } = makeImport();
  return (await service.validate(COMPANY_A, file(buffer, filename))).errors;
};

describe('Importação · modelo e validação básica', () => {
  it('o modelo .xlsx baixado é um zip válido (assinatura PK)', async () => {
    const buffer = await makeImport().service.generateTemplate();
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  it('linha correta → válida, com prévia e token guardado para a empresa', async () => {
    const { service, cache } = makeImport();
    const result = await service.validate(COMPANY_A, file(csv(row())));
    expect(result).toMatchObject({ valid: true, totalRows: 1, validRows: 1, invalidRows: 0 });
    expect(result.importToken).toMatch(/^[0-9a-f-]{36}$/);
    expect(cache.set).toHaveBeenCalledWith(`employees-import:${result.importToken}`, expect.objectContaining({ companyId: COMPANY_A }), expect.any(Number));
  });

  const required: Array<[string, Partial<Record<string, string>>]> = [
    ['Nome', { nome: '' }], ['CPF', { cpf: '' }], ['Departamento', { dep: '' }], ['Cargo', { cargo: '' }], ['Data de admissão', { data: '' }],
  ];
  for (const [column, over] of required) {
    it(`campo obrigatório vazio (${column}) gera erro na coluna certa e na linha 2`, async () => {
      const errors = await errorsOf(csv(row(over)));
      expect(errors).toContainEqual(expect.objectContaining({ row: 2, column }));
    });
  }

  const badCpfs = ['', '123', '12345678900', '00000000000', '11111111111', '99999999999', '1234567890a', '5299822472', '529982247250', '52998224724', 'abcdefghijk', '      '];
  for (const cpf of badCpfs) {
    it(`CPF inválido recusado: ${JSON.stringify(cpf)}`, async () => {
      const errors = await errorsOf(csv(row({ cpf })));
      expect(errors.some((e) => e.column === 'CPF')).toBe(true);
    });
  }

  for (const cpf of ['529.982.247-25x', '5299822472 5', 'CPF 529.982.247-25', '52998224725abc']) {
    check(`CPF com letras/lixo no meio não é "limpo" e aceito: ${JSON.stringify(cpf)}`, 'Q-16', async () => {
      expect((await errorsOf(csv(row({ cpf: `"${cpf}"` })))).some((e) => e.column === 'CPF')).toBe(true);
    });
  }

  it('CPF com pontos e traço é aceito e normalizado para dígitos', async () => {
    const formatted = `${VALID_CPF.slice(0, 3)}.${VALID_CPF.slice(3, 6)}.${VALID_CPF.slice(6, 9)}-${VALID_CPF.slice(9)}`;
    const { service } = makeImport();
    const result = await service.validate(COMPANY_A, file(csv(row({ cpf: `"${formatted}"` }))));
    expect(result.valid).toBe(true);
    expect(result.preview[0]).toMatchObject({ cpf: VALID_CPF });
  });

  const badDates = ['31/02/2026', '00/01/2026', '32/01/2026', '29/02/2025', '2026-02-01', '1/2/2026', '01-02-2026', '99/99/9999', '01/13/2026', 'ontem', '45123'];
  for (const data of badDates) {
    it(`data de admissão inválida recusada: ${JSON.stringify(data)}`, async () => {
      expect((await errorsOf(csv(row({ data })))).some((e) => e.column === 'Data de admissão')).toBe(true);
    });
  }

  it('29/02 de ano bissexto é aceito', async () => {
    expect((await errorsOf(csv(row({ data: '29/02/2024' })))).length).toBe(0);
  });

  const badEmails = ['sem-arroba', 'a@', '@b.com', 'a b@c.com', 'a@b', 'a@@b.com'];
  for (const email of badEmails) {
    it(`e-mail inválido recusado: ${JSON.stringify(email)}`, async () => {
      expect((await errorsOf(csv(row({ email })))).some((e) => e.column === 'E-mail')).toBe(true);
    });
  }

  it('CPF e matrícula repetidos dentro do arquivo apontam a primeira ocorrência', async () => {
    const other = cpfFromBase('111444777');
    const errors = await errorsOf(csv(row({ mat: 'A1' }), row({ mat: 'a1', cpf: other })));
    const dup = await errorsOf(csv(row(), row({ nome: 'Outro' })));
    expect(errors.some((e) => e.column === 'Matrícula' && /linha 2/.test(e.message))).toBe(true);
    expect(dup.some((e) => e.column === 'CPF' && /linha 2/.test(e.message))).toBe(true);
  });

  it('CPF que já existe NA MESMA empresa é recusado', async () => {
    const { service, prisma } = makeImport();
    prisma.employee.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ cpf: VALID_CPF, registration: null }]);
    const result = await service.validate(COMPANY_A, file(csv(row())));
    expect(result.errors.some((e) => /nesta empresa/.test(e.message))).toBe(true);
  });
});

describe('Importação · arquivo (uso errado de propósito)', () => {
  const ok = csv(row());
  const names = ['a.xls', 'a.xlsm', 'a.exe', 'a.txt', 'a', 'a.csv.exe', 'a.pdf', 'a.CSV.php', '.csv.', 'a.xlsx.exe', '../../a.sh', 'a.csv%00.exe'];
  for (const filename of names) {
    it(`extensão proibida recusada: ${filename}`, async () => {
      await expect(makeImport().service.validate(COMPANY_A, file(ok, filename))).rejects.toBeInstanceOf(BadRequestException);
    });
  }

  it('arquivo vazio e arquivo > 2 MB são recusados', async () => {
    const { service } = makeImport();
    await expect(service.validate(COMPANY_A, file(Buffer.alloc(0)))).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.validate(COMPANY_A, file(Buffer.alloc(2 * 1024 * 1024 + 1, 'a')))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('.xlsx sem a assinatura de zip é recusado (renomeou um .exe/.txt)', async () => {
    await expect(makeImport().service.validate(COMPANY_A, file(Buffer.from('MZ\x90\x00 não sou zip'), 'x.xlsx'))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('.xlsx com assinatura de zip mas conteúdo corrompido responde 400, não 500', async () => {
    await expect(makeImport().service.validate(COMPANY_A, file(Buffer.concat([Buffer.from('PK'), Buffer.from('lixo'.repeat(50))]), 'x.xlsx'))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('2.000 linhas passam; 2.001 são recusadas', async () => {
    const rows = (n: number) => Array.from({ length: n }, (_, i) => row({ nome: `P ${i}`, cpf: cpfFromBase(String(100000000 + i)) }));
    const { service } = makeImport();
    await expect(service.validate(COMPANY_A, file(csv(...rows(2000))))).resolves.toMatchObject({ totalRows: 2000 });
    await expect(service.validate(COMPANY_A, file(csv(...rows(2001))))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('só cabeçalho e só linhas em branco → "planilha vazia"', async () => {
    const { service } = makeImport();
    await expect(service.validate(COMPANY_A, file(Buffer.from(HEADER)))).rejects.toThrow(/vazia/);
    await expect(service.validate(COMPANY_A, file(Buffer.from(`${HEADER}\n,,,,,\n   \n`)))).rejects.toThrow(/vazia/);
  });

  it('aceita ; como separador, CRLF e campo entre aspas com vírgula', async () => {
    const line = `"Silva, Maria";${VALID_CPF};m@x.com;RH;Analista;01/02/2026;;;;`;
    const buffer = Buffer.from(`${HEADER.replace(/,/g, ';')}\r\n${line}\r\n`);
    const result = await makeImport().service.validate(COMPANY_A, file(buffer));
    expect(result.valid).toBe(true);
    expect(result.preview[0]).toMatchObject({ name: 'Silva, Maria' });
  });

  check('CSV salvo em Windows-1252 (padrão do Excel BR) mantém os acentos ("José", "João")', 'Q-09', async () => {
    const buffer = Buffer.from(`${HEADER}\n${row({ nome: 'José João Conceição' })}`, 'latin1');
    const result = await makeImport().service.validate(COMPANY_A, file(buffer));
    expect(result.preview[0]).toMatchObject({ name: 'José João Conceição' });
  });

  check('campo entre aspas com quebra de linha é lido como um único campo', 'Q-10', async () => {
    const buffer = Buffer.from(`${HEADER}\n"Maria\nSilva",${VALID_CPF},m@x.com,RH,Analista,01/02/2026,,,,`);
    const result = await makeImport().service.validate(COMPANY_A, file(buffer));
    expect(result.valid).toBe(true);
  });

  check('cabeçalho sem a coluna CPF devolve mensagem de cabeçalho, não um erro por linha', 'Q-15', async () => {
    const buffer = Buffer.from(`Nome,Departamento,Cargo,Data de admissão\nMaria,RH,Analista,01/02/2026`);
    const errors = (await makeImport().service.validate(COMPANY_A, file(buffer))).errors;
    expect(errors.some((e) => /cabe[çc]alho|coluna/i.test(e.message))).toBe(true);
  });
});

describe('HACKER · injeção em planilha (CSV/Excel injection)', () => {
  const payloads = ['=HYPERLINK("http://evil.test","clique")', '+cmd|\' /C calc\'!A0', '-2+3', '@SUM(1+1)', '\t=1+1', '\r=1+1', '=cmd|\' /C calc\'!A0'];
  payloads.forEach((payload, index) => {
    check(`nome começando com fórmula é neutralizado (#${index}: ${JSON.stringify(payload).slice(0, 24)})`, 'S-07', async () => {
      const safe = payload.replace(/,/g, ';').replace(/\r/g, '').replace(/\n/g, '');
      const result = await makeImport().service.validate(COMPANY_A, file(csv(row({ nome: `"${safe}"` }))));
      const name = String((result.preview[0] as { name?: string } | undefined)?.name ?? '');
      expect(/^[=+\-@\t\r]/.test(name)).toBe(false);
    });
  });

  check('mensagem de erro não revela que o CPF existe em OUTRA empresa (privacidade/LGPD)', 'S-02', async () => {
    const { service, prisma } = makeImport();
    prisma.employee.findMany.mockResolvedValueOnce([{ cpf: VALID_CPF }]).mockResolvedValueOnce([]);
    const result = await service.validate(COMPANY_A, file(csv(row())));
    expect(JSON.stringify(result.errors)).not.toMatch(/outra empresa/i);
  });
});

describe('Importação · confirmar', () => {
  async function prepared(rows: string[], configure?: (ctx: ReturnType<typeof makeImport>) => void) {
    const ctx = makeImport();
    configure?.(ctx);
    const validation = await ctx.service.validate(COMPANY_A, file(csv(...rows)));
    return { ...ctx, token: validation.importToken as string };
  }

  it('token inexistente, de outra empresa ou já usado → 400', async () => {
    const { service, token } = await prepared([row()]);
    await expect(service.confirm(COMPANY_A, 'u1', 'token-falso')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.confirm('company-b', 'u1', token)).rejects.toBeInstanceOf(BadRequestException);
    await service.confirm(COMPANY_A, 'u1', token);
    await expect(service.confirm(COMPANY_A, 'u1', token)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cria funcionário ACTIVE + ASO admissional pendente e apaga o token', async () => {
    const { service, token, tx, cache } = await prepared([row()]);
    const out = await service.confirm(COMPANY_A, 'u1', token);
    expect(out.imported).toBe(1);
    expect(tx.employee.create).toHaveBeenCalledWith({ data: expect.objectContaining({ companyId: COMPANY_A, status: 'ACTIVE', cpf: VALID_CPF }) });
    expect(tx.employeeAsoRecord.create).toHaveBeenCalledWith({ data: expect.objectContaining({ asoType: 'ADMISSIONAL', status: 'PENDING' }) });
    expect(cache.del).toHaveBeenCalled();
  });

  it('Criar acesso = SIM cria usuário, credencial temporária e vincula', async () => {
    const { service, token, tx } = await prepared([row({ acesso: 'SIM', perfil: 'GESTOR' })]);
    const out = await service.confirm(COMPANY_A, 'u1', token);
    expect(tx.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ role: 'GESTOR', forcePasswordChange: true }) });
    expect(tx.temporaryCredential.create).toHaveBeenCalled();
    expect(out.results[0]).toMatchObject({ success: true, temporaryPassword: expect.stringMatching(/^Aa1!/) });
  });

  check('e-mail que já tem usuário: NÃO devolve uma senha temporária que não funciona', 'Q-11', async () => {
    const { service, token } = await prepared([row({ acesso: 'SIM' })], ({ tx }) => tx.user.findUnique.mockResolvedValue({ id: 'u-antigo', companyId: COMPANY_A }));
    const out = await service.confirm(COMPANY_A, 'u1', token);
    expect((out.results[0] as { temporaryPassword?: string }).temporaryPassword).toBeUndefined();
  });

  check('planilha não consegue criar administrador (Perfil de acesso = ADMIN) sem checar quem importa', 'S-01', async () => {
    const { service, token, tx } = await prepared([row({ acesso: 'SIM', perfil: 'ADMIN' })]);
    await service.confirm(COMPANY_A, 'u-rh', token);
    expect(tx.user.create).not.toHaveBeenCalledWith({ data: expect.objectContaining({ role: 'ADMIN' }) });
  });

  check('importar 50 pessoas com acesso respeita o limite de licenças contratadas (3)', 'S-11', async () => {
    const rows = Array.from({ length: 50 }, (_, i) => row({ nome: `P ${i}`, cpf: cpfFromBase(String(200000000 + i)), email: `p${i}@x.com`, acesso: 'SIM' }));
    const { service, token, tx } = await prepared(rows);
    await service.confirm(COMPANY_A, 'u1', token);
    expect(tx.user.create.mock.calls.length).toBeLessThanOrEqual(3);
  }, 60000);

  check('confirmar duas vezes ao mesmo tempo (duplo clique) importa uma única vez', 'Q-12', async () => {
    const { service, token, tx } = await prepared([row()]);
    await Promise.allSettled([service.confirm(COMPANY_A, 'u1', token), service.confirm(COMPANY_A, 'u1', token)]);
    expect(tx.employee.create).toHaveBeenCalledTimes(1);
  });

  check('uma linha que falha dentro da transação não pode "importar" as demais só no relatório (Postgres aborta a transação)', 'Q-14', async () => {
    // Simula o Postgres: depois do primeiro erro, a transação fica abortada e o COMMIT vira ROLLBACK silencioso.
    const ctx = makeImport();
    let aborted = false;
    let persisted = 0;
    ctx.tx.employee.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      if (aborted) throw new Error('current transaction is aborted, commands ignored until end of transaction block');
      if (data.name === 'Duplicada') { aborted = true; throw new Error('Unique constraint failed on cpf'); }
      persisted += 1;
      return { id: `e${persisted}`, ...data };
    });
    ctx.prisma.$transaction.mockImplementation(async (fn: (t: typeof ctx.tx) => Promise<unknown>) => {
      const result = await fn(ctx.tx);
      if (aborted) persisted = 0; // rollback
      return result;
    });
    const validation = await ctx.service.validate(COMPANY_A, file(csv(
      row({ nome: 'Primeira' }), row({ nome: 'Duplicada', cpf: cpfFromBase('111444777') }), row({ nome: 'Terceira', cpf: cpfFromBase('222333444') }),
    )));
    const out = await ctx.service.confirm(COMPANY_A, 'u1', validation.importToken as string);
    expect(out.imported).toBe(persisted);
  });

  check('a transação de importação tem timeout explícito (padrão do Prisma é 5 s e cada senha leva ~250 ms)', 'Q-13', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../../apps/api/src/modules/employees/employees-import.service.ts'), 'utf8');
    expect(/\$transaction\([\s\S]*?\}\s*,\s*\{[^}]*timeout/.test(source)).toBe(true);
  });
});

describe('Importação · sorteio determinístico de linhas (robustez)', () => {
  it('300 linhas aleatórias com mistura de válidas e inválidas: contagem de erros coerente e nenhum crash', async () => {
    const rnd = prng(20261004);
    const lines: string[] = [];
    let expectedInvalid = 0;
    for (let i = 0; i < 300; i++) {
      const bad = rnd() < 0.4;
      if (bad) expectedInvalid += 1;
      lines.push(row({ nome: `Pessoa ${i}`, cpf: bad ? String(Math.floor(rnd() * 1e11)).padStart(11, '1').slice(0, 10) : cpfFromBase(String(300000000 + i)), mat: `M${i}` }));
    }
    const { service } = makeImport();
    const result = await service.validate(COMPANY_A, file(csv(...lines)));
    expect(result.totalRows).toBe(300);
    expect(result.invalidRows).toBe(expectedInvalid);
  });

  // Defeito Q-17: o filtro de linhas válidas usa o índice do array já compactado como se fosse o número da linha.
  check('nenhuma linha válida é descartada quando existem linhas inválidas (300 linhas, ~35% inválidas)', 'Q-17', async () => {
    const rnd = prng(20261004);
    const lines: string[] = [];
    let bad = 0;
    for (let i = 0; i < 300; i++) {
      const isBad = rnd() < 0.4;
      if (isBad) bad += 1;
      lines.push(row({ nome: `Pessoa ${i}`, cpf: isBad ? '123' : cpfFromBase(String(300000000 + i)), mat: `M${i}` }));
    }
    const result = await makeImport().service.validate(COMPANY_A, file(csv(...lines)));
    expect(result.validRows).toBe(300 - bad);
  });

  check('repro mínima: [CPF inválido, Ana, Bruno] deve importar Ana e Bruno', 'Q-17', async () => {
    const result = await makeImport().service.validate(COMPANY_A, file(csv(
      row({ nome: 'Quebrada', cpf: '123' }),
      row({ nome: 'Ana', cpf: cpfFromBase('111444777') }),
      row({ nome: 'Bruno', cpf: cpfFromBase('222333444') }),
    )));
    expect(result.validRows).toBe(2);
  });
});
