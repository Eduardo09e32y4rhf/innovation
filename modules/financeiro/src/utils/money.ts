import type { SafeMoney } from '../types/financeiro.types';

export const toSafeMoney = (amount: number, currency: SafeMoney['currency'] = 'BRL'): SafeMoney => ({
  amount,
  currency,
  formatted: new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amount),
});
