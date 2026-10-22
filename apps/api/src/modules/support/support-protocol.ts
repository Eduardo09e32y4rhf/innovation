import { randomInt } from 'node:crypto';
import { toSaoPauloDateKey } from '../../common/utils/date.utils';

/** Digitos aleatorios depois da data. 10 milhoes de combinacoes por dia. */
export const PROTOCOL_RANDOM_DIGITS = 7;
export const PROTOCOL_LENGTH = 8 + PROTOCOL_RANDOM_DIGITS;

/**
 * Protocolo do chamado: ano, mes e dia (dia de Sao Paulo, nao o do servidor em UTC) + 7 digitos aleatorios.
 * Exemplo: 202610211020121 = 21/10/2026.
 */
export function buildProtocol(now: Date = new Date(), random: (max: number) => number = randomInt): string {
  const day = toSaoPauloDateKey(now).replace(/-/g, '');
  let tail = '';
  for (let i = 0; i < PROTOCOL_RANDOM_DIGITS; i++) tail += String(random(10));
  return `${day}${tail}`;
}

export const isProtocol = (value: string) => new RegExp(`^\\d{${PROTOCOL_LENGTH}}$`).test(value);

/** O cliente pode digitar com espacos, pontos ou tracos; so os digitos importam. */
export const normalizeProtocolQuery = (value: string) => String(value ?? '').replace(/\D/g, '');

/**
 * Termo de busca: protocolo novo (so digitos) ou numero antigo (SUP-2026-000001, mantido em chamados ja abertos).
 * Devolve '' quando nao sobrou nada util para buscar.
 */
export function protocolSearchTerm(input: string): string {
  const text = String(input ?? '').trim().toUpperCase();
  if (text.startsWith('SUP')) return text.replace(/[^A-Z0-9-]/g, '');
  return normalizeProtocolQuery(text);
}

/** Gera um protocolo que ainda nao existe (a coluna tambem e unica no banco: a checagem evita o erro na maioria absoluta dos casos). */
export async function generateUniqueProtocol(
  exists: (protocol: string) => Promise<boolean>,
  now: Date = new Date(),
  random: (max: number) => number = randomInt,
  attempts = 8,
): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const protocol = buildProtocol(now, random);
    if (!(await exists(protocol))) return protocol;
  }
  throw new Error('Nao foi possivel gerar um protocolo unico. Tente novamente.');
}
