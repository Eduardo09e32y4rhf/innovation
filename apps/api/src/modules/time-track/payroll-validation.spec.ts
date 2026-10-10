import { PayrollCalculationService } from './payroll-calculation.service';
import { overtimePaymentRatio } from './overtime-policy';

const calc = new PayrollCalculationService();
const base = { salary: 3000, weeklyMinutes: 2640, overtime50Minutes: 0, overtime100Minutes: 0, nightShiftMinutes: 0, absenceMinutes: 0, payableWorkdays: 22, paidRestDays: 8 };

describe('regra unica de pagamento da hora extra', () => {
  const day = { overtime50Minutes: 60, overtime100Minutes: 0 };

  it('so a extra autorizada e paga: pendente e recusada nunca entram na folha', () => {
    expect(overtimePaymentRatio({ ...day, overtimeApprovalStatus: 'PENDING', overtimeHandling: 'PAYMENT' })).toBe(0);
    expect(overtimePaymentRatio({ ...day, overtimeApprovalStatus: 'REJECTED', overtimeHandling: 'PAYMENT' })).toBe(0);
    expect(overtimePaymentRatio({ ...day, overtimeApprovalStatus: null, overtimeHandling: 'PAYMENT' })).toBe(0);
  });

  it('autorizada e paga na folha: 100%', () => {
    expect(overtimePaymentRatio({ ...day, overtimeApprovalStatus: 'APPROVED', overtimeHandling: 'PAYMENT' })).toBe(1);
    expect(overtimePaymentRatio({ ...day, overtimeApprovalStatus: 'APPROVED', overtimeHandling: null })).toBe(1);
  });

  it('o que foi para o banco de horas nao e pago (nem ao forcar a politica da empresa)', () => {
    expect(overtimePaymentRatio({ ...day, overtimeApprovalStatus: 'APPROVED', overtimeHandling: 'BANK' })).toBe(0);
    expect(overtimePaymentRatio({ ...day, overtimeApprovalStatus: 'APPROVED', overtimeHandling: 'PAYMENT' }, 'BANK')).toBe(0);
    expect(overtimePaymentRatio({ ...day, overtimeApprovalStatus: 'APPROVED', overtimeHandling: 'BANK' }, 'PAYMENT')).toBe(1);
  });

  it('metade no banco, metade no pagamento (SPLIT) respeita os minutos pagos e nunca passa de 100%', () => {
    expect(overtimePaymentRatio({ overtime50Minutes: 120, overtime100Minutes: 0, overtimeApprovalStatus: 'APPROVED', overtimeHandling: 'SPLIT', overtimePaymentMinutes: 60 })).toBe(0.5);
    expect(overtimePaymentRatio({ overtime50Minutes: 60, overtime100Minutes: 0, overtimeApprovalStatus: 'APPROVED', overtimeHandling: 'SPLIT', overtimePaymentMinutes: 999 })).toBe(1);
  });

  it('sem hora extra no dia nao ha o que pagar', () => {
    expect(overtimePaymentRatio({ overtime50Minutes: 0, overtime100Minutes: 0, overtimeApprovalStatus: 'APPROVED', overtimeHandling: 'PAYMENT' })).toBe(0);
  });
});

describe('impostos da folha: valores conferidos a mao', () => {
  it('INSS no teto de 2026 = R$ 988,09 e nunca passa disso', () => {
    expect(calc.calculateInss(8475.55)).toBe(988.09);
    expect(calc.calculateInss(50000)).toBe(988.09);
  });

  it('INSS e crescente com o salario e nunca negativo', () => {
    let previous = -1;
    for (let salary = 0; salary <= 12000; salary += 137) {
      const inss = calc.calculateInss(salary);
      expect(inss).toBeGreaterThanOrEqual(previous);
      expect(inss).toBeGreaterThanOrEqual(0);
      previous = inss;
    }
  });

  it('salario de R$ 3.000: INSS 248,60 e IRRF zero', () => {
    const result = calc.calculate({ ...base, salary: 3000 });
    expect(result.inssDiscount).toBe(248.6);
    expect(result.irrfDiscount).toBe(0);
    expect(result.netPay).toBe(2751.4);
  });

  it('ate R$ 5.000 de bruto nao ha IRRF (isencao) e logo acima nao ha degrau', () => {
    expect(calc.calculate({ ...base, salary: 5000 }).irrfDiscount).toBe(0);
    const justAbove = calc.calculate({ ...base, salary: 5000.5 }).irrfDiscount;
    expect(justAbove).toBeLessThan(1);
  });

  it('IRRF so cresce com o salario (sem degrau para baixo) e o liquido nunca passa do bruto', () => {
    let previousIrrf = 0;
    for (let salary = 1500; salary <= 20000; salary += 250) {
      const r = calc.calculate({ ...base, salary });
      expect(Number.isFinite(r.netPay) && Number.isFinite(r.grossPay)).toBe(true);
      expect(r.irrfDiscount).toBeGreaterThanOrEqual(previousIrrf - 0.01);
      expect(r.netPay).toBeLessThanOrEqual(r.grossPay);
      expect(r.netPay).toBeGreaterThanOrEqual(0);
      previousIrrf = r.irrfDiscount;
    }
  });

  it('liquido = bruto - INSS - IRRF, e o FGTS (8%) nao e descontado do funcionario', () => {
    const r = calc.calculate({ ...base, salary: 4200, overtime50Minutes: 180 });
    expect(r.netPay).toBeCloseTo(r.grossPay - r.inssDiscount - r.irrfDiscount, 2);
    expect(r.fgtsAmount).toBeCloseTo(r.grossPay * 0.08, 2);
  });

  it('hora extra 50% e 100% pagam o minimo legal e faltas e atrasos descontam pelo valor da hora', () => {
    const hour = 3000 / 220;
    const extra = calc.calculate({ ...base, overtime50Minutes: 60, overtime100Minutes: 60 });
    expect(extra.overtime50Value).toBeCloseTo(hour * 1.5, 2);
    expect(extra.overtime100Value).toBeCloseTo(hour * 2, 2);
    const absent = calc.calculate({ ...base, absenceMinutes: 480, lateMinutes: 30 });
    expect(absent.absenceDiscount).toBeCloseTo(hour * 8, 2);
    expect(absent.lateDiscount).toBeCloseTo(hour * 0.5, 2);
    expect(absent.grossPay).toBeLessThan(3000);
  });

  it('entrada invalida nao gera NaN', () => {
    const r = calc.calculate({ ...base, salary: -10, weeklyMinutes: 0, payableWorkdays: 0, paidRestDays: -3, absenceMinutes: -5 });
    for (const value of Object.values(r)) if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
  });
});
