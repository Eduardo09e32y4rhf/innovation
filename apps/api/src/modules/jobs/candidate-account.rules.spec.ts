import { describe, expect, it } from 'vitest';
import {
  admissionPrefill, funnelCount, generateLoginCode, hashSecret, highestEducation, isEmail, isValidCpf, profileCompleteness, safeEqualHex, sanitizeEducation,
} from './candidate-account.rules';

describe('CPF', () => {
  it('aceita CPF válido com ou sem máscara', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
  });
  it('recusa dígito errado, sequência repetida e tamanho errado', () => {
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('123')).toBe(false);
    expect(isValidCpf(undefined)).toBe(false);
  });
});

describe('login por código', () => {
  it('gera 6 dígitos e o hash confere sem expor o código', () => {
    const code = generateLoginCode();
    expect(code).toMatch(/^\d{6}$/);
    expect(hashSecret(code)).not.toContain(code);
    expect(safeEqualHex(hashSecret(code), hashSecret(code))).toBe(true);
    expect(safeEqualHex(hashSecret(code), hashSecret('000000' === code ? '111111' : '000000'))).toBe(false);
    expect(safeEqualHex('zz', 'zz')).toBe(false);
  });
  it('valida e-mail', () => {
    expect(isEmail('camila@exemplo.com')).toBe(true);
    expect(isEmail('camila@')).toBe(false);
  });
});

describe('funil público', () => {
  it('esconde o número real abaixo de 5', () => {
    expect(funnelCount(4)).toEqual({ count: null, label: 'menos de 5' });
    expect(funnelCount(0)).toEqual({ count: null, label: 'menos de 5' });
    expect(funnelCount(5)).toEqual({ count: 5, label: '5' });
    expect(funnelCount(48)).toEqual({ count: 48, label: '48' });
  });
});

describe('formação', () => {
  it('limpa itens inválidos e limita a quantidade', () => {
    const items = sanitizeEducation([{ level: 'Superior', status: 'Cursando', course: ' Direito ', school: 'USP', extra: 'x' }, { level: 'hack', status: '??' }, 'lixo']);
    expect(items[0]).toEqual({ level: 'Superior', status: 'Cursando', course: 'Direito', school: 'USP' });
    expect(items[1]).toEqual({ level: 'Ensino médio', status: 'Completo', course: '', school: '' });
    expect(sanitizeEducation(Array.from({ length: 20 }, () => ({}))).length).toBe(8);
    expect(sanitizeEducation('nada')).toEqual([]);
  });
  it('escolhe o maior nível concluído para o cadastro de funcionário', () => {
    expect(highestEducation(sanitizeEducation([{ level: 'Ensino médio', status: 'Completo' }, { level: 'Superior', status: 'Completo' }]))).toBe('Superior');
    expect(highestEducation(sanitizeEducation([{ level: 'Ensino médio', status: 'Completo' }, { level: 'Superior', status: 'Cursando' }]))).toBe('Ensino médio');
    expect(highestEducation([])).toBeNull();
  });
});

describe('perfil mínimo', () => {
  it('calcula o que falta', () => {
    const empty = profileCompleteness({});
    expect(empty.percent).toBe(0);
    expect(empty.complete).toBe(false);
    const full = profileCompleteness({
      name: 'Camila Duarte', cpf: '52998224725', phone: '(11) 91234-5678', cep: '06000-000', street: 'Rua A', streetNumber: '10', neighborhood: 'Centro', city: 'Osasco', state: 'SP',
      education: [{ level: 'Ensino médio', status: 'Completo' }], resumeKey: 'x/y.pdf',
    });
    expect(full).toEqual({ percent: 100, missing: [], complete: true });
    expect(profileCompleteness({ name: 'A', cpf: '123' }).missing).toContain('CPF');
  });
});

describe('pré-preenchimento na admissão', () => {
  it('sem conta, não preenche nada', () => {
    expect(admissionPrefill(null)).toEqual({});
  });
  it('usa só o que o candidato informou e formata o CPF', () => {
    const data: any = admissionPrefill({ cpf: '52998224725', cep: '06000-000', street: ' Rua A ', city: 'Osasco', state: 'sp', education: [{ level: 'Superior', status: 'Completo' }] });
    expect(data.cpfDigits).toBe('52998224725');
    expect(data.cpfMasked).toBe('529.982.247-25');
    expect(data.secondaryData).toMatchObject({ cep: '06000000', street: 'Rua A', city: 'Osasco', state: 'SP', education: 'Superior' });
    expect(data.secondaryData.neighborhood).toBeUndefined();
  });
  it('CPF inválido não vai para o funcionário', () => {
    const data: any = admissionPrefill({ cpf: '123' });
    expect(data.cpfDigits).toBeUndefined();
  });
});
