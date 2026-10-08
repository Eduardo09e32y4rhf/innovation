import { describe, expect, it } from 'vitest';
import { asoState, computeDueDate, daysUntil, employeeCompliance, EXPIRING_WINDOW_DAYS } from './aso-rules';

/**
 * Robô de ASO: confere as datas de vencimento contra um calendário refeito por outro caminho (aritmética de ano/mês/dia,
 * sem Date) em todos os dias de 2020 a 2031, e as regras de estado em todos os limites.
 */
const bissexto = (a: number) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
const diasNoMes = (a: number, m: number) => [31, bissexto(a) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
function somaMeses(a: number, m: number, d: number, n: number): [number, number, number] {
  const total = a * 12 + (m - 1) + n;
  const na = Math.floor(total / 12); const nm = (total % 12) + 1;
  return [na, nm, Math.min(d, diasNoMes(na, nm))];
}
const iso = (a: number, m: number, d: number) => `${String(a).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const dia = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe('vencimento do ASO contra calendário independente (2020 a 2031, todos os dias)', () => {
  it.each([6, 12, 24])('periodicidade de %i meses', (meses) => {
    const erros: string[] = [];
    let total = 0;
    for (let a = 2020; a <= 2031; a++) for (let m = 1; m <= 12; m++) for (let d = 1; d <= diasNoMes(a, m); d++) {
      total++;
      const [ea, em, ed] = somaMeses(a, m, d, meses);
      const obtido = computeDueDate('PERIODICO', dia(iso(a, m, d)), meses)?.toISOString().slice(0, 10);
      if (obtido !== iso(ea, em, ed)) erros.push(`${iso(a, m, d)} + ${meses}m: esperado ${iso(ea, em, ed)}, sistema ${obtido}`);
      if (erros.length >= 5) break;
    }
    expect(erros, erros.join('\n')).toEqual([]);
    expect(total).toBeGreaterThan(4000);
  });

  it('casos de calendário que costumam errar', () => {
    const v = (exame: string, meses: number) => computeDueDate('PERIODICO', dia(exame), meses)?.toISOString().slice(0, 10);
    expect(v('2024-02-29', 12)).toBe('2025-02-28'); // 29/fev de ano bissexto + 1 ano
    expect(v('2024-02-29', 24)).toBe('2026-02-28');
    expect(v('2028-02-29', 12)).toBe('2029-02-28');
    expect(v('2026-08-31', 6)).toBe('2027-02-28');
    expect(v('2027-08-31', 6)).toBe('2028-02-29'); // fev bissexto
    expect(v('2026-12-31', 12)).toBe('2027-12-31'); // virada de ano
    expect(v('2026-01-31', 6)).toBe('2026-07-31');
  });

  it('o horário do exame não muda o dia do vencimento (data guardada em UTC)', () => {
    for (const hora of ['00:00:00.000', '03:00:00.000', '12:34:56.789', '23:59:59.999']) {
      expect(computeDueDate('PERIODICO', new Date(`2026-10-10T${hora}Z`))?.toISOString().slice(0, 10)).toBe('2027-10-10');
    }
  });

  it('só exame que renova gera vencimento', () => {
    for (const tipo of ['ADMISSIONAL', 'PERIODICO', 'RETORNO_AO_TRABALHO', 'MUDANCA_DE_FUNCAO']) expect(computeDueDate(tipo, dia('2026-01-10'))).not.toBeNull();
    for (const tipo of ['DEMISSIONAL', 'COMPLEMENTAR', 'QUALQUER']) expect(computeDueDate(tipo, dia('2026-01-10'))).toBeNull();
  });
});

describe('estado do ASO em todos os limites da janela de aviso', () => {
  const base = { asoType: 'PERIODICO', status: 'COMPLETED', result: 'APTO' };
  const hoje = dia('2026-10-04');

  it('de 40 dias antes a 40 dias depois: válido → vencendo → vencido, sem pular nem voltar', () => {
    const ordem = ['VALID', 'EXPIRING', 'EXPIRED'];
    let anterior = 0;
    for (let faltam = 40; faltam >= -40; faltam--) {
      const venc = new Date(hoje.getTime() + faltam * 86_400_000);
      const estado = asoState({ ...base, dueDate: venc }, hoje);
      const posicao = ordem.indexOf(estado);
      expect(posicao, `faltam ${faltam} dias → ${estado}`).toBeGreaterThanOrEqual(anterior);
      anterior = posicao;
      const esperado = faltam < 0 ? 'EXPIRED' : faltam <= EXPIRING_WINDOW_DAYS ? 'EXPIRING' : 'VALID';
      expect(estado, `faltam ${faltam} dias`).toBe(esperado);
    }
  });

  it('o horário de "agora" não muda a contagem de dias (23:59 e 00:01 do mesmo dia dão o mesmo resultado)', () => {
    const venc = dia('2026-10-10');
    for (const hora of ['00:00:01', '08:00:00', '12:00:00', '23:59:59']) expect(daysUntil(venc, new Date(`2026-10-04T${hora}Z`))).toBe(6);
  });

  it('inapto vence qualquer prazo; cancelado e em aberto não contam como válidos', () => {
    expect(asoState({ ...base, result: 'INAPTO', dueDate: dia('2030-01-01') }, hoje)).toBe('INAPTO');
    expect(asoState({ ...base, status: 'CANCELLED', dueDate: dia('2030-01-01') }, hoje)).toBe('CANCELED');
    expect(asoState({ ...base, status: 'SCHEDULED', dueDate: dia('2030-01-01') }, hoje)).toBe('OPEN');
  });
});

describe('situação do colaborador', () => {
  const hoje = dia('2026-10-04');
  const aso = (id: string, tipo: string, exame: string, extra: object = {}) => ({ id, asoType: tipo, status: 'COMPLETED', result: 'APTO', examDate: dia(exame), dueDate: computeDueDate(tipo, dia(exame)), ...extra });

  it('a ordem da lista não muda o resultado', () => {
    const lista = [aso('a', 'ADMISSIONAL', '2024-01-10'), aso('b', 'PERIODICO', '2025-01-12'), aso('c', 'PERIODICO', '2026-01-15'), aso('d', 'DEMISSIONAL', '2026-09-30')];
    const esperado = employeeCompliance(lista, hoje);
    for (const permutacao of [[...lista].reverse(), [lista[2], lista[0], lista[3], lista[1]], [lista[1], lista[3], lista[2], lista[0]]]) expect(employeeCompliance(permutacao, hoje)).toEqual(esperado);
    expect(esperado).toMatchObject({ state: 'VALID', basedOnId: 'c' });
  });

  it('exame vencido há 1 dia = vencido; hoje = vencendo (ainda vale)', () => {
    expect(employeeCompliance([aso('x', 'PERIODICO', '2025-10-03')], hoje).state).toBe('EXPIRED');
    expect(employeeCompliance([aso('x', 'PERIODICO', '2025-10-04')], hoje).state).toBe('EXPIRING');
  });

  it('retorno ao trabalho e mudança de função renovam; demissional e complementar não', () => {
    const antigo = aso('old', 'PERIODICO', '2024-01-01');
    expect(employeeCompliance([antigo, aso('ret', 'RETORNO_AO_TRABALHO', '2026-09-01')], hoje)).toMatchObject({ state: 'VALID', basedOnId: 'ret' });
    expect(employeeCompliance([antigo, aso('mud', 'MUDANCA_DE_FUNCAO', '2026-09-01')], hoje)).toMatchObject({ state: 'VALID', basedOnId: 'mud' });
    expect(employeeCompliance([antigo, aso('dem', 'DEMISSIONAL', '2026-09-01')], hoje)).toMatchObject({ state: 'EXPIRED', basedOnId: 'old' });
    expect(employeeCompliance([antigo, aso('com', 'COMPLEMENTAR', '2026-09-01')], hoje)).toMatchObject({ basedOnId: 'old' });
  });
});
