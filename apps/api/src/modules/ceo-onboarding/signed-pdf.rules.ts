export const MAX_SIGNED_PDF_BYTES = 10 * 1024 * 1024;

export type SignedPdfIntegrity = 'PREFIX_MATCH' | 'NOT_VERIFIABLE';

const latin1 = (buffer: Buffer) => buffer.toString('latin1');

export function isPdf(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}

/** Numero de assinaturas digitais (cada uma tem um /ByteRange) no arquivo. */
export function countSignatures(pdf: Buffer): number {
  return (latin1(pdf).match(/\/ByteRange\s*\[/g) ?? []).length;
}

/**
 * Assinaturas PAdES sao anexadas por atualizacao incremental: os bytes do PDF anterior continuam intactos no inicio.
 * PREFIX_MATCH = o arquivo assinado comeca exatamente pelo PDF anterior (nada foi alterado antes de assinar).
 * NOT_VERIFIABLE = algumas ferramentas regravam o arquivo; nesse caso so a conferencia humana no validador do ITI garante.
 */
export function integrityAgainst(previous: Buffer, signed: Buffer): SignedPdfIntegrity {
  return signed.length > previous.length && signed.subarray(0, previous.length).equals(previous) ? 'PREFIX_MATCH' : 'NOT_VERIFIABLE';
}

export type SignedPdfCheck = { ok: true; signatureCount: number; integrity: SignedPdfIntegrity } | { ok: false; reason: string };

/** Conferencias automaticas do envio: e PDF, tem assinatura digital e houve assinatura nova em relacao a versao anterior. */
export function checkSignedUpload(previous: Buffer, previousSignatureCount: number, signed: Buffer): SignedPdfCheck {
  if (signed.length === 0) return { ok: false, reason: 'Arquivo vazio.' };
  if (signed.length > MAX_SIGNED_PDF_BYTES) return { ok: false, reason: 'O arquivo deve ter no maximo 10 MB.' };
  if (!isPdf(signed)) return { ok: false, reason: 'Envie o PDF assinado.' };
  const signatureCount = countSignatures(signed);
  if (signatureCount === 0) return { ok: false, reason: 'O PDF nao contem assinatura digital. Assine em assinador.iti.br e envie o arquivo gerado.' };
  if (signatureCount <= previousSignatureCount) return { ok: false, reason: 'O arquivo nao traz uma assinatura nova em relacao a versao ja enviada.' };
  return { ok: true, signatureCount, integrity: integrityAgainst(previous, signed) };
}

/** O DEV so confirma com as duas partes assinadas (DEV e CEO) e declarando ter conferido no validador oficial. */
export function canConfirm(contract: { signedPdfDocumentId?: string | null; signatureCount: number; verifiedAt?: Date | null }): { ok: boolean; reason?: string } {
  if (contract.verifiedAt) return { ok: false, reason: 'Contrato ja confirmado.' };
  if (!contract.signedPdfDocumentId) return { ok: false, reason: 'Nenhum PDF assinado foi enviado.' };
  if (contract.signatureCount < 2) return { ok: false, reason: 'Sao necessarias as assinaturas das duas partes (DEV e CEO).' };
  return { ok: true };
}