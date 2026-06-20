export function normalizeDisplayName(value?: string | null): string {
  const clean = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!clean) return clean;
  return clean
    .split(' ')
    .map((part) => {
      const lower = part.toLocaleLowerCase('pt-BR');
      return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
    })
    .join(' ');
}
