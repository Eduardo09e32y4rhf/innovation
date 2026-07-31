import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface PayrollTaxBracket {
  limit: number | null;
  rate: number;
  deduction?: number;
}

export interface PayrollTaxContext {
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
  private static readonly DEFAULT_INSS: PayrollTaxBracket[] = [
    { limit: 1621, rate: 0.075 },
    { limit: 2902.84, rate: 0.09 },
    { limit: 4354.27, rate: 0.12 },
    { limit: 8475.55, rate: 0.14 },
  ];
  private static readonly DEFAULT_IRRF: PayrollTaxBracket[] = [
    { limit: 2428.8, rate: 0, deduction: 0 },
    { limit: 2826.65, rate: 0.075, deduction: 182.16 },
    { limit: 3751.05, rate: 0.15, deduction: 394.16 },
    { limit: 4664.68, rate: 0.225, deduction: 675.49 },
    { limit: null, rate: 0.275, deduction: 908.73 },
  ];
  private static readonly DEFAULT_IRRF_PARAMETERS = {
    dependentDeduction: 189.59,
    simplifiedDeduction: 607.2,
    fullExemptionLimit: 5000,
    partialExemptionLimit: 7350,
    partialReductionBase: 978.62,
    partialReductionFactor: 0.133145,
  };

  constructor(@Optional() private readonly prisma?: PrismaService) {}

  async resolveTaxContext(referenceDate: Date): Promise<PayrollTaxContext> {
    if (!this.prisma) {
      throw new BadRequestException('Servico de tabelas tributarias indisponivel para o fechamento oficial.');
    }
    const tables = await this.prisma.payrollTaxTable.findMany({
      where: {
        active: true,
        effectiveFrom: { lte: referenceDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: referenceDate } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    const inss = tables.find((table) => table.taxType === 'INSS');
    const irrf = tables.find((table) => table.taxType === 'IRRF');
    if (!inss || !irrf) {
      const competence = `${referenceDate.getUTCFullYear()}-${String(referenceDate.getUTCMonth() + 1).padStart(2, '0')}`;
      throw new BadRequestException(
        `Fechamento bloqueado: nao existe tabela tributaria INSS e IRRF ativa para a competencia ${competence}.`,
      );
    }

    return {
      inss: {
        id: inss.id,
        version: inss.version,
        brackets: this.parseBrackets(inss.brackets, 'INSS'),
      },
      irrf: {
        id: irrf.id,
        version: irrf.version,
        brackets: this.parseBrackets(irrf.brackets, 'IRRF'),
        parameters: this.parseIrrfParameters(irrf.parameters),
      },
    };
  }

  calculate(input: PayrollCalculationInput): PayrollCalculationResult {
    let salaryBase = this.money(Math.max(0, input.salary));
    const weeklyHours = Math.max(1, input.weeklyMinutes / 60);
    const monthlyDivisor = Math.max(1, weeklyHours * 5);
    const hourlyRate = salaryBase / monthlyDivisor;
    const overtime50Factor = Math.max(1.5, input.overtime50Factor ?? 1.5);
    const overtime100Factor = Math.max(2, input.overtime100Factor ?? 2);
    const nightShiftPercent = Math.max(20, input.nightShiftPercent ?? 20) / 100;

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
    const fgtsAmount = this.money(grossPay * 0.08);
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
        ? `${PayrollCalculationService.VERSION}|${input.taxContext.inss.version}|${input.taxContext.irrf.version}`
        : PayrollCalculationService.VERSION,
    };
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
