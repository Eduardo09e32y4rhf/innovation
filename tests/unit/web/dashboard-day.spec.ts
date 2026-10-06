import { describe, expect, it } from 'vitest';
import { firstNameOf, greetingForHour, greetingText, hourInZone } from '../../../apps/web/app/lib/dashboard-day';

describe('saudacao', () => {
  it('faixas: 05-11 bom dia, 12-17 boa tarde, 18-04 boa noite', () => {
    const cases: Array<[number, string]> = [[5, 'Bom dia'], [11, 'Bom dia'], [12, 'Boa tarde'], [17, 'Boa tarde'], [18, 'Boa noite'], [23, 'Boa noite'], [0, 'Boa noite'], [4, 'Boa noite']];
    for (const [hour, text] of cases) expect(greetingForHour(hour)).toBe(text);
  });
  it('usa o fuso informado e nao o do aparelho/UTC', () => {
    const utcNoon = new Date('2026-10-06T15:30:00Z'); // 12:30 em Sao Paulo (UTC-3)
    expect(hourInZone(utcNoon, 'America/Sao_Paulo')).toBe(12);
    expect(greetingText('Ana', utcNoon, 'America/Sao_Paulo')).toBe('Boa tarde, Ana!');
    expect(greetingText('Ana', utcNoon, 'Asia/Tokyo')).toBe('Boa noite, Ana!');

  });
  it('fuso invalido cai no padrao; virada 04:59 -> 05:00', () => {
    expect(hourInZone(new Date('2026-10-06T15:00:00Z'), 'Fuso/Invalido')).toBe(12);
    expect(greetingText('Ana', new Date('2026-10-06T07:59:00Z'))).toBe('Boa noite, Ana!');
    expect(greetingText('Ana', new Date('2026-10-06T08:00:00Z'))).toBe('Bom dia, Ana!');
  });
  it('nome composto, espacos e ausencia de nome', () => {
    expect(firstNameOf('  maria  da SILVA ')).toBe('Maria');
    expect(greetingText('', new Date())).toBe('Olá!');
    expect(greetingText(null, new Date())).toBe('Olá!');
  });
});