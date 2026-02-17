import api from './api';

export interface FinanceSummary {
    balance: number;
    total_income: number;
    total_expenses: number;
    pending_income: number;
    pending_expenses: number;
}

export interface Transaction {
    id: number;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    tax_type?: string;
    status: string;
    due_date: string;
    category?: string;
}

export interface TaxSummary {
    total_taxes: number;
    breakdown: Record<string, {
        total: number;
        pending: number;
        paid: number;
        items: any[];
    }>;
}

export const FinanceService = {
    getSummary: async (): Promise<FinanceSummary> => {
        const response = await api.get('/finance/summary');
        return response.data;
    },

    getTransactions: async (limit: number = 20): Promise<Transaction[]> => {
        const response = await api.get(`/finance/transactions?limit=${limit}`);
        return response.data;
    },

    getTaxes: async (): Promise<TaxSummary> => {
        const response = await api.get('/finance/taxes');
        return response.data;
    }
};
