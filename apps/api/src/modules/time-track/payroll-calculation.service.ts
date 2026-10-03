import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface PayrollTaxBracket {
  limit: number | null;
  rate: number;
  deduction?: number;
}

export interface PayrollRuleParams {
  overtime50MinFactor: number;
  overtime100MinFactor: number;
  nightMinPercent: number;
  monthlyDivisorFactor: number;
}

export interface PayrollTaxContext {
  fgts?: { id: string | null; version: string; rate: number };
  params?: { id: string | null; version: string } & PayrollRuleParams;
  builtin?: string[];
  inss: {
    id: string;
    version: string;
    brackets: PayrollTaxBracket[];
  };
  irrf: {
    id: string;
    version: string;
    brackets: PayrollTaxBracket[];
    parameters: {
      dependentDeduction: number;
      simplifiedDeduction: number;
      fullExemptionLimit: number;
      partialExemptionLimit: number;
      partialReductionBase: number;
      partialReductionFactor: number;
    };
  };
}

export interface PayrollCalculationInput {
  salary: number;
  weeklyMinutes: number;
  overtime50Minutes: number;
  overtime100Minutes: number;
  nightShiftMinutes: number;
  absenceMinutes: number;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  payableWorkdays: number;
  paidRestDays: number;
  dependents?: number;
  overtime50Factor?: number;
  overtime100Factor?: number;
  nightShiftPercent?: number;
  dsrEnabled?: boolean;
  isPartialMonth?: boolean;
  scheduledMinutesInPeriod?: number;
  taxContext?: PayrollTaxContext;
}

export interface PayrollCalculationResult {
  salaryBase: number;
  monthlyDivisor: number;
  hourlyRate: number;
  overtime50Value: number;
  overtime100Value: number;
  nightShiftValue: number;
  dsrHours: number;
  dsrValue: number;
  absenceDiscount: number;
  lateDiscount: number;
  earlyLeaveDiscount: number;
  grossPay: number;
  inssBase: number;
  inssDiscount: number;
  irrfBase: number;
  irrfDiscount: number;
  fgtsBase: number;
  fgtsAmount: number;
  netPay: number;
  calculationVersion: string;
}

@Injectable()
export class PayrollCalculationService {
  static readonly VERSION = 'CLT_2026_1';
  static readonly DEFAULT_INSS: PayrollTaxBracket[] = [
    { limit: 1621, rate: 0.075 },
    { limit: 2902.84, rate: 0.09 },
    { limit: 4354.27, rate: 0.12 },
    { limit: 8475.55, rate: 0.14 },
  ];
  static readonly DEFAULT_IRRF: PayrollTaxBracket[] = [
    { limit: 2428.8, rate: 0, deduction: 0 },
    { limit: 2826.65, rate: 0.075, deduction: 182.16 },
    { limit: 3751.05, rate: 0.15, deduction: 394.16 },
    { limit: 4664.68, rate: 0.225, deduction: 675.49 },
    { limit: null, rate: 0.275, deduction: 908.73 },
  ];
  static readonly DEFAULT_FGTS_RATE = 0.08;
  static readonly DEFAULT_RULE_PARAMS: PayrollRuleParams = {
    overtime50MinFactor: 1.5,
    overtime100MinFactor: 2,
    nightMinPercent: 20,
    monthlyDivisorFactor: 5,
  };
  static readonly DEFAULT_IRRF_PARAMETERS = {
    dependentDeduction: 189.59,
    simplifiedDeduction: 607.2,
    fullExemptionLimit: 5000,
    partialExemptionLimit: 7350,
    partialReductionBase: 978.62,
    partialReductionFactor: 0.133145,
  };

  constructor(@Optional() private readonly prisma?: PrismaService) {}

  /**
   * Resolve as regras vigentes na competência (tabelas INSS/IRRF, alíquota do FGTS e parâmetros de folha).
   * Se alguma regra não estiver cadastrada, usa o padrão legal embutido e registra isso em `builtin`
   * (nunca bloqueia o fechamento com erro 400).
   */
  async resolveTaxContext(referenceDate: Date): Promise<PayrollTaxContext> {
    const tables = this.prisma
      ? await this.prisma.payrollTaxTable.findMany({
          where: {
            active: true,
            effectiveFrom: { lte: referenceDate },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: referenceDate } }],
          },
          orderBy: { effectiveFrom: 'desc' },
        })
      : [];
    const find = (type: string) => tables.find((table) => (table.taxType as string) === type);
    const builtin: string[] = [];

    const inssTable = find('INSS');
    const irrfTable = find('IRRF');
    const fgtsTable = find('FGTS');
    const paramsTable = find('PAYROLL_PARAMS');
    const D = PayrollCalculationService;

    let inss: PayrollTaxContext['inss'];
    if (inssTable) inss = { id: inssTable.id, version: inssTable.version, brackets: this.parseBrackets(inssTable.brackets, 'INSS') };
    else { builtin.push('INSS'); inss = { id: 'builtin', version: 'PADRAO_2026', brackets: D.DEFAULT_INSS }; }

    let irrf: PayrollTaxContext['irrf'];
    if (irrfTable) irrf = { id: irrfTable.id, version: irrfTable.version, brackets: this.parseBrackets(irrfTable.brackets, 'IRRF'), parameters: this.parseIrrfParameters(irrfTable.parameters) };
    else { builtin.push('IRRF'); irrf = { id: 'builtin', version: 'PADRAO_2026', brackets: D.DEFAULT_IRRF, parameters: D.DEFAULT_IRRF_PARAMETERS }; }

    let fgts: NonNullable<PayrollTaxContext['fgts']>;
    if (fgtsTable) {
      const rate = Number((Array.isArray(fgtsTable.brackets) ? (fgtsTable.brackets as any[])[0]?.rate : undefined) ?? D.DEFAULT_FGTS_RATE);
      fgts = { id: fgtsTable.id, version: fgtsTable.version, rate: Number.isFinite(rate) && rate > 0 && rate < 1 ? rate : D.DEFAULT_FGTS_RATE };
    } else { builtin.push('FGTS'); fgts = { id: 'builtin', version: 'PADRAO_2026', rate: D.DEFAULT_FGTS_RATE }; }

    let params: NonNullable<PayrollTaxContext['params']>;
    if (paramsTable) {
      const source = (paramsTable.parameters ?? {}) as Record<string, unknown>;
      const read = (key: keyof PayrollRuleParams) => {
        const value = Number(source[key]);
        return Number.isFinite(value) && value > 0 ? value : D.DEFAULT_RULE_PARAMS[key];
      };
      params = { id: paramsTable.id, version: paramsTable.version, overtime50MinFactor: read('overtime50MinFactor'), overtime100MinFactor: read('overtime100MinFactor'), nightMinPercent: read('nightMinPercent'), monthlyDivisorFactor: read('monthlyDivisorFactor') };
    } else { builtin.push('PAYROLL_PARAMS'); params = { id: 'builtin', version: 'PADRAO_2026', ...D.DEFAULT_RULE_PARAMS }; }

    return { inss, irrf, fgts, params, ...(builtin.length ? { builtin } : {}) };
  }

  calculate(input: PayrollCalculationInput): PayrollCalculationResult {
    let salaryBase = this.money(Math.max(0, input.salary));
    const weeklyHours = Math.max(1, input.weeklyMinutes / 60);
    const rules = input.taxContext?.params ?? { ...PayrollCalculationService.DEFAULT_RULE_PARAMS };
    const monthlyDivisor = Math.max(1, weeklyHours * rules.monthlyDivisorFactor);
    const hourlyRate = salaryBase / monthlyDivisor;
    const overtime50Factor = Math.max(rules.overtime50MinFactor, input.overtime50Factor ?? rules.overtime50MinFactor);
    const overtime100Factor = Math.max(rules.overtime100MinFactor, input.overtime100Factor ?? rules.overtime100MinFactor);
    const nightShiftPercent = Math.max(rules.nightMinPercent, input.nightShiftPercent ?? rules.nightMinPercent) / 100;

    const isPartialMonth = input.isPartialMonth === true;
    if (isPartialMonth && (input.scheduledMinutesInPeriod ?? 0) > 0) {
      salaryBase = this.money(hourlyRate * (input.scheduledMinutesInPeriod! / 60));
    }

    const overtime50Value = this.money((input.overtime50Minutes / 60) * hourlyRate * overtime50Factor);
    const overtime100Value = this.money((input.overtime100Minutes / 60) * hourlyRate * overtime100Factor);
    const nightShiftValue = this.money((input.nightShiftMinutes / 60) * hourlyRate * nightShiftPercent);
    const variablePay = overtime50Value + overtime100Value + nightShiftValue;
    const payableWorkdays = Math.max(0, input.payableWorkdays);
    const paidRestDays = Math.max(0, input.paidRestDays);
    const dsrValue = input.dsrEnabled !== false && payableWorkdays > 0
      ? this.money((variablePay / payableWorkdays) * paidRestDays)
      : 0;
    const dsrHours = hourlyRate > 0 ? this.hours(dsrValue / hourlyRate) : 0;
    
    // In partial months, absences might have been correctly accounted for in the reduced salary base depending on interpretation.
    // However, if we reduced the salary base based on scheduled hours of that short period, we should STILL deduct absences that happened in that period.
    const absenceDiscount = this.money((Math.max(0, input.absenceMinutes) / 60) * hourlyRate);
    const lateDiscount = this.money((Math.max(0, input.lateMinutes ?? 0) / 60) * hourlyRate);
    const earlyLeaveDiscount = this.money((Math.max(0, input.earlyLeaveMinutes ?? 0) / 60) * hourlyRate);
    const totalJornadaDeduction = absenceDiscount + lateDiscount + earlyLeaveDiscount;
    
    const grossPay = this.money(Math.max(0, salaryBase + variablePay + dsrValue - totalJornadaDeduction));
    const inssDiscount = this.calculateInss(grossPay, input.taxContext?.inss.brackets);
    const irrfParameters = input.taxContext?.irrf.parameters ?? PayrollCalculationService.DEFAULT_IRRF_PARAMETERS;
    const legalDeductions = inssDiscount + Math.max(0, input.dependents ?? 0) * irrfParameters.dependentDeduction;
    const irrfDeduction = Math.max(irrfParameters.simplifiedDeduction, legalDeductions);
    const irrfBase = this.money(Math.max(0, grossPay - irrfDeduction));
    const irrfDiscount = this.calculateIrrf(
      irrfBase,
      grossPay,
      input.taxContext?.irrf.brackets,
      irrfParameters,
    );
    const fgtsAmount = this.money(grossPay * (input.taxContext?.fgts?.rate ?? PayrollCalculationService.DEFAULT_FGTS_RATE));
    const netPay = this.money(Math.max(0, grossPay - inssDiscount - irrfDiscount));

    return {
      salaryBase,
      monthlyDivisor,
      hourlyRate: this.precision(hourlyRate, 6),
      overtime50Value,
      overtime100Value,
      nightShiftValue,
      dsrHours,
      dsrValue,
      absenceDiscount,
      lateDiscount,
      earlyLeaveDiscount,
      grossPay,
      inssBase: grossPay,
      inssDiscount,
      irrfBase,
      irrfDiscount,
      fgtsBase: grossPay,
      fgtsAmount,
      netPay,
      calculationVersion: input.taxContext
        ? [PayrollCalculationService.VERSION, input.taxContext.inss.version, input.taxContext.irrf.version, input.taxContext.fgts ? `FGTS:${input.taxContext.fgts.version}` : null, input.taxContext.params ? `PARAMS:${input.taxContext.params.version}` : null].filter(Boolean).join('|')
        : PayrollCalculationService.VERSION,
    };
  }

  /** Aplica INSS, IRRF e FGTS (regras vigentes) sobre um bruto já apurado. Usado para recalcular folhas sem divergir do motor. */
  applyTaxes(grossPay: number, dependents: number, taxContext?: PayrollTaxContext) {
    const gross = this.money(Math.max(0, grossPay));
    const inssDiscount = this.calculateInss(gross, taxContext?.inss.brackets);
    const parameters = taxContext?.irrf.parameters ?? PayrollCalculationService.DEFAULT_IRRF_PARAMETERS;
    const legalDeductions = inssDiscount + Math.max(0, dependents) * parameters.dependentDeduction;
    const irrfBase = this.money(Math.max(0, gross - Math.max(parameters.simplifiedDeduction, legalDeductions)));
    const irrfDiscount = this.calculateIrrf(irrfBase, gross, taxContext?.irrf.brackets, parameters);
    const fgtsAmount = this.money(gross * (taxContext?.fgts?.rate ?? PayrollCalculationService.DEFAULT_FGTS_RATE));
    const netPay = this.money(Math.max(0, gross - inssDiscount - irrfDiscount));
    return { grossPay: gross, inssDiscount, irrfBase, irrfDiscount, fgtsAmount, netPay };
  }

  calculateInss(base: number, bands = PayrollCalculationService.DEFAULT_INSS): number {
    let previous = 0;
    let contribution = 0;
    const lastLimit = bands[bands.length - 1]?.limit;
    if (lastLimit == null) throw new BadRequestException('Tabela INSS invalida: a ultima faixa deve possuir teto.');
    const capped = Math.min(Math.max(0, base), lastLimit);

    for (const band of bands) {
      if (band.limit == null) break;
      const taxable = Math.max(0, Math.min(capped, band.limit) - previous);
      contribution += taxable * band.rate;
      previous = band.limit;
      if (capped <= band.limit) break;
    }
    return this.money(contribution);
  }

  calculateIrrf(
    base: number,
    taxableIncome: number,
    table = PayrollCalculationService.DEFAULT_IRRF,
    parameters = PayrollCalculationService.DEFAULT_IRRF_PARAMETERS,
  ): number {
    const bracket = table.find((item) => item.limit == null || base <= item.limit) ?? table[table.length - 1];
    const taxBeforeReduction = Math.max(0, base * bracket.rate - (bracket.deduction ?? 0));
    let reduction = 0;
    if (taxableIncome <= parameters.fullExemptionLimit) {
      reduction = taxBeforeReduction;
    } else if (taxableIncome <= parameters.partialExemptionLimit) {
      reduction = Math.max(
        0,
        parameters.partialReductionBase - parameters.partialReductionFactor * taxableIncome,
      );
    }
    return this.money(Math.max(0, taxBeforeReduction - Math.min(taxBeforeReduction, reduction)));
  }

  private parseBrackets(value: unknown, type: string): PayrollTaxBracket[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new BadRequestException(`Tabela ${type} invalida: faixas tributarias ausentes.`);
    }
    const brackets = value.map((item) => {
      const source = item as Record<string, unknown>;
      const limit = source.limit == null ? null : Number(source.limit);
      const rate = Number(source.rate);
      const deduction = source.deduction == null ? undefined : Number(source.deduction);
      if ((limit != null && (!Number.isFinite(limit) || limit <= 0)) || !Number.isFinite(rate) || rate < 0) {
        throw new BadRequestException(`Tabela ${type} invalida: faixa tributaria malformada.`);
      }
      return { limit, rate, ...(deduction == null ? {} : { deduction }) };
    });
    return brackets;
  }

  private parseIrrfParameters(value: unknown): PayrollTaxContext['irrf']['parameters'] {
    const source = (value ?? {}) as Record<string, unknown>;
    const defaults = PayrollCalculationService.DEFAULT_IRRF_PARAMETERS;
    const parsed = {
      dependentDeduction: Number(source.dependentDeduction ?? defaults.dependentDeduction),
      simplifiedDeduction: Number(source.simplifiedDeduction ?? defaults.simplifiedDeduction),
      fullExemptionLimit: Number(source.fullExemptionLimit ?? defaults.fullExemptionLimit),
      partialExemptionLimit: Number(source.partialExemptionLimit ?? defaults.partialExemptionLimit),
      partialReductionBase: Number(source.partialReductionBase ?? defaults.partialReductionBase),
      partialReductionFactor: Number(source.partialReductionFactor ?? defaults.partialReductionFactor),
    };
    if (Object.values(parsed).some((item) => !Number.isFinite(item) || item < 0)) {
      throw new BadRequestException('Tabela IRRF invalida: parametros malformados.');
    }
    return parsed;
  }

  private money(value: number): number {
    return this.precision(value, 2);
  }

  private hours(value: number): number {
    return this.precision(value, 4);
  }

  private precision(value: number, digits: number): number {
    const factor = 10 ** digits;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
}
