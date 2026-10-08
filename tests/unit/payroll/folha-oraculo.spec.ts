import { describe, expect, it } from 'vitest';
import { PayrollCalculationService } from '../../../apps/api/src/modules/time-track/payroll-calculation.service';
// @ts-expect-error módulo .mjs compartilhado com o robô de API (sem tipos)
import { centavos, compararFolha, folhaOraculo, inss, invariantes, irrf, TABELAS } from '../../../tools/robo-api/oracle/folha-clt-2026.mjs';

/**
 * Robô de cálculo: compara o motor de folha do sistema com um oráculo independente (tools/robo-api/oracle),
 * escrito só a partir de docs/CLT_PAYROLL_RULES_2026.md. Divergência = um dos dois está errado.
 */
const service = new PayrollCalculationService();

const paraSistema = (e: any) => service.calculate({
  salary: e.salario, weeklyMinutes: e.minutosSemana, overtime50Minutes: e.he50, overtime100Minutes: e.he100, nightShiftMinutes: e.noturno,
  absenceMinutes: e.faltas, lateMinutes: e.atrasos, earlyLeaveMinutes: e.saidasAntecipadas, payableWorkdays: e.diasUteis, paidRestDays: e.diasDescanso,
  dependents: e.dependentes, dsrEnabled: e.dsr,
});

describe('tabelas oficiais 2026 (conferência direta)', () => {
  it('INSS: máximo no teto é R$ 988,09 e cada faixa é progressiva', () => {
    expect(inss(8475.55)).toBe(988.09);
    expect(inss(1621)).toBe(121.58);
    expect(inss(100000)).toBe(988.09); // acima do teto não aumenta
    expect(service.calculateInss(8475.55)).toBe(988.09);
  });
  it('IRRF: isento até R$ 5.000 e imposto cheio acima de R$ 7.350 (redução da Lei 15.270/2025)', () => {
    expect(service.calculateIrrf(0, 5000)).toBe(0);
    for (const bruto of [3000, 4800, 5000]) expect(irrf(bruto, inss(bruto)).imposto).toBe(0);
    expect(irrf(7350, inss(7350)).imposto).toBeGreaterThanOrEqual(0);
    expect(irrf(9000, inss(9000)).imposto).toBeGreaterThan(0);
  });
  it('as tabelas embutidas no sistema são as mesmas do oráculo', () => {
    const d = PayrollCalculationService;
    expect(d.DEFAULT_INSS.map((f) => [f.limit, f.rate])).toEqual(TABELAS.inss.faixas);
    expect(d.DEFAULT_IRRF.map((f) => [f.limit ?? Infinity, f.rate, f.deduction])).toEqual(TABELAS.irrf.faixas);
    expect(d.DEFAULT_IRRF_PARAMETERS).toMatchObject({ simplifiedDeduction: 607.2, dependentDeduction: 189.59, fullExemptionLimit: 5000, partialExemptionLimit: 7350, partialReductionBase: 978.62, partialReductionFactor: 0.133145 });
    expect(d.DEFAULT_FGTS_RATE).toBe(TABELAS.fgts);
    expect(d.VERSION).toBe(TABELAS.versao);
  });
});

describe('INSS e IRRF: propriedades que valem para qualquer valor', () => {
  it('INSS é crescente e contínuo (nenhum salto maior que 14% do degrau)', () => {
    let anterior = service.calculateInss(0);
    for (let base = 10; base <= 9000; base += 10) {
      const atual = service.calculateInss(base);
      expect(atual).toBeGreaterThanOrEqual(anterior);
      expect(atual - anterior).toBeLessThanOrEqual(10 * 0.14 + 0.011);
      anterior = atual;
    }
  });
  it('IRRF nunca diminui quando o salário sobe e nunca passa de 27,5% do bruto', () => {
    let anterior = 0;
    for (let bruto = 0; bruto <= 20000; bruto += 50) {
      const r = service.applyTaxes(bruto, 0);
      expect(r.irrfDiscount).toBeGreaterThanOrEqual(anterior - 0.011);
      expect(r.irrfDiscount).toBeLessThanOrEqual(bruto * 0.275 + 0.011);
      anterior = r.irrfDiscount;
    }
  });
  it('mais dependentes nunca aumentam o IRRF', () => {
    for (const bruto of [3500, 5200, 6800, 9000, 15000]) {
      const irs = [0, 1, 2, 4].map((d) => service.applyTaxes(bruto, d).irrfDiscount);
      for (let i = 1; i < irs.length; i++) expect(irs[i]).toBeLessThanOrEqual(irs[i - 1] + 0.011);
    }
  });
});

describe('folha completa: sistema x oráculo em uma grade de casos', () => {
  const casos: any[] = [];
  for (const salario of [1621, 2500, 3000, 4999.99, 5000.01, 6500, 7350, 8475.55, 12000, 30000])
    for (const minutosSemana of [44 * 60, 40 * 60, 36 * 60])
      for (const he50 of [0, 90, 600])
        for (const he100 of [0, 240])
          for (const noturno of [0, 300])
            for (const faltas of [0, 480])
              for (const atrasos of [0, 25])
                for (const dependentes of [0, 2])
                  casos.push({ salario, minutosSemana, he50, he100, noturno, faltas, atrasos, saidasAntecipadas: atrasos ? 10 : 0, diasUteis: 26, diasDescanso: 4, dependentes, dsr: true });

  it(`${casos.length} casos: nenhum campo diverge do oráculo e nenhuma regra geral quebra`, () => {
    const falhas: string[] = [];
    for (const caso of casos) {
      const sistema = paraSistema(caso);
      const dif = compararFolha(sistema, folhaOraculo(caso));
      const inv = invariantes(sistema);
      if (dif.length || inv.length) falhas.push(`${JSON.stringify(caso)} → ${[...dif.map((d: any) => `${d.campo}: esperado ${d.esperado}, sistema ${d.obtido}`), ...inv].join(' | ')}`);
      if (falhas.length >= 10) break;
    }
    expect(falhas, falhas.join('\n')).toEqual([]);
  });

  it('DSR desligado zera o reflexo; salário zero não quebra', () => {
    expect(paraSistema({ ...casos[0], dsr: false }).dsrValue).toBe(0);
    const zero = paraSistema({ ...casos[0], salario: 0 });
    expect(zero.grossPay).toBe(0);
    expect(zero.netPay).toBe(0);
  });

  it('exemplos do documento: 44h → divisor 220; 40h → 200; 36h → 180; salário entra uma única vez', () => {
    expect(paraSistema({ ...casos[0], minutosSemana: 44 * 60 }).monthlyDivisor).toBe(220);
    expect(paraSistema({ ...casos[0], minutosSemana: 40 * 60 }).monthlyDivisor).toBe(200);
    expect(paraSistema({ ...casos[0], minutosSemana: 36 * 60 }).monthlyDivisor).toBe(180);
    const simples = paraSistema({ salario: 3000, minutosSemana: 44 * 60, he50: 0, he100: 0, noturno: 0, faltas: 0, atrasos: 0, saidasAntecipadas: 0, diasUteis: 26, diasDescanso: 4, dependentes: 0, dsr: true });
    expect(simples.grossPay).toBe(3000);
    expect(centavos(simples.fgtsAmount)).toBe(240);
  });
});
