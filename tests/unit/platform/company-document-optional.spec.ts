import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { isCompanyDocumentOptional, normalizeCompanyDocument } from '../../../apps/api/src/common/company-document';
import { RegisterCompanyDto } from '../../../apps/api/src/modules/auth/dto/register-company.dto';

const base = {
  companyName: 'ROBO-QA Empresa',
  name: 'Admin Teste',
  email: 'admin@example.com',
  password: 'Senha#Forte123',
  planId: '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
  seatQuantity: 3,
};

const erros = async (corpo: Record<string, unknown>) => (await validate(plainToInstance(RegisterCompanyDto, corpo))).map((e) => e.property);

describe('CPF/CNPJ opcional no cadastro de empresa (ambiente de teste do robô)', () => {
  const original = process.env.COMPANY_DOCUMENT_OPTIONAL;
  beforeEach(() => { delete process.env.COMPANY_DOCUMENT_OPTIONAL; });
  afterEach(() => { if (original === undefined) delete process.env.COMPANY_DOCUMENT_OPTIONAL; else process.env.COMPANY_DOCUMENT_OPTIONAL = original; });

  it('só liga com COMPANY_DOCUMENT_OPTIONAL=true (qualquer outro valor mantém a validação)', () => {
    expect(isCompanyDocumentOptional({})).toBe(false);
    for (const valor of ['false', '1', 'on', 'TRUE', '']) expect(isCompanyDocumentOptional({ COMPANY_DOCUMENT_OPTIONAL: valor })).toBe(false);
    expect(isCompanyDocumentOptional({ COMPANY_DOCUMENT_OPTIONAL: 'true' })).toBe(true);
  });

  it('padrão: documento ausente ou fora do formato continua recusado', async () => {
    expect(await erros(base)).toContain('document');
    expect(await erros({ ...base, document: '123' })).toContain('document');
    expect(await erros({ ...base, document: '52998224725' })).not.toContain('document');
  });

  it('com a chave ligada: aceita sem documento e sem validar o formato', async () => {
    process.env.COMPANY_DOCUMENT_OPTIONAL = 'true';
    expect(await erros(base)).toEqual([]);
    expect(await erros({ ...base, document: '123' })).toEqual([]);
  });

  it('com a chave ligada, o resto do cadastro continua validado', async () => {
    process.env.COMPANY_DOCUMENT_OPTIONAL = 'true';
    const lista = await erros({ ...base, email: 'nao-e-email', password: 'fraca' });
    expect(lista).toEqual(expect.arrayContaining(['email', 'password']));
    expect(lista).not.toContain('document');
  });

  it('normaliza: só dígitos; vazio vira null (coluna opcional e única)', () => {
    expect(normalizeCompanyDocument('52.998.224/725-0')).toBe('529982247250');
    expect(normalizeCompanyDocument('')).toBeNull();
    expect(normalizeCompanyDocument('  ')).toBeNull();
    expect(normalizeCompanyDocument(undefined)).toBeNull();
    expect(normalizeCompanyDocument(null)).toBeNull();
  });
});
