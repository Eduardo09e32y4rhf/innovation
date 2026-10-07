export type HubTab = 'resumo' | 'empresas' | 'financeiro' | 'contabilidade' | 'comercial' | 'suporte' | 'auditoria' | 'configuracoes' | 'dossie';

export const TAB_LABEL: Record<HubTab, string> = {
  resumo: 'Resumo', empresas: 'Empresas', financeiro: 'Financeiro', contabilidade: 'Contabilidade',
  comercial: 'Comercial', suporte: 'Suporte', auditoria: 'Auditoria', configuracoes: 'Configurações', dossie: 'Empresa',
};

export const TAB_POLICY: Record<string, HubTab[]> = {
  DEV: ['resumo', 'empresas', 'dossie', 'comercial', 'suporte', 'auditoria', 'configuracoes'],
  CEO: ['resumo', 'empresas', 'dossie', 'suporte', 'auditoria', 'configuracoes'],
  COMERCIAL: ['resumo', 'empresas', 'dossie', 'comercial', 'configuracoes'],
  CONTABIL: ['resumo'],
};

export interface CompanyOption { id: string; name: string; slug: string; document: string; status: string; plan: string; billingStatus: string }

export interface GlobalOverview {
  scope: 'GLOBAL';
  companies: { total: number; byStatus: Record<string, number>; newLast30Days: number; byBilling: Record<string, number> };
  usage: { users: number; employees: number };
  finance: { month: string; received: number; open: number; overdue: number; invoices: number } | null;
  support: { open: number };
  integrations: { webhookFailures: number };
  attention: {
    overdue: { companyId: string; name: string; amount: number; invoices: number }[];
    trials: { companyId: string; name: string; endsAt: string | null }[];
    nearLimit: { id: string; name: string; users: number; maxUsers: number; employees: number; maxEmployees: number }[];
  };
  recentActivity: { id: string; action: string; summary?: string; entity: string; at: string; company: { id: string; name: string } | null }[];
}

export interface CompanyOverview {
  scope: 'COMPANY';
  company: {
    id: string; name: string; slug: string; document: string; status: string; plan: string; billingStatus: string; activeModules: string[];
    maxUsers: number; maxEmployees: number; trialEndsAt: string | null; suspensionReason: string | null; createdAt: string; isActive: boolean;
    asaasCustomerId: string | null; asaasSubscriptionId: string | null; internalNotes?: string | null;
    subscription: { status: string; seatQuantity: number; nextDueDate: string | null; billingPaused: boolean; baseMonthlyPrice: number; userMonthlyPrice: number; discountPercent: number; trialEndsAt: string | null; plan: { name: string; code: string } | null } | null;
  };
  usage: { users: number; maxUsers: number; employees: number; activeEmployees: number; maxEmployees: number; roles: Record<string, number> };
  finance: { invoices: { id: string; amount: number; dueDate: string; status: string; invoiceNumber: string | null; paidAt: string | null; description: string | null; nfeStatus: string | null }[]; overdueTotal: number; overdueCount: number } | null;
  contracts: { id: string; status: string; agreedAmount: number; startsAt: string; endsAt: string | null }[];
  support: { open: number; recent: { id: string; ticketNumber: string; title: string; status: string; priority: string; createdAt: string }[] };
  accounting: { month: string; closings: { status: string; count: number; gross: number; net: number }[]; payroll: { status: string; count: number; gross: number; net: number }[] };
  recentActivity: { id: string; action: string; summary?: string; entity: string; at: string; user: string | null }[];
}

export type Overview = GlobalOverview | CompanyOverview;

export interface AccountingTotals { gross: number; net: number; inss: number; irrf: number; fgts: number; closings: number; payrolls?: number; payrollGross?: number; payrollNet?: number }

export interface AccountingGlobal {
  scope: 'GLOBAL';
  period: { year: number; month: number; key: string };
  ruleVersions: Record<string, string | null>;
  totals: AccountingTotals & { companies: number; withClosings: number; closingsPending: number; payrollsPending: number };
  companies: { id: string; name: string; document: string | null; status: string; closings: number; closingsPending: number; gross: number; net: number; inss: number; irrf: number; fgts: number; payrolls: number; payrollsPending: number }[];
}

export interface AccountingCompany {
  scope: 'COMPANY';
  period: { year: number; month: number; key: string };
  company: { id: string; name: string; document: string | null };
  ruleVersions: Record<string, string | null>;
  totals: AccountingTotals;
  closings: { id: string; status: string; grossPay: number; netPay: number; inssDiscount: number; irrfDiscount: number; fgtsAmount: number; overtime50: number; overtime100: number; nightShift: number; calculationVersion: string; updatedAt: string; employee: { name: string; position: string | null } | null }[];
  payrolls: { id: string; status: string; baseSalary: number; overtimeAmount: number; nightShiftAmount: number; grossSalary: number; inssAmount: number; irrfAmount: number; fgtsAmount: number; netSalary: number; calculationVersion: string | null; updatedAt: string; employee: { name: string; position: string | null } | null }[];
}

export type AccountingOverview = AccountingGlobal | AccountingCompany;

export interface RuleVersion { id: string; version: string; effectiveFrom: string; effectiveTo: string | null; active: boolean; brackets: { limit: number | null; rate: number; deduction?: number }[]; parameters: Record<string, number> | null }
export interface RuleGroup { type: 'INSS' | 'IRRF' | 'FGTS' | 'PAYROLL_PARAMS'; label: string; description: string; current: RuleVersion | null; history: RuleVersion[] }
export interface RulesPayload { referenceDate: string; rules: RuleGroup[] }

export interface SimulationResult {
  referenceDate: string;
  result: { salaryBase: number; hourlyRate: number; overtime50Value: number; overtime100Value: number; nightShiftValue: number; dsrValue: number; absenceDiscount: number; grossPay: number; inssDiscount: number; irrfBase: number; irrfDiscount: number; fgtsAmount: number; netPay: number; calculationVersion: string };
  rulesUsed: { inss: string; irrf: string; fgts?: string; params?: string; fgtsRate?: number; builtin: string[] };
}
