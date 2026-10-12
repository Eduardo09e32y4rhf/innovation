import { describe, expect, it } from 'vitest';
import { clampRetention, isExpiredForDeletion, parsePcd, phoneKey, pickOption, retentionDate, GENDER_OPTIONS } from './recruitment-privacy';
import { applicationRejectedEmail } from './recruitment-mails';

describe('retenção LGPD', () => {
  it('limita o prazo entre 3 e 60 meses e usa 12 como padrão', () => {
    expect(clampRetention(1)).toBe(3);
    expect(clampRetention(999)).toBe(60);
    expect(clampRetention('abc')).toBe(12);
    expect(clampRetention(24)).toBe(24);
  });
  it('calcula a data limite', () => {
    expect(retentionDate(12, new Date('2026-01-15T00:00:00Z')).toISOString().slice(0, 10)).toBe('2027-01-15');
  });
  it('só exclui candidatura vencida, não contratada e ainda não anonimizada', () => {
    const past = new Date('2026-01-01'); const now = new Date('2026-06-01');
    expect(isExpiredForDeletion({ retentionUntil: past, status: 'REJECTED' }, now)).toBe(true);
    expect(isExpiredForDeletion({ retentionUntil: past, status: 'HIRED' }, now)).toBe(false);
    expect(isExpiredForDeletion({ retentionUntil: past, status: 'REJECTED', anonymizedAt: now }, now)).toBe(false);
    expect(isExpiredForDeletion({ retentionUntil: new Date('2027-01-01'), status: 'APPLIED' }, now)).toBe(false);
    expect(isExpiredForDeletion({ retentionUntil: null, status: 'APPLIED' }, now)).toBe(false);
  });
});

describe('diversidade opcional', () => {
  it('aceita só opções conhecidas', () => {
    expect(pickOption(GENDER_OPTIONS, 'mulher')).toBe('MULHER');
    expect(pickOption(GENDER_OPTIONS, 'qualquer coisa')).toBeNull();
    expect(parsePcd('sim')).toBe(true);
    expect(parsePcd('')).toBeNull();
  });
});

describe('e-mail de reprovação', () => {
  it('escapa HTML da mensagem personalizada e traz o link de privacidade', () => {
    const mail = applicationRejectedEmail({ name: 'Ana', jobTitle: 'Dev', company: 'Acme', message: '<b>oi</b>', privacyUrl: 'https://x/p' });
    expect(mail.html).not.toContain('<b>oi</b>');
    expect(mail.html).toContain('https://x/p');
  });
});

describe('duplicidade por telefone', () => {
  it('compara só os dígitos e ignora o DDI 55', () => {
    expect(phoneKey('(11) 91234-5678')).toBe('11912345678');
    expect(phoneKey('+55 11 91234-5678')).toBe('11912345678');
    expect(phoneKey('123')).toBeNull();
    expect(phoneKey(null)).toBeNull();
  });
});
