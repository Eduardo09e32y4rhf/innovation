import { describe, expect, it } from 'vitest';
import { asoState, computeDueDate, employeeCompliance, normalizePeriodicity } from './aso-rules';

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const today = d('2026-10-04');

describe('ASO: vencimento', () => {
  it('soma a periodicidade ao exame (padrão 12 meses)', () => {
    expect(computeDueDate('PERIODICO', d('2026-03-15'))?.toISOString().slice(0, 10)).toBe('2027-03-15');
    expect(computeDueDate('ADMISSIONAL', d('2026-03-15'), 24)?.toISOString().slice(0, 10)).toBe('2028-03-15');
  });
  it('não passa de mês curto (31/jan + 1 mês = fim de fev)', () => {
    expect(computeDueDate('PERIODICO', d('2026-08-31'), 6)?.toISOString().slice(0, 10)).toBe('2027-02-28');
  });
  it('demissional e complementar não vencem', () => {
    expect(computeDueDate('DEMISSIONAL', d('2026-03-15'))).toBeNull();
    expect(computeDueDate('COMPLEMENTAR', d('2026-03-15'))).toBeNull();
  });
  it('periodicidade inválida volta ao padrão', () => {
    expect(normalizePeriodicity(7)).toBe(12);
    expect(normalizePeriodicity(undefined)).toBe(12);
    expect(normalizePeriodicity(24)).toBe(24);
  });
});

describe('ASO: estado do registro', () => {
  const base = { asoType: 'PERIODICO', status: 'COMPLETED', result: 'APTO' };
  it('classifica por prazo', () => {
    expect(asoState({ ...base, dueDate: d('2026-10-03') }, today)).toBe('EXPIRED');
    expect(asoState({ ...base, dueDate: d('2026-10-04') }, today)).toBe('EXPIRING');
    expect(asoState({ ...base, dueDate: d('2026-11-03') }, today)).toBe('EXPIRING');
    expect(asoState({ ...base, dueDate: d('2026-11-04') }, today)).toBe('VALID');
  });
  it('inapto, cancelado e aberto', () => {
    expect(asoState({ ...base, result: 'INAPTO', dueDate: d('2027-01-01') }, today)).toBe('INAPTO');
    expect(asoState({ ...base, status: 'CANCELLED' }, today)).toBe('CANCELED');
    expect(asoState({ ...base, status: 'SCHEDULED' }, today)).toBe('OPEN');
  });
});

describe('ASO: situação do colaborador', () => {
  it('sem nenhum ASO concluído = irregular', () => {
    expect(employeeCompliance([], today).state).toBe('NO_ASO');
    expect(employeeCompliance([{ id: 'a', asoType: 'PERIODICO', status: 'PENDING' }], today).state).toBe('NO_ASO');
  });
  it('vale o ASO renovável mais recente, ignorando demissional', () => {
    const r = employeeCompliance(
      [
        { id: 'old', asoType: 'ADMISSIONAL', status: 'COMPLETED', result: 'APTO', examDate: d('2025-01-10'), dueDate: d('2026-01-10') },
        { id: 'new', asoType: 'PERIODICO', status: 'COMPLETED', result: 'APTO', examDate: d('2026-09-20'), dueDate: d('2027-09-20') },
        { id: 'dem', asoType: 'DEMISSIONAL', status: 'COMPLETED', result: 'APTO', examDate: d('2026-10-01'), dueDate: null },
      ],
      today,
    );
    expect(r).toMatchObject({ state: 'VALID', basedOnId: 'new' });
  });
  it('último inapto bloqueia a regularidade', () => {
    const r = employeeCompliance([{ id: 'x', asoType: 'PERIODICO', status: 'COMPLETED', result: 'INAPTO', examDate: d('2026-09-01'), dueDate: d('2027-09-01') }], today);
    expect(r.state).toBe('INAPTO');
  });
});
