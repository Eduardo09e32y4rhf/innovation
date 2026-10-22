import { describe, expect, it } from 'vitest';
import { accountantActions, deadlineFor, fmtMinutes, hrActions, isOverdue, matchesFilter, mergeRows, periodTotals, statusLabel, validateAdjust } from '../../../apps/web/app/[tenant]/dashboard/contabilidade/_model';

const emp = (id: string, gross: number, discounts: number, adj = false) => ({ employeeId: id, name: id, closingId: `c${id}`, closingStatus: 'DRAFT', gross, discounts, net: gross - discounts, hasManualAdjustment: adj });

describe('fluxo do mês: rótulos e botões', () => {
  it('rótulos de status', () => {
    expect(statusLabel(null)).toBe('Não iniciada');
    expect(statusLabel('RETURNED')).toBe('Devolvida pelo RH');
    expect(statusLabel('PAID')).toBe('Paga');
  });
  it('filtro por status', () => {
    expect(matchesFilter(null, 'NONE')).toBe(true);
    expect(matchesFilter('PAID', 'NONE')).toBe(false);
    expect(matchesFilter('PAID', 'ALL')).toBe(true);
    expect(matchesFilter('CALCULATED', 'CALCULATED')).toBe(true);
  });
  it('contador: botões por status e perfil', () => {
    expect(accountantActions(null, 'CONTABIL')).toMatchObject({ calculate: true, publish: false, adjust: false });
    expect(accountantActions('CALCULATED', 'CONTABIL')).toMatchObject({ calculate: true, publish: true, adjust: true, discardOption: true });
    expect(accountantActions('RETURNED', 'DEV').publish).toBe(true);
    expect(accountantActions('CALCULATED', 'CONTABIL', 0).publish).toBe(false);
    for (const s of ['PUBLISHED', 'RELEASED', 'PAID'] as const) expect(accountantActions(s, 'CONTABIL')).toEqual({ calculate: false, publish: false, adjust: false, discardOption: false });
    expect(accountantActions('CALCULATED', 'RH').calculate).toBe(false);
  });
  it('RH: botões por status e perfil', () => {
    expect(hrActions('PUBLISHED', 'RH')).toEqual({ showBlock: true, returnToAccountant: true, release: true, markPaid: false });
    expect(hrActions('RELEASED', 'ADMIN')).toEqual({ showBlock: true, returnToAccountant: false, release: false, markPaid: true });
    expect(hrActions('PAID', 'RH').markPaid).toBe(false);
    expect(hrActions('DRAFT', 'RH').showBlock).toBe(false);
    expect(hrActions(null, 'RH').showBlock).toBe(false);
    expect(hrActions('PUBLISHED', 'GESTOR')).toEqual({ showBlock: false, returnToAccountant: false, release: false, markPaid: false });
  });
});

describe('prazo, formatação e totais', () => {
  it('prazo é dia 5 do mês seguinte', () => {
    expect(deadlineFor('2026-03')).toBe('2026-04-05');
    expect(deadlineFor('2026-12')).toBe('2027-01-05');
    expect(isOverdue('2026-03', 'CALCULATED', new Date(2026, 3, 6))).toBe(true);
    expect(isOverdue('2026-03', 'CALCULATED', new Date(2026, 3, 5))).toBe(false);
    expect(isOverdue('2026-03', 'PUBLISHED', new Date(2026, 5, 1))).toBe(false);
  });
  it('minutos em horas', () => {
    expect(fmtMinutes(0)).toBe('0h00');
    expect(fmtMinutes(125)).toBe('2h05');
    expect(fmtMinutes(-30)).toBe('-0h30');
    expect(fmtMinutes(undefined)).toBe('0h00');
  });
  it('totais usam os do período e contam ajustes', () => {
    const t = periodTotals({ totals: { gross: 3000, discounts: 500, net: 2500, inss: 200, fgts: 240, irrf: 30, employees: 2 }, employees: [emp('a', 1000, 100, true), emp('b', 2000, 400)] });
    expect(t).toMatchObject({ gross: 3000, net: 2500, inss: 200, fgts: 240, irrf: 30, employees: 2, manualAdjustments: 1 });
  });
  it('junta horas do ponto com valores', () => {
    const rows = mergeRows([emp('a', 100, 10), emp('b', 50, 5)], [{ employeeId: 'a', name: 'a', position: 'Cozinha', workedMinutes: 600, overtime50Minutes: 60 } as never]);
    expect(rows[0]).toMatchObject({ position: 'Cozinha', workedMinutes: 600, overtime50Minutes: 60, net: 90 });
    expect(rows[1].workedMinutes).toBe(0);
  });
  it('ajuste exige valor e motivo', () => {
    expect(validateAdjust('', 'motivo válido')).not.toBeNull();
    expect(validateAdjust('-1', 'motivo válido')).not.toBeNull();
    expect(validateAdjust('10,5', 'abc')).not.toBeNull();
    expect(validateAdjust('10,5', 'erro de lançamento')).toBeNull();
  });
});

describe('ajuste manual: unidades iguais às da API', () => {
  it('horas extras e noturno são em HORAS, não em reais (a API multiplica por 60)', async () => {
    const { ADJUST_FIELDS } = await import('../../../apps/web/app/[tenant]/dashboard/contabilidade/_model');
    for (const field of ['overtime50', 'overtime100', 'nightShift']) {
      const label = ADJUST_FIELDS.find((f) => f.value === field)?.label ?? '';
      expect(label).toMatch(/hora/i);
      expect(label).not.toContain('R$');
    }
    for (const field of ['absenceMinutes', 'lateMinutes', 'earlyLeaveMinutes']) {
      expect(ADJUST_FIELDS.find((f) => f.value === field)?.label).toMatch(/minutos/);
    }
  });
});
