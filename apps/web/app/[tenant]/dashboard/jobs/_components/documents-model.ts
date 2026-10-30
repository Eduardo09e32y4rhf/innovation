export type DocStatus = 'RECEIVED' | 'APPROVED' | 'RETURNED';

export type DocumentRow = {
  id: string; requestId: string; label: string; status: DocStatus; fileName: string; mimeType: string; size: number;
  returnReason: string | null; reviewedAt: string | null; supersededAt: string | null; createdAt: string;
  docType?: string | null; expiresAt?: string | null; sensitive?: boolean;
};
export type RequestRow = { id: string; items: string[]; expiresAt: string; revokedAt: string | null; createdAt: string; state: 'ACTIVE' | 'EXPIRED' | 'REVOKED'; reissuedFromId?: string | null };

/** Tipos que exigem o vencimento para aprovar (espelha recruitment-doc-types.ts no servidor). */
export const EXPIRY_REQUIRED_TYPES = ['CNH', 'ASO', 'ANTECEDENTES', 'CERTIDAO'];
export const EXPIRY_OPTIONAL_TYPES = ['VACINA'];
export const needsExpiry = (docType?: string | null) => EXPIRY_REQUIRED_TYPES.includes(docType ?? '');
export const asksExpiry = (docType?: string | null) => needsExpiry(docType) || EXPIRY_OPTIONAL_TYPES.includes(docType ?? '');
export type DocumentsPayload = { selectedAt: string | null; forwardedAt: string | null; requests: RequestRow[]; documents: DocumentRow[] };
export type CreatedRequest = { id: string; items: string[]; expiresAt: string; token: string; path: string; emailed?: boolean };

export const DOC_STATUS_LABEL: Record<DocStatus | 'PENDING', string> = {
  PENDING: 'Aguardando envio',
  RECEIVED: 'Recebido, falta conferir',
  APPROVED: 'Aprovado',
  RETURNED: 'Devolvido ao candidato',
};

/** Um documento por linha (ou separados por virgula/ponto e virgula). O servidor normaliza de novo. */
export function parseItemsInput(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(/[\n,;]+/)) {
    const label = part.replace(/\s+/g, ' ').trim();
    if (label.length < 2 || label.length > 60) continue;
    const key = label.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out.slice(0, 80);
}

/** Versao vigente de cada item: a mais recente que nao foi substituida. */
export function currentByLabel(documents: DocumentRow[]): Map<string, DocumentRow> {
  const map = new Map<string, DocumentRow>();
  for (const doc of documents) if (!doc.supersededAt && !map.has(doc.label)) map.set(doc.label, doc);
  return map;
}

export function requestedLabels(requests: RequestRow[]): string[] {
  return [...new Set(requests.flatMap((request) => request.items))];
}

/** Espelha a regra do servidor: so e possivel encaminhar com todos os itens pedidos aprovados. */
export function forwardReadiness(requests: RequestRow[], documents: DocumentRow[]) {
  const labels = requestedLabels(requests);
  const current = currentByLabel(documents);
  const missing = labels.filter((label) => !current.has(label));
  const pending = labels.filter((label) => current.get(label)?.status === 'RECEIVED');
  const returned = labels.filter((label) => current.get(label)?.status === 'RETURNED');
  return { ready: labels.length > 0 && !missing.length && !pending.length && !returned.length, missing, pending, returned, total: labels.length };
}

export function publicDocumentsUrl(origin: string, path: string): string {
  return `${origin.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
export type DocGroup = { key: string; title: string; hint?: string; items: string[] };

/** Catalogo completo de documentos que o RH pode pedir (CLT, PJ, estagio e extras). Rotulos com no maximo 60 caracteres. */
export const DOCUMENT_CATALOG: DocGroup[] = [
  { key: 'clt-pessoais', title: 'CLT · Documentos pessoais', items: ['RG ou CNH', 'CPF', 'Título de eleitor', 'Comprovante de quitação eleitoral', 'Certificado de reservista (homens)', 'Carteira de trabalho (CTPS)', 'PIS/PASEP/NIS', 'Certidão de nascimento ou casamento', 'Comprovante de residência', 'Foto 3x4', 'Cartão de vacinação (adulto)'] },
  { key: 'clt-formacao', title: 'CLT · Formação e experiência', items: ['Comprovante de escolaridade', 'Certificados e cursos', 'Diploma', 'Registro em conselho de classe (CRM/CREA/OAB)', 'CNH categoria exigida pela vaga', 'Currículo atualizado', 'Carta de referência'] },
  { key: 'clt-admissao', title: 'CLT · Admissão e saúde', items: ['Dados bancários (comprovante de conta)', 'ASO admissional (atestado de saúde)', 'Exames admissionais', 'Declaração de vale-transporte', 'Certidão de antecedentes criminais', 'Declaração de dependentes para IR', 'Comprovante de conta salário'] },
  { key: 'clt-dependentes', title: 'CLT · Dependentes', items: ['Documentos dos dependentes (se houver)', 'CPF dos dependentes', 'Certidão de nascimento dos filhos', 'Cartão de vacinação dos filhos', 'Comprovante de frequência escolar dos filhos', 'Certidão de casamento ou união estável'] },
  { key: 'pj', title: 'PJ · Empresa e sócio', items: ['Cartão CNPJ', 'Contrato social ou certificado MEI (CCMEI)', 'Alteração contratual', 'Inscrição municipal', 'Inscrição estadual', 'Alvará de funcionamento', 'Comprovante de endereço da empresa', 'RG ou CNH do sócio', 'CPF do sócio', 'Comprovante de residência do sócio'] },
  { key: 'pj-fiscal', title: 'PJ · Fiscal e financeiro', items: ['Dados bancários da empresa (PJ)', 'Certidão negativa de débitos federais', 'Certidão negativa de débitos estaduais', 'Certidão negativa de débitos municipais', 'Certidão de regularidade do FGTS', 'Comprovante de opção pelo Simples Nacional', 'Última guia DAS paga', 'Declaração anual do MEI (DASN)', 'Nota fiscal modelo ou dados para emissão'] },
  { key: 'pj-contrato', title: 'PJ · Contrato e portfólio', items: ['Contrato de prestação de serviços assinado', 'Portfólio ou trabalhos anteriores', 'Seguro de responsabilidade (se aplicável)', 'Termo de confidencialidade (NDA) assinado', 'Certificações profissionais'] },
  { key: 'estagio', title: 'Estágio e aprendiz', items: ['Declaração de matrícula da instituição de ensino', 'Termo de compromisso de estágio', 'Histórico escolar', 'Autorização dos responsáveis (menor de 18)', 'Documento do responsável legal', 'Carteira de vacinação'] },
];

export const DOCUMENT_KITS: { key: string; title: string; items: string[] }[] = [
  { key: 'clt', title: 'Kit CLT completo', items: [...DOCUMENT_CATALOG[0].items.slice(0, 10), 'Comprovante de escolaridade', 'Dados bancários (comprovante de conta)', 'ASO admissional (atestado de saúde)', 'Documentos dos dependentes (se houver)'] },
  { key: 'pj', title: 'Kit PJ completo', items: ['Cartão CNPJ', 'Contrato social ou certificado MEI (CCMEI)', 'Inscrição municipal', 'Comprovante de endereço da empresa', 'RG ou CNH do sócio', 'CPF do sócio', 'Dados bancários da empresa (PJ)', 'Certidão negativa de débitos federais', 'Contrato de prestação de serviços assinado'] },
  { key: 'estagio', title: 'Kit estágio', items: ['RG ou CNH', 'CPF', 'Comprovante de residência', 'Foto 3x4', ...DOCUMENT_CATALOG[7].items.slice(0, 3)] },
];
