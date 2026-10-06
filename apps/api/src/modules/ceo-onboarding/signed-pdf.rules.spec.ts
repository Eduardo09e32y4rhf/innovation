import { describe, expect, it } from 'vitest';
import { canConfirm, checkSignedUpload, countSignatures, integrityAgainst } from './signed-pdf.rules';

const original = Buffer.from('%PDF-1.7\n1 0 obj<<>>endobj\n%%EOF\n', 'latin1');
const sig = (n: number) => Buffer.from(`\n${n} 0 obj<</Type/Sig/Filter/Adobe.PPKLite/ByteRange [0 100 200 300]/Contents <00>>>endobj\n%%EOF\n`, 'latin1');
const signedOnce = Buffer.concat([original, sig(5)]);
const signedTwice = Buffer.concat([signedOnce, sig(9)]);

describe('conferencia do PDF assinado (gov.br)', () => {
  it('conta assinaturas pelo /ByteRange', () => {
    expect(countSignatures(original)).toBe(0);
    expect(countSignatures(signedOnce)).toBe(1);
    expect(countSignatures(signedTwice)).toBe(2);
  });
  it('integridade: PREFIX_MATCH quando o original segue intacto no inicio; senao NOT_VERIFIABLE', () => {
    expect(integrityAgainst(original, signedOnce)).toBe('PREFIX_MATCH');
    expect(integrityAgainst(original, Buffer.concat([Buffer.from('%PDF-1.4 outro'), sig(5)]))).toBe('NOT_VERIFIABLE');
    expect(integrityAgainst(original, original)).toBe('NOT_VERIFIABLE');
  });
  it('aceita 1a e 2a assinatura em sequencia', () => {
    expect(checkSignedUpload(original, 0, signedOnce)).toEqual({ ok: true, signatureCount: 1, integrity: 'PREFIX_MATCH' });
    expect(checkSignedUpload(signedOnce, 1, signedTwice)).toEqual({ ok: true, signatureCount: 2, integrity: 'PREFIX_MATCH' });
  });
  it('recusa: vazio, nao-PDF, sem assinatura, repetido e grande demais', () => {
    expect(checkSignedUpload(original, 0, Buffer.alloc(0)).ok).toBe(false);
    expect(checkSignedUpload(original, 0, Buffer.from('<html>')).ok).toBe(false);
    expect(checkSignedUpload(original, 0, original)).toMatchObject({ ok: false });
    expect(checkSignedUpload(signedOnce, 1, signedOnce)).toMatchObject({ ok: false, reason: expect.stringContaining('assinatura nova') });
    expect(checkSignedUpload(original, 0, Buffer.concat([signedOnce, Buffer.alloc(10 * 1024 * 1024)]))).toMatchObject({ ok: false });
  });
  it('confirmacao exige PDF enviado e as duas assinaturas; nao confirma duas vezes', () => {
    expect(canConfirm({ signatureCount: 0 }).ok).toBe(false);
    expect(canConfirm({ signedPdfDocumentId: 'd', signatureCount: 1 }).ok).toBe(false);
    expect(canConfirm({ signedPdfDocumentId: 'd', signatureCount: 2 }).ok).toBe(true);
    expect(canConfirm({ signedPdfDocumentId: 'd', signatureCount: 2, verifiedAt: new Date() }).ok).toBe(false);
  });
});