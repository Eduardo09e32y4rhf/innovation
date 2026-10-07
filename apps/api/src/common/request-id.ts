import { randomUUID } from 'crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/;

/** Aceita o request ID do proxy/cliente só se for seguro (evita injeção em log/cabeçalho); senão gera um novo. */
export function resolveRequestId(incoming: unknown): string {
  const value = Array.isArray(incoming) ? incoming[0] : incoming;
  return typeof value === 'string' && SAFE_REQUEST_ID.test(value) ? value : randomUUID();
}

/** Request ID já atribuído pelo Fastify (`request.id`), ou null se a requisição não passou pelo adapter. */
export function requestIdOf(request: unknown): string | null {
  const id = (request as { id?: unknown } | null | undefined)?.id;
  return typeof id === 'string' && id ? id : null;
}

export function responseMeta(request: unknown): { requestId: string | null; timestamp: string } {
  return { requestId: requestIdOf(request), timestamp: new Date().toISOString() };
}
