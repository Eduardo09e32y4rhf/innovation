import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { companyFileKey, decryptForCompany, encryptForCompany, isEncryptedFile, sealFile } from './file-crypto';

const KEY = 'ab'.repeat(32);
const plain = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.from('CPF 123.456.789-09 dado pessoal')]);
const saved = { key: process.env.KMS_MASTER_KEY, env: process.env.NODE_ENV };

beforeEach(() => { process.env.KMS_MASTER_KEY = KEY; });
afterEach(() => {
  if (saved.key === undefined) delete process.env.KMS_MASTER_KEY; else process.env.KMS_MASTER_KEY = saved.key;
  process.env.NODE_ENV = saved.env;
});

describe('criptografia de arquivos em repouso (RS-D-14)', () => {
  it('cifra e decifra; o conteudo em disco nao tem o texto original', () => {
    const sealed = encryptForCompany(plain, 'empresa-1');
    expect(isEncryptedFile(sealed)).toBe(true);
    expect(sealed.includes('dado pessoal')).toBe(false);
    expect(decryptForCompany(sealed, 'empresa-1').equals(plain)).toBe(true);
  });
  it('cada cifragem usa IV novo (mesmo arquivo gera bytes diferentes)', () => {
    expect(encryptForCompany(plain, 'e1').equals(encryptForCompany(plain, 'e1'))).toBe(false);
  });
  it('a chave e derivada por empresa: uma empresa nao abre o arquivo de outra', () => {
    expect(companyFileKey('e1').equals(companyFileKey('e2'))).toBe(false);
    const sealed = encryptForCompany(plain, 'e1');
    expect(() => decryptForCompany(sealed, 'e2')).toThrow(ServiceUnavailableException);
  });
  it('arquivo adulterado e recusado (GCM autentica)', () => {
    const sealed = encryptForCompany(plain, 'e1');
    sealed[sealed.length - 1] ^= 0xff;
    expect(() => decryptForCompany(sealed, 'e1')).toThrow(/integridade/);
  });
  it('arquivo antigo em texto plano continua legivel (leitura de legado)', () => {
    expect(isEncryptedFile(plain)).toBe(false);
    expect(decryptForCompany(plain, 'e1')).toBe(plain);
  });
  it('sem a chave mestra: fora de producao grava plano; em producao recusa', () => {
    delete process.env.KMS_MASTER_KEY;
    process.env.NODE_ENV = 'test';
    expect(sealFile(plain, 'e1')).toEqual({ data: plain, encrypted: false });
    process.env.NODE_ENV = 'production';
    expect(() => sealFile(plain, 'e1')).toThrow(ServiceUnavailableException);
  });
  it('chave mestra malformada nao e aceita', () => {
    process.env.KMS_MASTER_KEY = 'curta';
    expect(() => companyFileKey('e1')).toThrow(ServiceUnavailableException);
  });
});
