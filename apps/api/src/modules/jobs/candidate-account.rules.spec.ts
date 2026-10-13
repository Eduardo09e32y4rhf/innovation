import { describe, expect, it } from 'vitest';
import {
  admissionPrefill, funnelCount, generateLoginCode, hashSecret, highestEducation, isEmail, isValidCpf, profileCompleteness, safeEqualHex, sanitizeEducation, hashPassword, verifyPassword, passwordProblem, parseBirthDate, sanitizeSkills, talentCard,
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

describe('senha', () => {
  it('guarda com sal (dois hashes diferentes) e confere', () => {
    const a = hashPassword('segredo123'); const b = hashPassword('segredo123');
    expect(a).not.toBe(b);
    expect(verifyPassword('segredo123', a)).toBe(true);
    expect(verifyPassword('segredo124', a)).toBe(false);
    expect(verifyPassword('x', null)).toBe(false);
    expect(verifyPassword('x', 'lixo')).toBe(false);
  });
  it('exige 8+ caracteres com letras e números', () => {
    expect(passwordProblem('abc12')).toMatch(/pelo menos 8/);
    expect(passwordProblem('somenteletras')).toMatch(/letras e números/);
    expect(passwordProblem('12345678')).toMatch(/letras e números/);
    expect(passwordProblem('segredo123')).toBeNull();
  });
});

describe('perfil profissional', () => {
  const now = new Date(Date.UTC(2026, 9, 13));
  it('data de nascimento: válida, existente, passada e 14+ anos', () => {
    expect(parseBirthDate('1990-05-17', now)?.toISOString().slice(0, 10)).toBe('1990-05-17');
    expect(parseBirthDate('', now)).toBeNull();
    expect(parseBirthDate('1990-02-31', now)).toBeUndefined();
    expect(parseBirthDate('17/05/1990', now)).toBeUndefined();
    expect(parseBirthDate('2020-01-01', now)).toBeUndefined();
    expect(parseBirthDate('1899-01-01', now)).toBeUndefined();
  });
  it('conhecimentos: sem repetidos, sem vazios, no máximo 15', () => {
    expect(sanitizeSkills([' SPED ', 'sped', '', 'Excel'])).toEqual(['SPED', 'Excel']);
    expect(sanitizeSkills(Array.from({ length: 30 }, (_, i) => `s${i}`))).toHaveLength(15);
    expect(sanitizeSkills('x')).toEqual([]);
  });
  it('cartão do banco de talentos não traz CPF, contato, rua nem nascimento exato', () => {
    const card = talentCard({ id: 'a', name: 'Camila', cpf: '52998224725', phone: '11999999999', street: 'Rua X', birthDate: new Date(Date.UTC(1990, 5, 1)), city: 'Osasco', hasDriverLicense: false, driverLicenseCategory: 'B', resumeKey: 'k' }, now);
    expect(card).toMatchObject({ age: 36, city: 'Osasco', driverLicenseCategory: null, hasResume: true });
    expect(JSON.stringify(card)).not.toMatch(/52998224725|11999999999|Rua X|1990/);
  });
});
