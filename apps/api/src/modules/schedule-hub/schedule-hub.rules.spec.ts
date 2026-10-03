import { describe, expect, it } from 'vitest';
import { SCHEDULE_ACCESS, can, rolesWith, scopeOf } from '../schedule/access/schedule-access';
import { evaluateFences, nextPunchType, punchReceipt, speedKmh } from './punch/punch-rules';
import { checkClt, longestWorkStreak, normalizePayload, restBetweenMinutes } from './requests/request-rules';
import type { ResolvedDay } from './calendar/day-resolver';

const day = (date: string, working: boolean, entry: string | null = '08:00', exit: string | null = '17:00'): ResolvedDay => ({
  date, dayOfWeek: 1, type: working ? 'TRABALHO' : 'FOLGA', working, entry: working ? entry : null, lunchStart: null, lunchReturn: null, exit: working ? exit : null,
  scheduleId: 's', scheduleName: 'x', exceptionType: null, exceptionReason: null, holidayName: null,
});

describe('matriz de permissões da Central de Escalas', () => {
  it('COMERCIAL não tem acesso; DEV não bate ponto; CONSULTA nunca escreve', () => {
    expect(Object.keys(SCHEDULE_ACCESS.COMERCIAL)).toHaveLength(0);
    expect(can('DEV', 'punch')).toBe(false);
    for (const capability of ['schedule.write', 'approvals', 'requests.create', 'policy.write', 'closing.write', 'punch'] as const) {
      expect(can('CONSULTA', capability)).toBe(false);
    }
  });

  it('escopos: funcionário=self, gestor=team, RH/ADMIN=company', () => {
    expect(scopeOf('FUNCIONARIO', 'calendar.read')).toBe('self');
    expect(scopeOf('GESTOR', 'approvals')).toBe('team');
    expect(scopeOf('RH', 'approvals')).toBe('company');
    expect(scopeOf('CEO', 'schedule.write')).toBeNull();
  });

  it('CEO e CONTABIL só leem; CONTABIL não vê calendário', () => {
    expect(rolesWith('closing.read')).toEqual(expect.arrayContaining(['CEO', 'CONTABIL', 'FUNCIONARIO', 'GESTOR', 'RH', 'ADMIN', 'DEV']));
    expect(can('CONTABIL', 'calendar.read')).toBe(false);
    expect(can('CEO', 'approvals')).toBe(false);
  });
});

describe('regras de batida por localização', () => {
  const fences = [{ id: 'a', name: 'Sede', latitude: -23.55, longitude: -46.63, radiusMeters: 150 }];

  it('dentro e fora da cerca, com distância', () => {
    expect(evaluateFences(-23.5501, -46.6301, fences)).toMatchObject({ configured: true, inside: true });
    const outside = evaluateFences(-23.56, -46.64, fences);
    expect(outside.inside).toBe(false);
    expect(outside.distanceMeters).toBeGreaterThan(1000);
  });

  it('sem cerca configurada não bloqueia', () => {
    expect(evaluateFences(0, 0, [])).toMatchObject({ configured: false, inside: true });
  });

  it('detecta salto impossível de posição', () => {
    const a = { latitude: -23.55, longitude: -46.63, at: new Date('2026-01-01T10:00:00Z') };
    const b = { latitude: -22.9, longitude: -43.2, at: new Date('2026-01-01T10:10:00Z') };
    expect(speedKmh(a, b)).toBeGreaterThan(1000);
  });

  it('sequência de batidas e comprovante determinístico', () => {
    expect(nextPunchType(null)).toBe('ENTRY');
    expect(nextPunchType({ entry: 1 })).toBe('LUNCH_START');
    expect(nextPunchType({ entry: 1, lunchStart: 1, lunchReturn: 1 })).toBe('EXIT');
    expect(nextPunchType({ entry: 1, lunchStart: 1, lunchReturn: 1, exit: 1 })).toBeNull();
    const input = { companyId: 'c', employeeId: 'e', occurredAt: new Date('2026-01-01T10:00:00Z'), type: 'ENTRY', nonce: 'n' };
    expect(punchReceipt(input)).toBe(punchReceipt(input));
    expect(punchReceipt(input)).toHaveLength(24);
  });
});

describe('validações CLT e de payload das solicitações', () => {
  it('interjornada abaixo de 11h gera erro', () => {
    expect(restBetweenMinutes({ entry: '14:00', exit: '23:00' }, { entry: '06:00' })).toBe(420);
    const findings = checkClt([day('2026-03-02', true, '14:00', '23:00'), day('2026-03-03', true, '06:00', '15:00')]);
    expect(findings.some((item) => item.code === 'INTERJORNADA')).toBe(true);
  });

  it('mais de 6 dias seguidos gera erro de DSR', () => {
    const week = Array.from({ length: 8 }, (_, i) => day(`2026-03-0${i + 1}`, true));
    expect(longestWorkStreak(week)).toBe(8);
    expect(checkClt(week).some((item) => item.code === 'SEXTO_DIA')).toBe(true);
    expect(checkClt([...week.slice(0, 5), day('2026-03-06', false), day('2026-03-07', true)])).toHaveLength(0);
  });

  it('normaliza e rejeita payloads inválidos', () => {
    expect(normalizePayload('TROCA_FOLGA', { offDate: '2026-03-10', workDate: '2026-03-14' }).dates).toEqual(['2026-03-10', '2026-03-14']);
    expect(() => normalizePayload('TROCA_FOLGA', { offDate: '2026-03-10', workDate: '2026-03-10' })).toThrow();
    expect(() => normalizePayload('AJUSTE_BATIDA', { date: '2026-03-10' })).toThrow(/ao menos um horario/);
    expect(() => normalizePayload('AJUSTE_BATIDA', { date: '2026-03-10', entry: '8h' })).toThrow(/HH:MM/);
    expect(normalizePayload('JUSTIFICATIVA', { date: '2026-03-10', kind: 'FALTA' }).data).toMatchObject({ kind: 'FALTA', minutes: 0 });
    expect(() => normalizePayload('NOVA_ESCALA', { scheduleId: '', startDate: '2026-03-10' })).toThrow();
  });
});
