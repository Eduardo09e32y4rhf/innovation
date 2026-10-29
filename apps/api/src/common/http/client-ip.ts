/**
 * Unica fonte do IP do cliente. Usa `request.ip`: o Fastify so le X-Forwarded-For quando `trustProxy` esta ligado
 * (main.ts) e apenas dos proxies da lista de confianca; cabecalhos como cf-connecting-ip ou x-real-ip enviados
 * pelo cliente nao valem. Ver https://fastify.dev/docs/latest/Reference/Request/ (ip) e Server (trustProxy).
 */
export function clientIp(request: { ip?: string } | null | undefined): string | undefined {
  const ip = request?.ip;
  return ip ? String(ip) : undefined;
}
