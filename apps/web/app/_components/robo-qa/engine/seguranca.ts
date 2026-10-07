// Nada de senha, token ou segredo no relatorio.
const segredos = new Set<string>();

export function registrarSegredo(valor?: string) {
  if (valor && valor.length >= 6) segredos.add(valor);
}

export function limpar(texto: unknown): string {
  let t = String(texto ?? '');
  for (const segredo of segredos) t = t.split(segredo).join('***');
  t = t.replace(/eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}/g, '***');
  // "Authorization Bearer <token>": o esquema (Bearer/Basic) nao pode ser tomado como se fosse o valor.
  t = t.replace(/(senha|password|passwd|token|authorization|bearer|secret)(["']?\s*[:=]\s*|\s+)(?:(?:bearer|basic)\s+)?([^\s"',;]+)/gi, '$1$2***');
  return t;
}