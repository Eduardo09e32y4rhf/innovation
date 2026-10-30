export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;
export const ACCEPTED_DOCUMENT_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg'] as const;

export type DocumentItemStatus = 'PENDING' | 'RECEIVED' | 'APPROVED' | 'RETURNED';

export type DocumentRequestView = {
  company: string;
  jobTitle: string;
  expiresAt: string;
  verification?: { required: boolean; verified: boolean; emailHint: string | null };
  items: Array<{ label: string; status: DocumentItemStatus; returnReason: string | null; accepts?: string; sensitive?: boolean; legalBasis?: string | null }>;
};

/** Texto sempre acompanha a cor: o estado nunca depende so de cor. */
export const STATUS_LABEL: Record<DocumentItemStatus, string> = {
  PENDING: 'Pendente de envio',
  RECEIVED: 'Recebido, aguardando conferência',
  APPROVED: 'Aprovado',
  RETURNED: 'Devolvido, envie novamente',
};

/** Validacao previa so para poupar tempo; o servidor valida o conteudo de verdade. */
export function validateDocumentFile(file: { name: string; size: number } | null | undefined): string | null {
  if (!file) return 'Escolha o arquivo do documento.';
  if (file.size <= 0) return 'O arquivo está vazio.';
  if (file.size > MAX_DOCUMENT_SIZE) return 'O arquivo deve ter no máximo 5 MB.';
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!(ACCEPTED_DOCUMENT_EXTENSIONS as readonly string[]).includes(extension)) return 'Envie um arquivo PDF, PNG ou JPEG.';
  return null;
}

export function explainCodeError(status: number, message?: string): string {
  if (status === 404) return 'Este link é inválido ou expirou. Peça um novo link ao recrutador.';
  if (status === 429) return message || 'Muitas tentativas. Aguarde um minuto e peça um novo código.';
  if (status === 503) return 'Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.';
  return message || 'Não foi possível validar o código. Tente novamente.';
}

export function isValidCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

export function canUpload(status: DocumentItemStatus): boolean {
  return status !== 'APPROVED';
}

export function explainUploadError(status: number, message?: string): string {
  if (status === 404) return 'Este link é inválido ou expirou. Peça um novo link ao recrutador.';
  if (status === 409) return message || 'Este documento não pode ser substituído agora.';
  if (status === 403) return 'Confirme primeiro o código enviado ao seu e-mail.';
  if (status === 413) return 'O arquivo deve ter no máximo 5 MB.';
  if (status === 422) return message || 'O arquivo foi recusado. Envie um PDF, PNG ou JPEG válido.';
  if (status === 429) return 'Muitas tentativas. Aguarde um minuto e tente novamente.';
  if (status === 503) return 'Não foi possível verificar o arquivo agora. Tente novamente em alguns minutos.';
  return message || 'Não foi possível enviar agora. Tente novamente.';
}