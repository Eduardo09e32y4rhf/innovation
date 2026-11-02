import { applyDecorators } from '@nestjs/common';
import { Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

/**
 * Valor monetario: numero finito >= 0 ou texto ("5500", "5500.50", "5.500,00", "29,90").
 * Texto vazio vale "sem valor" (o service normaliza). Negativos, NaN, objetos e booleanos sao rejeitados.
 */
@ValidatorConstraint({ name: 'moneyLike', async: false })
export class MoneyLikeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    if (typeof value === 'number') return Number.isFinite(value) && value >= 0;
    if (typeof value !== 'string') return false;
    const text = value.trim();
    return text === '' || /^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(text) || /^\d+([.,]\d{1,2})?$/.test(text);
  }
  defaultMessage() { return 'informe um valor monetario valido (numero nao negativo)'; }
}

export const IsMoneyLike = () => applyDecorators(Validate(MoneyLikeConstraint));
