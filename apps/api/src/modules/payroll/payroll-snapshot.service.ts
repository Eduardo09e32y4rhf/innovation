import { Injectable, BadRequestException } from '@nestjs/common';
import { PayrollRuleSnapshot, PayrollCalculationData } from './interfaces/payroll-snapshot.interface';

@Injectable()
export class PayrollSnapshotService {
  /**
   * Retorna as regras tributárias vigentes para um mês/ano específico.
   * Evita que a mudança de ano (ex: 2024 para 2025) recalcule folhas antigas com alíquotas novas.
   */
  getRulesForPeriod(month: number, year: number): PayrollRuleSnapshot {
    // No futuro, isso pode vir do banco de dados (Tabelas do Governo).
    // Base estática 2024 (Foundation para a outra IA expandir).
    return {
      referenceMonth: month,
      referenceYear: year,
      minimumWage: 1412.00,
      fgtsPercentage: 0.08,
      inssTable: [
        { min: 0, max: 1412.00, percentage: 0.075 },
        { min: 1412.01, max: 2666.68, percentage: 0.09 },
        { min: 2666.69, max: 4000.03, percentage: 0.12 },
        { min: 4000.04, max: 7786.02, percentage: 0.14 },
      ],
      irrfTable: [
        { min: 0, max: 2259.20, percentage: 0, deduction: 0 },
        { min: 2259.21, max: 2826.65, percentage: 0.075, deduction: 169.44 },
        { min: 2826.66, max: 3751.05, percentage: 0.15, deduction: 381.44 },
        { min: 3751.06, max: 4664.68, percentage: 0.225, deduction: 662.77 },
        { min: 4664.69, max: 999999, percentage: 0.275, deduction: 896.00 },
      ]
    };
  }

  /**
   * Calcula o INSS de forma progressiva usando o snapshot da regra
   */
  calculateINSS(grossSalary: number, rules: PayrollRuleSnapshot): number {
    let totalInss = 0;
    
    for (const bracket of rules.inssTable) {
      if (grossSalary > bracket.min) {
        const taxableAmount = Math.min(grossSalary, bracket.max) - bracket.min;
        totalInss += taxableAmount * bracket.percentage;
      }
    }
    
    // Teto do INSS
    const maxInss = 908.85; // Baseado no teto de 7786.02 para 2024
    return Math.min(totalInss, maxInss);
  }

  /**
   * Calcula o IRRF usando o snapshot e o valor do INSS já descontado
   */
  calculateIRRF(grossSalary: number, inssAmount: number, dependents: number, rules: PayrollRuleSnapshot): number {
    const dependentDeduction = dependents * 189.59;
    const calculationBase = grossSalary - inssAmount - dependentDeduction;

    const bracket = rules.irrfTable
      .slice()
      .reverse()
      .find(b => calculationBase >= b.min);

    if (!bracket || bracket.percentage === 0) return 0;

    return (calculationBase * bracket.percentage) - bracket.deduction;
  }

  /**
   * Valida se uma folha fechada foi alterada sem auditoria
   */
  verifySnapshotIntegrity(storedData: PayrollCalculationData, currentGross: number): boolean {
    if (storedData.earnings.base !== currentGross) {
      throw new BadRequestException('Folha fechada não pode ser alterada diretamente. Crie um Ajuste de Folha (PayrollAdjustment).');
    }
    return true;
  }
}
