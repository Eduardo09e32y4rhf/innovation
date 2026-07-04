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

export function maskCPF(value: string) {
  return value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').slice(0, 14);
}

export function maskCNPJ(value: string) {
  return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2').slice(0, 18);
}

export function maskCEP(value: string) {
  return value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);
}
