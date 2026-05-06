import type { FinanceCheckoutDTO } from '../types/financeiro.dto';

export interface ValidationResult<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

export const validateCheckoutRequest = (input: Partial<FinanceCheckoutDTO>): ValidationResult<FinanceCheckoutDTO> => {
  if (!input.planId || !input.planName) {
    return { ok: false, data: null, error: 'planId e planName são obrigatórios' };
  }

  return {
    ok: true,
    data: {
      planId: input.planId,
      planName: input.planName,
      checkoutUrl: input.checkoutUrl ?? null,
      requiresLogin: input.requiresLogin ?? true,
    },
    error: null,
  };
};
