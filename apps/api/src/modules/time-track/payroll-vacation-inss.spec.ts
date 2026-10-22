import { PayrollCalculationService } from './payroll-calculation.service';

const base = {
  weeklyMinutes: 2640,
  overtime50Minutes: 0,
  overtime100Minutes: 0,
  nightShiftMinutes: 0,
  absenceMinutes: 0,
  payableWorkdays: 22,
  paidRestDays: 9,
};

describe('INSS unificado com ferias na competencia', () => {
  const service = new PayrollCalculationService();
  const CEILING = 988.09;

  it('salario 5.000 + ferias 10 dias (2.222,23): total 812,63, retido 175,69, devido 636,94', () => {
    const r = service.calculateInssWithVacation(5000, 2222.23);
    expect(r.total).toBe(812.63);
    expect(r.withheldOnVacation).toBe(175.69);
    expect(r.due).toBe(636.94);
  });

  it('salario 3.000 + ferias de 30 dias (4.000): devido 412,91 (748,51 de faixa alta menos 368,60 ja retidos)', () => {
    const r = service.calculateInssWithVacation(3000, 4000);
    expect(r.total).toBe(781.51);
    expect(r.due).toBe(412.91);
  });

  it('teto: salario 9.000 + ferias 4.000 nunca passa de 988,09 somando mes e recibo', () => {
    const r = service.calculateInssWithVacation(9000, 4000);
    expect(r.total).toBe(CEILING);
    expect(r.withheldOnVacation).toBe(368.6);
    expect(r.due).toBe(619.49);
    expect(r.due + r.withheldOnVacation).toBeCloseTo(CEILING, 2);
  });

  it('invariantes: mes + recibo = INSS da base unificada (<= teto); abaixo do teto nunca menor que o INSS so do salario', () => {
    for (const salary of [1621, 2200, 3000, 5000, 8475.55, 12000]) {
      for (const days of [5, 10, 20, 30]) {
        const vac = Math.round(((salary / 30) * days * 4 / 3) * 100) / 100;
        const r = service.calculateInssWithVacation(salary, vac);
        expect(r.total).toBeLessThanOrEqual(CEILING);
        expect(r.due + r.withheldOnVacation).toBeCloseTo(r.total, 2);
        // Progressividade sem teto e convexa (f(a+b) >= f(a)+f(b)); com o teto ativo o devido so completa 988,09.
        if (salary + vac <= 8475.55) expect(r.due).toBeGreaterThanOrEqual(service.calculateInss(salary) - 0.01);
        else expect(r.total).toBe(CEILING);
      }
    }
  });

  it('ferias fracionadas: abate a soma do INSS de cada recibo, nao o INSS da soma', () => {
    // recibos 2.222,23 (INSS 175,69) e 4.444,44 (INSS 423,74): retido 599,43; salario 5.000 + 6.666,67 passa do teto -> 988,09.
    const r = service.calculateInssWithVacation(5000, [2222.23, 4444.44]);
    expect(r.withheldOnVacation).toBe(599.43);
    expect(r.total).toBe(CEILING);
    expect(r.due).toBe(388.66);
  });

  it('calculate() sem ferias mantem o INSS isolado de 501,51', () => {
    const r = service.calculate({ ...base, salary: 5000 });
    expect(r.inssDiscount).toBe(501.51);
    expect(r.inssBase).toBe(5000);
  });

  it('calculate() com ferias no mes: INSS 636,94, base 7.222,23, bruto do salario intacto', () => {
    const r = service.calculate({ ...base, salary: 5000, vacationTaxableGrosses: [2222.23] });
    expect(r.grossPay).toBe(5000);
    expect(r.inssBase).toBe(7222.23);
    expect(r.inssDiscount).toBe(636.94);
  });

  it('IRRF do salario usa o INSS devido no mes como deducao legal (636,94 > simplificado 607,20)', () => {
    const r = service.calculate({ ...base, salary: 5000, vacationTaxableGrosses: [2222.23] });
    expect(r.irrfBase).toBe(4363.06);
  });

  it('retorno nao ganha chaves novas (o objeto vai direto para o create do Prisma)', () => {
    const plain = service.calculate({ ...base, salary: 5000 });
    const withVacation = service.calculate({ ...base, salary: 5000, vacationTaxableGrosses: [2222.23] });
    expect(Object.keys(withVacation).sort()).toEqual(Object.keys(plain).sort());
  });

  it('base de ferias zero, negativa ou invalida cai no calculo isolado', () => {
    expect(service.calculate({ ...base, salary: 5000, vacationTaxableGrosses: [0] }).inssDiscount).toBe(501.51);
    expect(service.calculate({ ...base, salary: 5000, vacationTaxableGrosses: [-50] }).inssDiscount).toBe(501.51);
  });
});
