import { Injectable } from '@nestjs/common';

export interface PayrollCalculationInput {
  salary: number;
  weeklyMinutes: number;
  overtime50Minutes: number;
  overtime100Minutes: number;
  nightShiftMinutes: number;
  absenceMinutes: number;
  payableWorkdays: number;
  paidRestDays: number;
  dependents?: number;
  overtime50Factor?: number;
  overtime100Factor?: number;
  nightShiftPercent?: number;
  dsrEnabled?: boolean;
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

  calculate(input: PayrollCalculationInput): PayrollCalculationResult {
    const salaryBase = this.money(Math.max(0, input.salary));
    const weeklyHours = Math.max(1, input.weeklyMinutes / 60);
    const monthlyDivisor = Math.max(1, Math.round(weeklyHours * 5));
    const hourlyRate = salaryBase / monthlyDivisor;
    const overtime50Factor = Math.max(1.5, input.overtime50Factor ?? 1.5);
    const overtime100Factor = Math.max(2, input.overtime100Factor ?? 2);
    const nightShiftPercent = Math.max(20, input.nightShiftPercent ?? 20) / 100;

    let salaryBase = this.money(Math.max(0, input.salary));
    const isPartialMonth = (input as any).isPartialMonth === true;
    if (isPartialMonth && (input as any).scheduledMinutesInPeriod > 0) {
      salaryBase = this.money(hourlyRate * ((input as any).scheduledMinutesInPeriod / 60));
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
    
    const grossPay = this.money(Math.max(0, salaryBase + variablePay + dsrValue - absenceDiscount));
    const inssDiscount = this.calculateInss(grossPay);
    const legalDeductions = inssDiscount + Math.max(0, input.dependents ?? 0) * 189.59;
    const irrfDeduction = Math.max(607.2, legalDeductions);
    const irrfBase = this.money(Math.max(0, grossPay - irrfDeduction));
    const irrfDiscount = this.calculateIrrf(irrfBase, grossPay);
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
      grossPay,
      inssBase: grossPay,
      inssDiscount,
      irrfBase,
      irrfDiscount,
      fgtsBase: grossPay,
      fgtsAmount,
      netPay,
      calculationVersion: PayrollCalculationService.VERSION,
    };
  }

  calculateInss(base: number): number {
    const bands = [
      { limit: 1621, rate: 0.075 },
      { limit: 2902.84, rate: 0.09 },
      { limit: 4354.27, rate: 0.12 },
      { limit: 8475.55, rate: 0.14 },
    ];
    let previous = 0;
    let contribution = 0;
    const capped = Math.min(Math.max(0, base), bands[bands.length - 1].limit);

    for (const band of bands) {
      const taxable = Math.max(0, Math.min(capped, band.limit) - previous);
      contribution += taxable * band.rate;
      previous = band.limit;
      if (capped <= band.limit) break;
    }
    return this.money(contribution);
  }

  calculateIrrf(base: number, taxableIncome: number): number {
    const table = [
      { limit: 2428.8, rate: 0, deduction: 0 },
      { limit: 2826.65, rate: 0.075, deduction: 182.16 },
      { limit: 3751.05, rate: 0.15, deduction: 394.16 },
      { limit: 4664.68, rate: 0.225, deduction: 675.49 },
      { limit: Number.POSITIVE_INFINITY, rate: 0.275, deduction: 908.73 },
    ];
    const bracket = table.find((item) => base <= item.limit) ?? table[table.length - 1];
    const taxBeforeReduction = Math.max(0, base * bracket.rate - bracket.deduction);
    let reduction = 0;
    if (taxableIncome <= 5000) {
      reduction = taxBeforeReduction;
    } else if (taxableIncome <= 7350) {
      reduction = Math.max(0, 978.62 - 0.133145 * taxableIncome);
    }
    return this.money(Math.max(0, taxBeforeReduction - Math.min(taxBeforeReduction, reduction)));
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
