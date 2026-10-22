import { vacationTaxableGross } from './vacation-tax-base';

describe('vacationTaxableGross (ferias gozadas + 1/3)', () => {
  it('salario 5.000, 10 dias: 1.666,67 + 1/3 de 555,56 = 2.222,23', () => {
    expect(vacationTaxableGross(5000, 10)).toBe(2222.23);
  });

  it('salario 3.000, 30 dias: 3.000 + 1.000 = 4.000', () => {
    expect(vacationTaxableGross(3000, 30)).toBe(4000);
  });

  it('arredonda por componente como o recibo: 2.200 x 5 dias = 366,67 + 122,22', () => {
    expect(vacationTaxableGross(2200, 5)).toBe(488.89);
  });

  it('entradas invalidas nao geram base tributavel', () => {
    expect(vacationTaxableGross(0, 10)).toBe(0);
    expect(vacationTaxableGross(5000, 0)).toBe(0);
    expect(vacationTaxableGross(Number.NaN, 10)).toBe(0);
    expect(vacationTaxableGross(5000, -3)).toBe(0);
  });
});
