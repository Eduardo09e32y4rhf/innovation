/**
 * A API devolve ora uma lista, ora um objeto paginado `{ data, total, page, limit }`.
 * Normaliza para lista: um objeto paginado tratado como lista derrubava a tela inteira (`.map is not a function`).
 */
export function comoLista<T>(resposta: unknown): T[] {
  if (Array.isArray(resposta)) return resposta as T[];
  const interno = (resposta as { data?: unknown } | null | undefined)?.data;
  return Array.isArray(interno) ? (interno as T[]) : [];
}
