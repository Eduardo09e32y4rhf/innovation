export type PayrollStatus = 'DRAFT' | 'PROCESSING' | 'APPROVED' | 'PAID' | 'CANCELLED';

export const PAYROLL_STATUS_LABEL: Record<PayrollStatus, string> = {
  DRAFT: 'Rascunho',
  PROCESSING: 'Processando',
  APPROVED: 'Aprovado',
  PAID: 'Pago',
  CANCELLED: 'Cancelado',
};

export interface PayrollItem {
  id: string;
  companyId: string;
  employeeId: string;
  referenceMonth: number;
  referenceYear: number;
  grossSalary: number | string;
  inss: number | string;
  irrf: number | string;
  fgts: number | string;
  netSalary: number | string;
  status: PayrollStatus;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    name: string;
    position?: string | null;
    department?: string | null;
  } | null;
}

export interface Payroll {
  items: PayrollItem[];
  total?: number;
}

export interface CreatePayrollInput {
  employeeId: string;
  referenceMonth: number;
  referenceYear: number;
}