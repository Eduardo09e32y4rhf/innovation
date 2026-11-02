import { describe, expect, it } from 'vitest';
import { checkLoanMargin, checkPayrollLimits, checkTransportLimit, isDeductionType, POST_TAX_DEDUCTION_TYPES } from './clt-discounts';
import { buildFiscalSummary } from './payroll-fiscal-summary';
import { validatePayroll, type ValidationInput } from './payroll-validation';

describe('limites dos descontos CLT', () => {
  it('empréstimo + consignado até 35% da remuneração líquida disponível passam', () => {
    // disponível = 5000 - 450 - 200 = 4350; 35% = 1522,50
    expect(checkLoanMargin(1522.5, 5000, 450, 200).exceeded).toBe(false);
    const over = checkLoanMargin(1522.51 + 0.01, 5000, 450, 200);
    expect(over.exceeded).toBe(true);
    expect(over.limit).toBe(1522.5);
    expect(over.message).toContain('35%');
  });
  it('VT limitado a 6% do salário base', () => {
    expect(checkTransportLimit(180, 3000).exceeded).toBe(false);
    expect(checkTransportLimit(180.5, 3000).exceeded).toBe(true);
  });
  it('soma CLT_LOAN e CONSIGNADO juntos', () => {
    const r = checkPayrollLimits([{ type: 'CLT_LOAN', amount: 800 }, { type: 'CONSIGNADO', amount: 800 }, { type: 'VALE_TRANSPORTE', amount: 100 }], { baseSalary: 3000, grossSalary: 3000, inssAmount: 250, irrfAmount: 0 });
    expect(r.loan.total).toBe(1600);
    expect(r.loan.exceeded).toBe(true); // 35% de 2750 = 962,50
    expect(r.transport.exceeded).toBe(false);
  });
  it('novos tipos são descontos pós-imposto', () => {
    for (const t of ['CLT_LOAN', 'CONSIGNADO', 'VALE_TRANSPORTE', 'VALE_ALIMENTACAO', 'PENSAO_ALIMENTICIA', 'PLANO_SAUDE', 'ADVANCE']) {
      expect(POST_TAX_DEDUCTION_TYPES as readonly string[]).toContain(t);
      expect(isDeductionType(t)).toBe(true);
    }
    expect(isDeductionType('BONUS')).toBe(false);
  });
});

const base = (over: Partial<ValidationInput> = {}): ValidationInput => ({
  payrollId: 'p1', employeeId: 'e1', name: 'Ana',
  baseSalary: 3000, grossSalary: 3000, netSalary: 2700, inssAmount: 200, irrfAmount: 100, fgtsAmount: 240,
  items: [{ type: 'BASE_SALARY', amount: 3000 }, { type: 'INSS', amount: 200 }, { type: 'IRRF', amount: 100 }, { type: 'FGTS', amount: 240 }],
  expectedTaxes: { inssDiscount: 200, irrfDiscount: 100, fgtsAmount: 240 }, paidOvertimeMinutes: 0, ...over,
});

describe('validatePayroll', () => {
  it('folha consistente não tem problemas', () => expect(validatePayroll(base())).toEqual([]));
  it('acusa líquido diferente de bruto - descontos', () => {
    expect(validatePayroll(base({ netSalary: 2800 })).map((i) => i.code)).toContain('NET_MISMATCH');
  });
  it('desconta consignado/VT no líquido esperado', () => {
    const items = [...base().items, { type: 'CONSIGNADO', amount: 300, isManual: true, manualReason: 'contrato 123' }];
    expect(validatePayroll(base({ items, netSalary: 2400 }))).toEqual([]);
  });
  it('acusa impostos fora da tabela do snapshot', () => {
    const codes = validatePayroll(base({ expectedTaxes: { inssDiscount: 210, irrfDiscount: 90, fgtsAmount: 200 } })).map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(['INSS_MISMATCH', 'IRRF_MISMATCH', 'FGTS_MISMATCH']));
  });
  it('avisa quando não há snapshot', () => {
    expect(validatePayroll(base({ expectedTaxes: null }))[0].code).toBe('NO_TAX_SNAPSHOT');
  });
  it('horas extras automáticas sem ponto são erro; manuais, alerta', () => {
    const auto = base({ grossSalary: 3500, netSalary: 3200, items: [...base().items, { type: 'OVERTIME', amount: 500 }], expectedTaxes: { inssDiscount: 200, irrfDiscount: 100, fgtsAmount: 240 } });
    expect(validatePayroll(auto).find((i) => i.code === 'OVERTIME_WITHOUT_TIME_TRACK')?.severity).toBe('ERROR');
    const manual = base({ grossSalary: 3500, netSalary: 3200, items: [...base().items, { type: 'OVERTIME', amount: 500, isManual: true, manualReason: 'acordo' }] });
    expect(validatePayroll(manual).find((i) => i.code === 'OVERTIME_WITHOUT_TIME_TRACK')?.severity).toBe('WARNING');
  });
  it('ponto com hora extra paga e folha sem provento gera alerta', () => {
    expect(validatePayroll(base({ paidOvertimeMinutes: 90 })).map((i) => i.code)).toContain('OVERTIME_NOT_PAID');
  });
  it('item manual sem motivo é erro', () => {
    const items = [...base().items, { type: 'BONUS', amount: 100, description: 'Bônus', isManual: true, manualReason: ' ' }];
    const codes = validatePayroll(base({ items, grossSalary: 3100, netSalary: 2800 })).map((i) => i.code);
    expect(codes).toContain('MANUAL_WITHOUT_REASON');
  });
  it('limite de consignado excedido vira alerta', () => {
    const items = [...base().items, { type: 'CONSIGNADO', amount: 1500, isManual: true, manualReason: 'ok' }];
    expect(validatePayroll(base({ items, netSalary: 1200 })).find((i) => i.code === 'LOAN_MARGIN_EXCEEDED')?.severity).toBe('WARNING');
  });
});

describe('buildFiscalSummary', () => {
  it('soma líquido, descontos por tipo, encargos e custo', () => {
    const s = buildFiscalSummary([
      { grossSalary: 3000, netSalary: 2400, inssAmount: 200, irrfAmount: 100, fgtsAmount: 240, items: [{ type: 'INSS', amount: 200 }, { type: 'IRRF', amount: 100 }, { type: 'CONSIGNADO', amount: 300 }, { type: 'FGTS', amount: 240 }, { type: 'ABSENCE_DEDUCTION', amount: 50 }] },
      { grossSalary: 2000, netSalary: 1800, inssAmount: 150, irrfAmount: 0, fgtsAmount: 160, items: [{ type: 'INSS', amount: 150 }, { type: 'CLT_LOAN', amount: 50 }] },
    ]);
    expect(s.netToPay).toBe(4200);
    expect(s.totalDiscounts).toBe(800);
    expect(s.discountsByType.map((d) => d.type)).toEqual(['INSS', 'CONSIGNADO', 'IRRF', 'CLT_LOAN']);
    expect(s.charges.fgts).toBe(400);
    expect(s.charges.employerInss).toBe(1000);
    expect(s.companyCost).toBe(6400);
  });
});
