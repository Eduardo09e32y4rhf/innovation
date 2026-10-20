import { describe, expect, it } from 'vitest';
import { PayrollCalculationService } from '../time-track/payroll-calculation.service';
import { calculateTermination } from './termination.calculator';
import { averageWindow, computeVariableAverage, type ClosingForAverage } from './variable-average';
import { deriveVestedVacations } from './vested-vacations';

const line = (lines: { code: string; amount: number }[], code: string) => lines.find((l) => l.code === code)?.amount ?? 0;

function closing(periodEnd: string, over: Partial<ClosingForAverage> = {}): ClosingForAverage {
  return { periodEnd, overtime50Value: 150, overtime100Value: 0, nightShiftValue: 0, dsrValue: 30, hourlyRate: 3000 / 220, monthlyDivisor: 220, ...over };
}

// Janela para desligamento em 20/10/2026: out/2025 .. set/2026 (12 meses civis anteriores ao mês do desligamento).
const MONTHS_12 = ['2025-10-31', '2025-11-30', '2025-12-31', '2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30', '2026-07-31', '2026-08-31', '2026-09-30'];

describe('C1 — média das verbas variáveis (CLT 142 §§3º/5º, 487 §3º; Súmulas 45 e 347 TST)', () => {
  const ctx = { salary: 3000, admission: '2020-01-01', termination: '2026-10-20' };

  it('janela = 12 meses civis anteriores ao mês do desligamento', () => {
    const w = averageWindow('2020-01-01', '2026-10-20');
    expect(w.from.toISOString().slice(0, 10)).toBe('2025-10-01');
    expect(w.to.toISOString().slice(0, 10)).toBe('2026-10-01');
    expect(w.months).toBe(12);
  });

  it('12 fechamentos iguais: média = (150 HE + 30 DSR) = 180,00', () => {
    // Cada mês: 150 + 30 = 180; 12 × 180 ÷ 12 = 180. Salário-hora igual ao atual → razão 1.
    const r = computeVariableAverage(MONTHS_12.map((m) => closing(m)), ctx);
    expect(r.monthly).toBe(180);
    expect(r.monthsConsidered).toBe(12);
    expect(r.closingsFound).toBe(12);
    expect(r.warnings).toHaveLength(0);
  });

  it('Súmula 347: reprecifica pelo salário-hora atual (salário subiu de 2.200 para 3.000)', () => {
    // Fechamento antigo com salário-hora 2.200÷220 = 10,00; atual 3.000÷220 = 13,6364. Razão = 1,363636.
    // 180 × 1,363636 = 245,4545 → 245,45 por mês.
    const r = computeVariableAverage(MONTHS_12.map((m) => closing(m, { hourlyRate: 10 })), ctx);
    expect(r.monthly).toBe(245.45);
  });

  it('meses sem fechamento contam como zero e geram aviso', () => {
    // 6 fechamentos × 180 = 1.080 ÷ 12 meses = 90,00.
    const r = computeVariableAverage(MONTHS_12.slice(0, 6).map((m) => closing(m)), ctx);
    expect(r.monthly).toBe(90);
    expect(r.closingsFound).toBe(6);
    expect(r.warnings[0]).toMatch(/6 fechamento/);
  });

  it('ignora fechamentos fora da janela (mês do desligamento e anteriores a out/2025)', () => {
    const r = computeVariableAverage([closing('2025-09-30'), closing('2026-10-31'), ...MONTHS_12.map((m) => closing(m))], ctx);
    expect(r.closingsFound).toBe(12);
    expect(r.monthly).toBe(180);
  });

  it('admissão recente limita a janela: admitido em 10/07/2026 → 3 meses (jul, ago, set)', () => {
    expect(averageWindow('2026-07-10', '2026-10-20').months).toBe(3);
    // 3 × 180 ÷ 3 = 180.
    const r = computeVariableAverage(['2026-07-31', '2026-08-31', '2026-09-30'].map((m) => closing(m)), { ...ctx, admission: '2026-07-10' });
    expect(r.monthly).toBe(180);
  });

  it('desligamento no mês da admissão: sem janela, média zero', () => {
    expect(computeVariableAverage([], { ...ctx, admission: '2026-10-05' }).monthly).toBe(0);
  });

  it('entra no aviso, nas férias proporcionais e no 13º; saldo de salário usa só o salário', () => {
    // Admissão 20/10/2025, desligamento 20/10/2026 sem justa causa. 1 ano completo → aviso 33 dias; projeção até 22/11/2026.
    // Remuneração = 3.000 + 300 = 3.300 (diária 110). Aviso = 33 × 110 = 3.630 (sem variável seria 3.300).
    // Saldo 20/30 sobre o salário = 2.000. 13º: 11 avos × 3.300 ÷ 12 = 3.025.
    // A projeção do aviso completa o 1º ano em 20/10/2026; o novo período (20/10 a 22/11) rende 1 avo: 3.300 ÷ 12 = 275; 1/3 = 91,67.
    const r = calculateTermination({
      type: 'SEM_JUSTA_CAUSA', salary: 3000, admissionDate: '2025-10-20', terminationDate: '2026-10-20',
      fgtsBalance: 5000, variableMonthly: 300,
    });
    expect(r.remuneration).toBe(3300);
    expect(line(r.earnings, 'AVISO_INDENIZADO')).toBe(3630);
    expect(line(r.earnings, 'SALDO_SALARIO')).toBe(2000);
    expect(line(r.earnings, '13_PROPORCIONAL')).toBe(3025);
    expect(line(r.earnings, 'FERIAS_PROPORCIONAIS')).toBe(275);
    expect(line(r.earnings, 'TERCO_FERIAS')).toBe(91.67);
  });

  it('override manual vale o mesmo que o automático (variableMonthly direto) e zero mantém o comportamento antigo', () => {
    const a = calculateTermination({ type: 'SEM_JUSTA_CAUSA', salary: 3000, admissionDate: '2025-10-20', terminationDate: '2026-10-20', fgtsBalance: 0 });
    expect(line(a.earnings, 'AVISO_INDENIZADO')).toBe(3300);
    expect(a.variableMonthly).toBe(0);
  });
});

describe('C2 — férias vencidas e dobra (CLT arts. 130, 134, 137, 146)', () => {
  const termination = '2026-10-20';

  it('períodos completos sem registro: 30 dias cada; dobra só quando o concessivo já expirou', () => {
    // Admissão 01/03/2023: períodos 2023-03-01..2024-02-29 (concessivo até 28/02/2025: expirado),
    // 2024-03-01..2025-02-28 (concessivo até 28/02/2026: expirado) e 2025-03-01..2026-02-28 (concessivo até 28/02/2027: no prazo).
    const v = deriveVestedVacations({ admission: '2023-03-01', termination, projectedEnd: termination, entitlements: [] });
    expect(v.map((x) => [x.pendingDays, x.doubled])).toEqual([[30, true], [30, true], [30, false]]);
    expect(v[0].label).toBe('2023-03-01 a 2024-02-29');
  });

  it('registro com dias usados/vendidos abate o pendente (30 − 20 usados − 10 vendidos = 0 → período quitado)', () => {
    const v = deriveVestedVacations({
      admission: '2023-03-01', termination, projectedEnd: termination,
      entitlements: [{ acquisitionStart: '2023-03-01', entitledDays: 30, usedDays: 20, soldDays: 10, concessionEnd: '2025-02-28' }],
    });
    expect(v).toHaveLength(2);
    expect(v[0].label).toBe('2024-03-01 a 2025-02-28');
  });

  it('faltas injustificadas (art. 130): direito de 24 dias − 4 usados = 20 pendentes', () => {
    const v = deriveVestedVacations({
      admission: '2025-03-01', termination, projectedEnd: termination,
      entitlements: [{ acquisitionStart: '2025-03-01', entitledDays: 24, usedDays: 4, soldDays: 0, concessionEnd: '2027-02-28' }],
    });
    expect(v).toEqual([{ label: '2025-03-01 a 2026-02-28', pendingDays: 20, doubled: false, concessionEnd: '2027-02-28' }]);
  });

  it('cálculo: salário 3.000 (diária 100), justa causa — vencidas 90 dias, 60 em dobro', () => {
    // Vencidas = 90 × 100 = 9.000. Dobra = 60 × 100 = 6.000 (art. 137). 1/3 sobre (9.000 + 6.000) = 5.000.
    // Justa causa: sem férias proporcionais e sem 13º (Súmula 171 TST), mas vencidas continuam devidas.
    const r = calculateTermination({
      type: 'JUSTA_CAUSA', salary: 3000, admissionDate: '2023-03-01', terminationDate: termination,
      fgtsBalance: 0, vacationHistory: [],
    });
    expect(line(r.earnings, 'FERIAS_VENCIDAS')).toBe(9000);
    expect(line(r.earnings, 'FERIAS_DOBRA')).toBe(6000);
    expect(line(r.earnings, 'TERCO_FERIAS')).toBe(5000);
    expect(r.warnings.join(' ')).toMatch(/art\. 137/);
  });

  it('sem dobra quando o desligamento ocorre dentro do concessivo', () => {
    // Admissão 01/03/2025, desligamento 20/10/2026 sem justa causa: 1 período completo (concessivo até 28/02/2027).
    const r = calculateTermination({
      type: 'PEDIDO_DEMISSAO', salary: 3000, admissionDate: '2025-03-01', terminationDate: termination,
      fgtsBalance: 0, vacationHistory: [], noticeMode: 'DISPENSADO',
    });
    expect(line(r.earnings, 'FERIAS_VENCIDAS')).toBe(3000);
    expect(line(r.earnings, 'FERIAS_DOBRA')).toBe(0);
  });

  it('parâmetro manual vestedVacationPeriods continua valendo (legado) e substitui a derivação', () => {
    const r = calculateTermination({
      type: 'JUSTA_CAUSA', salary: 3000, admissionDate: '2023-03-01', terminationDate: termination, fgtsBalance: 0, vestedVacationPeriods: 1,
    });
    expect(line(r.earnings, 'FERIAS_VENCIDAS')).toBe(3000);
    expect(line(r.earnings, 'FERIAS_DOBRA')).toBe(0);
  });
});

describe('C5 — teto de compensação (CLT art. 477 §5º) e dedução mais vantajosa de IRRF', () => {
  it('indenização art. 480 limitada a um mês de remuneração', () => {
    // Admissão 01/01/2026, desligamento 10/03/2026, termo em 31/12/2026: restam 296 dias (11/03 a 31/12).
    // Indenização = 100 × 296 ÷ 2 = 14.800, mas o teto é 1 mês de remuneração = 3.000.
    const r = calculateTermination({
      type: 'ANTECIPADA_EMPREGADO', salary: 3000, admissionDate: '2026-01-01', terminationDate: '2026-03-10',
      contractEndDate: '2026-12-31', fgtsBalance: 0,
    });
    expect(line(r.discounts, 'INDENIZACAO_480')).toBe(3000);
    expect(r.warnings.join(' ')).toMatch(/477 §5º/);
  });

  it('o teto inclui a média de variáveis (remuneração 3.000 + 200 = 3.200)', () => {
    const r = calculateTermination({
      type: 'ANTECIPADA_EMPREGADO', salary: 3000, admissionDate: '2026-01-01', terminationDate: '2026-03-10',
      contractEndDate: '2026-12-31', fgtsBalance: 0, variableMonthly: 200,
    });
    expect(line(r.discounts, 'INDENIZACAO_480')).toBe(3200);
  });

  it('aviso não cumprido (1 salário) cabe no teto e não é cortado', () => {
    const r = calculateTermination({
      type: 'PEDIDO_DEMISSAO', salary: 3000, admissionDate: '2025-01-01', terminationDate: '2026-03-10', noticeMode: 'NAO_CUMPRIDO', fgtsBalance: 0,
    });
    expect(line(r.discounts, 'AVISO_NAO_CUMPRIDO')).toBe(3000);
    expect(r.warnings.join(' ')).not.toMatch(/477 §5º/);
  });

  it('IRRF escolhe a maior dedução: simplificada (607,20) quando o INSS + dependentes é menor', () => {
    const engine = new PayrollCalculationService();
    // Bruto 3.333,33: INSS ≈ 308 < 607,20 → base = 3.333,33 − 607,20 = 2.726,13.
    const low = engine.applyTaxes(3333.33, 0);
    expect(low.irrfBase).toBeCloseTo(3333.33 - 607.2, 2);
  });

  it('IRRF escolhe a dedução legal quando é maior que a simplificada', () => {
    const engine = new PayrollCalculationService();
    // Bruto 8.000, 4 dependentes: INSS (teto) 988,09 + 4 × 189,59 = 1.746,45 > 607,20 → base = 8.000 − 1.746,45.
    const high = engine.applyTaxes(8000, 4);
    expect(high.irrfBase).toBeCloseTo(8000 - (high.inssDiscount + 4 * 189.59), 2);
    expect(high.irrfBase).toBeLessThan(8000 - 607.2);
  });

  it('linha de IRRF do saldo de salário usa a mesma escolha do motor da folha', () => {
    const engine = new PayrollCalculationService();
    const r = calculateTermination({ type: 'JUSTA_CAUSA', salary: 9000, admissionDate: '2020-01-01', terminationDate: '2026-06-30', fgtsBalance: 0, dependents: 2 });
    const expected = engine.applyTaxes(9000, 2).irrfDiscount;
    expect(line(r.discounts, 'IRRF')).toBe(expected);
  });
});
