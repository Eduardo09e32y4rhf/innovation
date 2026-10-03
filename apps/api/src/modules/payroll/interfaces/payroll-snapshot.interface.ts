export interface PayrollRuleSnapshot {
  referenceMonth: number;
  referenceYear: number;
  minimumWage: number;
  inssTable: Array<{
    min: number;
    max: number;
    percentage: number;
  }>;
  irrfTable: Array<{
    min: number;
    max: number;
    percentage: number;
    deduction: number;
  }>;
  fgtsPercentage: number;
}

export interface PayrollCalculationData {
  employeeId: string;
  grossSalary: number;
  netSalary: number;
  discounts: {
    inss: number;
    irrf: number;
    otherDeductions: number;
  };
  earnings: {
    base: number;
    overtime: number;
    bonuses: number;
  };
  ruleSnapshot: PayrollRuleSnapshot; // O coração do P6: a regra exata usada no momento do cálculo
}
