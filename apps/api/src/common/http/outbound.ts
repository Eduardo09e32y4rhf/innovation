/**
 * Unico ponto de saida HTTP da API. Todo fetch externo precisa de limite de tempo: sem ele, um provedor lento
 * mantem a requisicao do cliente pendurada ate o proxy cortar. Usa AbortSignal.timeout (fetch nativo do Node).
 * Valores padrao: consulta publica (CEP/CNPJ/feriados/geocoding) 5s; gateway de pagamento 15s.
 */
export const TIMEOUT_PUBLIC_LOOKUP_MS = 5_000;
export const TIMEOUT_PAYMENT_GATEWAY_MS = 15_000;

export class OutboundTimeoutError extends Error {
  constructor(readonly url: string, readonly timeoutMs: number) {
    super(`Tempo esgotado (${timeoutMs} ms) ao chamar servico externo.`);
    this.name = 'OutboundTimeoutError';
  }
}

export async function outboundFetch(url: string | URL, init: RequestInit = {}, opts: { timeoutMs?: number } = {}): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? TIMEOUT_PUBLIC_LOOKUP_MS;
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  try {
    return await fetch(url, { ...init, signal });
  } catch (error) {
    // Distingue o nosso timeout de um cancelamento feito pelo chamador.
    if (timeout.aborted && !init.signal?.aborted) throw new OutboundTimeoutError(String(url), timeoutMs);
    throw error;
  }
}
