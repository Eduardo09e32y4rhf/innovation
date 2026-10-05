export type PayrollStatus = 'DRAFT' | 'PROCESSING' | 'APPROVED' | 'PAID' | 'CANCELLED';

export const PAYROLL_STATUS_LABEL: Record<PayrollStatus, string> = {
  DRAFT: 'Rascunho',
  PROCESSING: 'Processando',
  APPROVED: 'Aprovada',
  PAID: 'Paga',
  CANCELLED: 'Cancelada',
};

export type ManualItemType = 'BONUS' | 'COMMISSION' | 'OTHER_EARNING' | 'ADVANCE' | 'OTHER_DEDUCTION';

export const MANUAL_ITEM_LABEL: Record<ManualItemType, string> = {
  BONUS: 'Bônus (provento)',
  COMMISSION: 'Comissão (provento)',
  OTHER_EARNING: 'Outro provento',
  ADVANCE: 'Adiantamento (desconto)',
  OTHER_DEDUCTION: 'Outro desconto',
};

export interface ManualItemInput {
  type: ManualItemType;
  description: string;
  amount: number;
}

export interface PayrollLine {
  id: string;
  type: string;
  description: string;
  amount: number | null;
  isDeduction: boolean;
}

/** Valores monetários chegam como número, ou null quando a folha antiga está com valor inválido. */
export interface PayrollItem {
  id: string;
  companyId: string;
  employeeId: string;
  referenceMonth: number;
  referenceYear: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  grossSalary: number | null;
  baseSalary: number | null;
  inssAmount: number | null;
  irrfAmount: number | null;
  fgtsAmount: number | null;
  netSalary: number | null;
  status: PayrollStatus;
  invalid?: boolean;
  observations?: string | null;
  cancelReason?: string | null;
  items?: PayrollLine[];
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    name: string;
    position?: string | null;
    department?: string | null;
  } | null;
}

export interface CreatePayrollInput {
  employeeIds: string[];
  periodStart: string;
  periodEnd: string;
  observations?: string;
  items?: ManualItemInput[];
}

export interface CreatePayrollResult {
  created: PayrollItem[];
  failed: Array<{ employeeId: string; name: string; message: string }>;
}