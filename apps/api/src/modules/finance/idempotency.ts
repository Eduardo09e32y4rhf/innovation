import { BadRequestException } from '@nestjs/common';

const KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;

/** Chamadas HTTP que criam cobrança precisam de uma chave por ação; chamadas internas continuam derivando no servidor. */
export function requireIdempotencyKey(header: string | string[] | undefined, bodyKey?: string): string {
  const raw = Array.isArray(header) ? header[0] : header;
  const key = (raw ?? bodyKey ?? '').trim();
  if (!key) throw new BadRequestException('Envie o cabeçalho Idempotency-Key (um UUID novo por ação) para criar a cobrança.');
  if (!KEY_PATTERN.test(key)) throw new BadRequestException('Idempotency-Key inválida: use de 16 a 128 caracteres (letras, números, ponto, hífen, dois-pontos ou sublinhado).');
  return key;
}

/** Repetição da mesma chave devolve a cobrança existente com 200 em vez de 201. */
export function markReplay(reply: any, replayed: boolean) {
  if (!replayed || !reply) return;
  if (typeof reply.code === 'function') reply.code(200);
  else if (typeof reply.status === 'function') reply.status(200);
}
