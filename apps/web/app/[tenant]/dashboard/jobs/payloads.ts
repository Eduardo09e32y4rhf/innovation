import type { Criterion, Question } from './types';

/**
 * A API recusa campo desconhecido (forbidNonWhitelisted). Perguntas e critérios que vêm do banco trazem `jobId` e `position`
 * ("Cargo" na tela de erro), então o envio monta o objeto só com o que o formulário edita.
 */
export const questionPayload = ({ id, label, type, required, options, knockout, scoreRule }: Question) => ({
  ...(id ? { id } : {}),
  label: label.trim(),
  type,
  required,
  options: options ?? [],
  knockout: knockout ?? null,
  scoreRule: scoreRule ?? null,
});

export const criterionPayload = ({ id, name, weight }: Criterion) => ({ ...(id ? { id } : {}), name: name.trim(), weight });

/** "4500", "4500.50" ou "4.500,50" viram reais inteiros (a API guarda inteiro); vazio ou inválido = não informado. */
export function toWholeReais(value: string): number | undefined {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : undefined;
}
