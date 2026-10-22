import { describe, expect, it } from 'vitest';
import { calculateTermination, noticeDays } from './termination.calculator';
import { calculateThirteenth } from './thirteenth.calculator';
import { parseDay } from './labor-dates';

const line = (lines: { code: string; amount: number }[], code: string) => lines.find((l) => l.code === code)?.amount ?? 0;

const base = { salary: 3000, admissionDate: '2023-03-01', terminationDate: '2026-06-15', fgtsBalance: 9000, dependents: 0 };

describe('aviso prévio proporcional (Lei 12.506/2011)', () => {
  it('30 + 3 por ano completo', () => {
    expect(noticeDays(parseDay('2023-03-01'), parseDay('2026-06-15'))).toBe(39);
    expect(noticeDays(parseDay('2026-01-01'), parseDay('2026-12-30'))).toBe(30);
  });
  it('limitado a 90 dias', () => {
    expect(noticeDays(parseDay('2000-01-01'), parseDay('2026-06-15'))).toBe(90);
  });
});

describe('rescisão sem justa causa, aviso indenizado', () => {
  // Salário 3.000 (diária 100). 3 anos completos → aviso 39 dias = 3.900; projeção até 24/07/2026.
  // Saldo 15/30 = 1.500. 13º: jan-jun + jul (24 dias) = 7/12 = 1.750.
  // Férias: período 01/03/2026 → 24/07 = 4 meses + 24 dias = 5/12 = 1.250; 1/3 = 416,67.
  // INSS saldo 1.500 × 7,5% = 112,50. INSS 13º: 1.621×7,5% + 129×9% = 133,185 → 133,19. IRRF zero (≤ R$ 5.000).
  // FGTS mês: (1.500 + 3.900 + 1.750) × 8% = 572; multa 40% × (9.000 + 572) = 3.828,80.
  const r = calculateTermination({ ...base, type: 'SEM_JUSTA_CAUSA' });

  it('verbas', () => {
    expect(r.projectedEndDate).toBe('2026-07-24');
    expect(line(r.earnings, 'AVISO_INDENIZADO')).toBe(3900);
    expect(line(r.earnings, 'SALDO_SALARIO')).toBe(1500);
    expect(line(r.earnings, '13_PROPORCIONAL')).toBe(1750);
    expect(line(r.earnings, 'FERIAS_PROPORCIONAIS')).toBe(1250);
    expect(line(r.earnings, 'TERCO_FERIAS')).toBe(416.67);
    expect(r.totalEarnings).toBe(8816.67);
  });
  it('descontos: INSS só sobre saldo e 13º (aviso e férias indenizadas fora)', () => {
    expect(line(r.discounts, 'INSS')).toBe(112.5);
    expect(line(r.discounts, 'INSS_13')).toBeCloseTo(133.19, 1);
    expect(line(r.discounts, 'IRRF')).toBe(0);
    expect(line(r.discounts, 'IRRF_13')).toBe(0);
  });
  it('FGTS e multa 40%', () => {
    expect(r.fgts.rescissionDeposit).toBe(572);
    expect(r.fgts.fine).toBe(3828.8);
    expect(r.fgts.withdrawalPercent).toBe(100);
    expect(r.unemploymentInsuranceEligible).toBe(true);
  });
  it('soma fecha em centavos', () => {
    const d = r.discounts.reduce((s, l) => s + Math.round(l.amount * 100), 0);
    expect(Math.round(r.netAmount * 100)).toBe(Math.round(r.totalEarnings * 100) - d);
  });
});

describe('justa causa', () => {
  // Só saldo (1.500) + férias vencidas (3.000 + 1/3 1.000). Sem aviso, 13º, férias proporcionais e multa.
  const r = calculateTermination({ ...base, type: 'JUSTA_CAUSA', vestedVacationPeriods: 1 });
  it('perde proporcionais, mantém vencidas', () => {
    expect(line(r.earnings, 'AVISO_INDENIZADO')).toBe(0);
    expect(line(r.earnings, '13_PROPORCIONAL')).toBe(0);
    expect(line(r.earnings, 'FERIAS_PROPORCIONAIS')).toBe(0);
    expect(line(r.earnings, 'FERIAS_VENCIDAS')).toBe(3000);
    expect(line(r.earnings, 'TERCO_FERIAS')).toBe(1000);
    expect(r.totalEarnings).toBe(5500);
    expect(r.netAmount).toBe(5387.5);
    expect(r.fgts.fine).toBe(0);
    expect(r.fgts.withdrawalPercent).toBe(0);
  });
});

describe('acordo (CLT art. 484-A)', () => {
  // Aviso pela metade: 39 × 100 ÷ 2 = 1.950. Demais verbas integrais (iguais ao caso sem justa causa).
  // FGTS mês: (1.500 + 1.950 + 1.750) × 8% = 416; multa 20% × 9.416 = 1.883,20. Saque 80%, sem seguro-desemprego.
  const r = calculateTermination({ ...base, type: 'ACORDO' });
  it('metade do aviso, multa 20%, saque 80%', () => {
    expect(line(r.earnings, 'AVISO_INDENIZADO')).toBe(1950);
    expect(line(r.earnings, '13_PROPORCIONAL')).toBe(1750);
    expect(r.totalEarnings).toBe(6866.67);
    expect(r.fgts.fine).toBe(1883.2);
    expect(r.fgts.withdrawalPercent).toBe(80);
    expect(r.unemploymentInsuranceEligible).toBe(false);
  });
});

describe('pedido de demissão sem cumprir aviso', () => {
  // Admissão 10/01/2026, saída 20/04/2026. Saldo 20/30 = 2.000. 13º: jan(22d)+fev+mar+abr(20d) = 4/12 = 1.000.
  // Férias: 3 meses + 11 dias (< 15) = 3/12 = 750; 1/3 = 250. Desconto aviso 30 dias = 3.000 (CLT 487 §2º).
  // INSS 2.000: 121,575 + 379 × 9% = 155,685 → 155,69. INSS 13º 1.000 × 7,5% = 75.
  const r = calculateTermination({ type: 'PEDIDO_DEMISSAO', noticeMode: 'NAO_CUMPRIDO', salary: 3000, admissionDate: '2026-01-10', terminationDate: '2026-04-20', fgtsBalance: 720 });
  it('verbas e descontos', () => {
    expect(line(r.earnings, 'SALDO_SALARIO')).toBe(2000);
    expect(line(r.earnings, '13_PROPORCIONAL')).toBe(1000);
    expect(line(r.earnings, 'FERIAS_PROPORCIONAIS')).toBe(750);
    expect(line(r.earnings, 'TERCO_FERIAS')).toBe(250);
    expect(line(r.discounts, 'AVISO_NAO_CUMPRIDO')).toBe(3000);
    expect(line(r.discounts, 'INSS')).toBeCloseTo(155.69, 1);
    expect(line(r.discounts, 'INSS_13')).toBe(75);
    expect(r.fgts.fine).toBe(0);
    expect(r.fgts.withdrawalPercent).toBe(0);
  });
});

describe('contrato de experiência rompido pelo empregador (CLT art. 479)', () => {
  // Termo 29/05/2026, saída 15/04. Restam 16/04→29/05 = 44 dias; metade = 44 × 100 ÷ 2 = 2.200.
  const r = calculateTermination({ type: 'ANTECIPADA_EMPREGADOR', salary: 3000, admissionDate: '2026-03-01', terminationDate: '2026-04-15', contractEndDate: '2026-05-29', fgtsBalance: 240 });
  it('indenização art. 479 e multa 40%', () => {
    expect(line(r.earnings, 'INDENIZACAO_479')).toBe(2200);
    expect(r.fgts.fineRate).toBe(0.4);
  });
  it('exige data de término do contrato', () => {
    expect(() => calculateTermination({ type: 'ANTECIPADA_EMPREGADO', salary: 3000, admissionDate: '2026-03-01', terminationDate: '2026-04-15' })).toThrow();
  });
});

describe('13º salário (Lei 4.090/1962, Lei 4.749/1965)', () => {
  it('ano completo, salário 6.000', () => {
    // INSS: 121,575 + 115,3656 + 174,1716 + 1.645,73 × 14% (230,4022) = 641,51.
    // IRRF: base 6.000 − 641,51 = 5.358,49 × 27,5% − 908,73 = 564,86; redutor 978,62 − 0,133145 × 6.000 = 179,75 → 385,11.
    const r = calculateThirteenth({ year: 2026, salary: 6000, admissionDate: '2020-01-01' });
    expect(r.avos).toBe(12);
    expect(r.total).toBe(6000);
    expect(r.firstInstallment.amount).toBe(3000);
    expect(r.secondInstallment.inss).toBeCloseTo(641.51, 1);
    expect(r.secondInstallment.irrf).toBeCloseTo(385.11, 1);
    expect(r.secondInstallment.net).toBeCloseTo(3000 - 641.51 - 385.11, 1);
  });
  it('admissão em 20/08: agosto (12 dias) não conta → 4/12', () => {
    const r = calculateThirteenth({ year: 2026, salary: 3000, admissionDate: '2026-08-20' });
    expect(r.avos).toBe(4);
    expect(r.total).toBe(1000);
  });
  it('isento até R$ 5.000', () => {
    const r = calculateThirteenth({ year: 2026, salary: 5000, admissionDate: '2020-01-01' });
    expect(r.secondInstallment.irrf).toBe(0);
  });
});
