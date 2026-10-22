/**
 * Regras de direitos do titular (LGPD, Lei 13.709/2018) para funcionários e usuários.
 * - Art. 18: acesso, portabilidade, anonimização/eliminação.
 * - Art. 19, II: resposta completa em até 15 dias.
 * - Art. 16, I: conservação permitida para cumprimento de obrigação legal ou regulatória.
 * Retenção trabalhista: CF art. 7º, XXIX e CLT art. 11 (5 anos, até 2 anos após o fim do contrato);
 * FGTS 5 anos (STF ARE 709.212, Tema 608); contribuições previdenciárias até a decadência/prescrição
 * (Lei 8.212/1991, art. 32; CTN arts. 173/174).
 */
export const ERASURE_DEADLINE_DAYS = 15;
export const RETENTION_YEARS_AFTER_TERMINATION = 5;
export const ANONYMIZE_CONFIRMATION = 'ANONIMIZAR';

/** Campos sem obrigação legal de guarda após o desligamento: são apagados. */
export const ERASABLE_EMPLOYEE_FIELDS = [
  'email', 'phone', 'secondaryPhone', 'cep', 'street', 'streetNumber', 'addressComplement', 'neighborhood',
  'observations', 'maritalStatus', 'education', 'voterTitle', 'voterZone', 'voterSection', 'voterState',
  'reservist', 'cnh', 'cnhCategory', 'cnhExpiry', 'bankCode', 'bankName', 'bankAgency', 'bankAccount', 'bankAccountType',
] as const;

export const RETAINED_DATA = [
  { data: 'Nome, CPF, PIS, RG, data de nascimento, filiação, dependentes', basis: 'LGPD art. 16, I; eSocial/Lei 8.212/1991 art. 32 (identificação do segurado)' },
  { data: 'Admissão, desligamento, cargo, salário, contrato', basis: 'LGPD art. 16, I; CF art. 7º, XXIX e CLT art. 11 (prescrição trabalhista)' },
  { data: 'Folha de pagamento, holerites, FGTS e encargos', basis: 'LGPD art. 16, I; STF ARE 709.212 (FGTS 5 anos); Lei 8.212/1991 art. 32' },
  { data: 'Registros de ponto, banco de horas, férias, atestados e ASO', basis: 'LGPD art. 16, I; CLT art. 74 e art. 11; NR-7 (ASO)' },
  { data: 'Trilha de auditoria', basis: 'LGPD arts. 37 e 16, I (registro das operações de tratamento)' },
];

const SECRET_KEY = /hash|secret|password|token|recovery|enc$/i;
const MAX_INLINE = 4000;

/** Remove segredos e conteúdo binário grande da exportação. */
export function sanitizeExport(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeExport);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') {
    if (typeof (value as any).toFixed === 'function' && typeof (value as any).toNumber === 'function') return String(value);
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      if (SECRET_KEY.test(key)) continue;
      out[key] = sanitizeExport(v);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > MAX_INLINE) return `[conteúdo de ${value.length} caracteres omitido — arquivo disponível no sistema]`;
  return value;
}

export function retainUntil(terminationDate: Date | null): string | null {
  if (!terminationDate) return null;
  const d = new Date(terminationDate);
  d.setFullYear(d.getFullYear() + RETENTION_YEARS_AFTER_TERMINATION);
  return d.toISOString().slice(0, 10);
}
