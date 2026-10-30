import { ALLOW } from '../../common/utils/file-validation';
import type { FileKind } from '../../common/utils/file-validation';

/**
 * Tipos de documento da admissao (RS-D-16) e kits por tipo de contrato (RS-D-09).
 * Cada tipo define formatos aceitos, se tem validade a acompanhar, se e dado sensivel (RS-D-08) e a base legal registrada.
 * ATENCAO: as bases legais abaixo sao a leitura tecnica da LGPD (arts. 7 e 11) e precisam de VALIDACAO JURIDICA (advogado da empresa).
 */
export const DOC_TYPES = [
  'IDENTIDADE', 'CPF', 'TITULO_ELEITOR', 'CTPS', 'PIS', 'COMPROVANTE_RESIDENCIA', 'CERTIDAO_CIVIL', 'ESCOLARIDADE', 'DIPLOMA',
  'FOTO', 'DADOS_BANCARIOS', 'RESERVISTA', 'DEPENDENTES', 'CNH', 'ASO', 'ANTECEDENTES', 'VACINA', 'LAUDO_PCD', 'CERTIDAO', 'PESSOA_JURIDICA', 'CONTRATO', 'OUTRO',
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export type DocTypeRule = {
  type: DocType;
  /** Formatos aceitos (assinatura binaria, nunca extensao). */
  formats: readonly FileKind[];
  /** Tem vencimento que o RH registra na conferencia e que gera alerta (CNH, certidoes, vacina, ASO). */
  tracksExpiry: boolean;
  /** Vencimento obrigatorio para aprovar. */
  requiresExpiry: boolean;
  /** Validade tipica em meses quando o RH nao informa (sugestao; nao e imposta). */
  suggestedValidityMonths: number | null;
  sensitive: boolean;
  legalBasis: string | null;
  mandatory: boolean;
};

const BASIC = ALLOW.DOCUMENT;
const PHOTO: readonly FileKind[] = ['png', 'jpeg'];

const BASE_HEALTH = 'LGPD art. 11, II, "a" (cumprimento de obrigacao legal ou regulatoria: CLT art. 168 e NR-7). Validacao juridica pendente.';

export const DOC_TYPE_RULES: Record<DocType, DocTypeRule> = {
  IDENTIDADE: { type: 'IDENTIDADE', formats: BASIC, tracksExpiry: false, requiresExpiry: false, suggestedValidityMonths: null, sensitive: false, legalBasis: null, mandatory: true },
  CPF: { type: 'CPF', formats: BASIC, tracksExpiry: false, requiresExpiry: false, suggestedValidityMonths: null, sensitive: false, legalBasis: null, mandatory: true },
  TITULO_ELEITOR: { type: 'TITULO_ELEITOR', formats: BASIC, tracksExpiry: false, requiresExpiry: false, suggestedValidityMonths: null, sensitive: false, legalBasis: null, mandatory: false },
  CTPS: { type: 'CTPS', formats: BASIC, tracksExpiry: false, requiresExpiry: false, suggestedValidityMonths: null, sensitive: false, legalBasis: null, mandatory: true },
  PIS: { type: 'PIS', formats: BASIC, tracksExpiry: false, requiresExpiry: false, suggestedValidityMonths: null, sensitive: false, legalBasis: null, mandatory: true },
  COMPROVANTE_RESIDENCIA: { type: 'COMPROVANTE_RESIDENCIA', formats: BASIC, tracksExpiry: false, requiresExpiry: false, suggestedValidityMonths: 3, sensitive: false, legalBasis: null, mandatory: true },
  CERTIDAO_CIVIL: { type: 'CERTIDAO_CIVIL', formats: BASIC, tracksExpiry: false, requiresExpiry: false, suggestedValidityMonths: null, sensitive: false, legalBasis: null, mandatory: true },
  ESCOLARIDADE: { type: 'ESCOLARIDADE', formats: ALLOW.CERTIFICATE, tracksExpiry: false, requiresExpiry: false, suggestedValidityMonths: null, sensitive: false, legalBasis: null, mandatory: true },
  DIPLOMA: { type: 'DIPLOMA', formats: ALLOW.CERTIFICATE, tracksExpiry: false, requiresExpiry: false, suggestedValidityMonths: null, sensitive: false, legalBasis: null, mandatory: false },
  FOTO: { type: 'FOTO', formats: PHOTO, tracksExpiry: false, requiresExpiry: false, suggestedValidityMonths: null, sensitive: false, legalBasis: null, mandatory: true },
  DADOS_BANCARIOS: { type: 'DADOS_BANCARIOS', formats: BASIC, tracksExpiry: false, requiresExpiry: false, suggestedValidityMonths: null, sensitive: false, legalBasis: null, mandatory: true },
  RESERVISTA: { type: 'RESERVISTA', formats: BASIC, tracksExpiry: false, requiresExpiry: false, suggestedValidityMonths: null, sensitive: false, legalBasis: null, mandatory: false },
  DEPENDENTES: { type: 'DEPENDENTES', formats: BASIC, tracksExpiry: false, requiresExpiry: false, suggestedValidityMonths: null, sensitive: false, legalBasis: null, mandatory: false },
  CNH: { type: 'CNH', formats: BASIC, tracksExpiry: true, requiresExpiry: true, suggestedValidityMonths: null, sensitive: false, legalBasis: null, mandatory: false },
  ASO: { type: 'ASO', formats: BASIC, tracksExpiry: true, requiresExpiry: true, suggestedValidityMonths: 12, sensitive: true, legalBasis: BASE_HEALTH, mandatory: true },
  ANTECEDENTES: { type: 'ANTECEDENTES', formats: BASIC, tracksExpiry: true, requiresExpiry: true, suggestedValidityMonths: 3, sensitive: true, legalBasis: 'LGPD art. 7, II ou IX, conforme a funcao; so quando a lei ou a natureza do cargo justificar (tema trabalhista sensivel). Validacao juridica pendente.', mandatory: false },
  VACINA: { type: 'VACINA', formats: BASIC, tracksExpiry: true, requiresExpiry: false, suggestedValidityMonths: null, sensitive: true, legalBasis: BASE_HEALTH, mandatory: false },
  LAUDO_PCD: { type: 'LAUDO_PCD', formats: BASIC, tracksExpiry: false, requiresExpiry: false, suggestedValidityMonths: null, sensitive: true, legalBasis: 'LGPD art. 11, II, "a" (cota de pessoa com deficiencia: Lei 8.213/1991 art. 93) ou consentimento especifico (art. 11, I). Validacao juridica pendente.', mandatory: false },
  CERTIDAO: { type: 'CERTIDAO', formats: BASIC, tracksExpiry: true, requiresExpiry: true, suggestedValidityMonths: 6, sensitive: false, legalBasis: null, mandatory: false },
  PESSOA_JURIDICA: { type: 'PESSOA_JURIDICA', formats: BASIC, tracksExpiry: false, requiresExpiry: false, suggestedValidityMonths: null, sensitive: false, legalBasis: null, mandatory: true },
  CONTRATO: { type: 'CONTRATO', formats: BASIC, tracksExpiry: false, requiresExpiry: false, suggestedValidityMonths: null, sensitive: false, legalBasis: null, mandatory: false },
  OUTRO: { type: 'OUTRO', formats: BASIC, tracksExpiry: false, requiresExpiry: false, suggestedValidityMonths: null, sensitive: false, legalBasis: null, mandatory: false },
};

const norm = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Ordem importa: o primeiro que casar vence (ex.: "certidao de antecedentes" antes de "certidao"). */
const LABEL_RULES: Array<[RegExp, DocType]> = [
  [/\baso\b|atestado de saude|exame.* admission|exames? medic/, 'ASO'],
  [/antecedentes/, 'ANTECEDENTES'],
  [/laudo|\bcid\b|\bpcd\b|deficiencia/, 'LAUDO_PCD'],
  [/vacina/, 'VACINA'],
  [/categoria exigida|^cnh\b/, 'CNH'],
  [/diploma/, 'DIPLOMA'],
  [/escolaridade|historico escolar|matricula|certificados? e cursos|certificacoes/, 'ESCOLARIDADE'],
  [/dependente|frequencia escolar|certidao de nascimento dos filhos|uniao estavel/, 'DEPENDENTES'],
  [/certidao (negativa|de regularidade)|\bcnd\b|fgts/, 'CERTIDAO'],
  [/cnpj|contrato social|ccmei|inscricao (municipal|estadual)|alvara|simples nacional|\bdas\b|dasn|nota fiscal|dados bancarios da empresa|endereco da empresa|socio/, 'PESSOA_JURIDICA'],
  [/contrato|termo de|\bnda\b|confidencialidade|portfolio|seguro/, 'CONTRATO'],
  [/certidao de nascimento ou casamento|certidao de casamento/, 'CERTIDAO_CIVIL'],
  [/\brg\b|identidade|\bcnh\b/, 'IDENTIDADE'],
  [/\bcpf\b/, 'CPF'],
  [/titulo de eleitor|quitacao eleitoral/, 'TITULO_ELEITOR'],
  [/ctps|carteira de trabalho/, 'CTPS'],
  [/\bpis\b|pasep|\bnis\b/, 'PIS'],
  [/residencia|endereco/, 'COMPROVANTE_RESIDENCIA'],
  [/foto/, 'FOTO'],
  [/bancari|conta salario|conta sal/, 'DADOS_BANCARIOS'],
  [/reservista/, 'RESERVISTA'],
];

export function docTypeForLabel(label: string): DocType {
  const text = norm(label);
  for (const [pattern, type] of LABEL_RULES) if (pattern.test(text)) return type;
  return 'OUTRO';
}

export function ruleForLabel(label: string): DocTypeRule {
  return DOC_TYPE_RULES[docTypeForLabel(label)];
}

export function formatsLabel(formats: readonly FileKind[]): string {
  return formats.map((kind) => (kind === 'jpeg' ? 'JPEG' : kind.toUpperCase())).join(', ');
}

export type VerdictInput = { docType: DocType; expiresAt?: Date | null; now?: Date };

/** Aprovacao exige o vencimento nos tipos que o pedem e recusa documento ja vencido. Devolve a mensagem de erro ou null. */
export function validateApproval(input: VerdictInput): string | null {
  const rule = DOC_TYPE_RULES[input.docType];
  const now = input.now ?? new Date();
  if (rule.requiresExpiry && !input.expiresAt) return 'Informe o vencimento deste documento para aprovar.';
  if (input.expiresAt && input.expiresAt.getTime() < startOfDay(now)) return 'O documento ja esta vencido. Devolva ao candidato para enviar um vigente.';
  return null;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// ─── Kits por tipo de contrato (RS-D-09) ────────────────────────────────────

const PESSOAIS = ['RG ou CNH', 'CPF', 'Comprovante de residência', 'Foto 3x4'];

export const CONTRACT_KITS = {
  CLT: ['RG ou CNH', 'CPF', 'Título de eleitor', 'Carteira de trabalho (CTPS)', 'PIS/PASEP/NIS', 'Comprovante de residência', 'Certidão de nascimento ou casamento', 'Comprovante de escolaridade', 'Foto 3x4', 'Dados bancários (comprovante de conta)', 'Certificado de reservista (homens)', 'ASO admissional (atestado de saúde)', 'Documentos dos dependentes (se houver)'],
  PJ: ['Cartão CNPJ', 'Contrato social ou certificado MEI (CCMEI)', 'RG ou CNH do sócio', 'CPF do sócio', 'Comprovante de endereço da empresa', 'Dados bancários da empresa (PJ)', 'Certidão negativa de débitos federais', 'Inscrição municipal'],
  ESTAGIO: [...PESSOAIS, 'Declaração de matrícula da instituição de ensino', 'Termo de compromisso de estágio', 'Histórico escolar', 'Autorização dos responsáveis (menor de 18)', 'Dados bancários (comprovante de conta)'],
  APRENDIZ: [...PESSOAIS, 'Carteira de trabalho (CTPS)', 'Declaração de matrícula da instituição de ensino', 'Comprovante de escolaridade', 'Autorização dos responsáveis (menor de 18)', 'Documento do responsável legal', 'ASO admissional (atestado de saúde)', 'Dados bancários (comprovante de conta)'],
  TEMPORARIO: ['RG ou CNH', 'CPF', 'Carteira de trabalho (CTPS)', 'PIS/PASEP/NIS', 'Comprovante de residência', 'Foto 3x4', 'Dados bancários (comprovante de conta)', 'ASO admissional (atestado de saúde)'],
} as const;
export type ContractKit = keyof typeof CONTRACT_KITS;

export function contractKitKey(contractType?: string | null): ContractKit {
  const text = norm(String(contractType ?? ''));
  if (/\bpj\b|mei|presta|pessoa juridica|autonom/.test(text)) return 'PJ';
  if (/estagi/.test(text)) return 'ESTAGIO';
  if (/aprendiz/.test(text)) return 'APRENDIZ';
  if (/tempor|determinad|experiencia|safra/.test(text)) return 'TEMPORARIO';
  return 'CLT';
}

export function kitFor(contractType?: string | null): string[] {
  return [...CONTRACT_KITS[contractKitKey(contractType)]];
}

export type RequiredDocItem = { label: string; required: boolean };

export const SENSITIVE_READ_ROLES = ['DEV', 'ADMIN', 'RH'] as const;
/** Dado sensivel (saude, antecedentes, PCD/CID): leitura somente RH, ADMIN e DEV. RH - R&S e gestores nao abrem o arquivo. */
export function canReadSensitive(role?: string | null): boolean {
  return (SENSITIVE_READ_ROLES as readonly string[]).includes(String(role ?? ''));
}

/** Normaliza o que vem da vaga (JSON): rotulos curtos, sem repeticao, no maximo 80. */
export function normalizeRequiredDocuments(input: unknown): RequiredDocItem[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: RequiredDocItem[] = [];
  for (const raw of input) {
    const label = String(typeof raw === 'string' ? raw : (raw as any)?.label ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (label.length < 2 || label.length > 60) continue;
    const key = label.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, required: typeof raw === 'object' && raw !== null && (raw as any).required === false ? false : true });
  }
  return out.slice(0, 80);
}

/** Lista exigida da vaga: a configurada nela ou, vazia, o kit do tipo de contrato. */
export function resolveRequiredDocuments(job: { requiredDocuments?: unknown; employmentType?: string | null }): RequiredDocItem[] {
  const configured = normalizeRequiredDocuments(job.requiredDocuments);
  if (configured.length) return configured;
  return kitFor(job.employmentType).map((label) => ({ label, required: true }));
}
