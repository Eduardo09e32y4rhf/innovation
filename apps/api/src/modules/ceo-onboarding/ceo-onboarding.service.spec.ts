import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CeoOnboardingService } from './ceo-onboarding.service';

const original = Buffer.from('%PDF-1.7\n1 0 obj<<>>endobj\n%%EOF\n', 'latin1');
const sig = (n: number) => Buffer.from(`\n${n} 0 obj<</Type/Sig/ByteRange [0 1 2 3]/Contents <00>>>endobj\n%%EOF\n`, 'latin1');
const signedOnce = Buffer.concat([original, sig(5)]);
const signedTwice = Buffer.concat([signedOnce, sig(9)]);

const ceo = { sub: 'ceo-1', role: 'CEO', email: 'c@x.com' } as any;
const dev = { sub: 'dev-1', role: 'DEV', email: 'd@x.com' } as any;

function build(over: any = {}) {
  const contract = { id: 'k1', ceoUserId: 'ceo-1', version: 'v1', pdfDocumentId: 'doc-orig', signedPdfDocumentId: null, signedPdfIntegrity: null, signatureCount: 0, verifiedAt: null, signedAt: null, ceo: { id: 'ceo-1', companyId: 'c1', onboardingState: 'CONTRACT_PENDING' }, ...over };
  const tx: any = {
    cEOContract: { updateMany: vi.fn(async () => ({ count: 1 })) },
    user: { update: vi.fn(async () => ({})) },
    auditLog: { create: vi.fn(async () => ({})) },
  };
  const prisma: any = {
    cEOContract: { findUnique: vi.fn(async () => contract), updateMany: vi.fn(async () => ({ count: 1 })), findMany: vi.fn(async () => []) },
    auditLog: { create: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (fn: any) => fn(tx)),
  };
  const files: Record<string, Buffer> = { 'doc-orig': original, 'doc-s1': signedOnce };
  const documents: any = {
    readBuffer: vi.fn(async (id: string) => files[id]),
    storeExternalPdf: vi.fn(async () => ({ id: 'doc-new', storageKey: 'k', sha256: 'abc' })),
  };
  return { svc: new CeoOnboardingService(prisma, documents), prisma, tx, documents, contract };
}

describe('assinatura do contrato do CEO pelo gov.br', () => {
  it('o CEO envia a sua assinatura; fica aguardando a outra parte e nao conta como assinado', async () => {
    const { svc, prisma, documents } = build();
    const out = await svc.uploadSigned(ceo, 'k1', signedOnce);
    expect(out).toEqual({ signatureCount: 1, integrity: 'PREFIX_MATCH', awaitingOtherParty: true });
    expect(documents.storeExternalPdf).toHaveBeenCalledTimes(1);
    const data = prisma.cEOContract.updateMany.mock.calls[0][0];
    expect(data.where).toEqual({ id: 'k1', signatureCount: 0, verifiedAt: null });
    expect(data.data).not.toHaveProperty('signedAt');
  });

  it('PDF sem assinatura, repetido ou nao-PDF e recusado sem gravar nada', async () => {
    const { svc, documents, prisma } = build();
    await expect(svc.uploadSigned(ceo, 'k1', original)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.uploadSigned(ceo, 'k1', Buffer.from('<html>'))).rejects.toBeInstanceOf(BadRequestException);
    expect(documents.storeExternalPdf).not.toHaveBeenCalled();
    expect(prisma.cEOContract.updateMany).not.toHaveBeenCalled();
    const second = build({ signedPdfDocumentId: 'doc-s1', signatureCount: 1 });
    await expect(second.svc.uploadSigned(dev, 'k1', signedOnce)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('a segunda parte (DEV) acrescenta a sua assinatura sobre a versao ja assinada', async () => {
    const { svc, documents } = build({ signedPdfDocumentId: 'doc-s1', signatureCount: 1 });
    const out = await svc.uploadSigned(dev, 'k1', signedTwice);
    expect(out).toMatchObject({ signatureCount: 2, awaitingOtherParty: false });
    expect(documents.readBuffer).toHaveBeenCalledWith('doc-s1');
  });

  it('CEO de outro contrato recebe 404; fora da etapa CONTRACT_PENDING e bloqueado', async () => {
    const other = build({ ceoUserId: 'ceo-2' });
    await expect(other.svc.uploadSigned(ceo, 'k1', signedOnce)).rejects.toBeInstanceOf(NotFoundException);
    await expect(other.svc.contractFile(ceo, 'k1', 'original')).rejects.toBeInstanceOf(NotFoundException);
    const early = build({ ceo: { id: 'ceo-1', companyId: 'c1', onboardingState: 'PROFILE_REQUIRED' } });
    await expect(early.svc.uploadSigned(ceo, 'k1', signedOnce)).rejects.toBeInstanceOf(ConflictException);
  });

  it('envio concorrente (outra versao entrou) responde conflito', async () => {
    const { svc, prisma } = build();
    prisma.cEOContract.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(svc.uploadSigned(ceo, 'k1', signedOnce)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('confirmacao pelo DEV', () => {
  const ready = { signedPdfDocumentId: 'doc-s2', signatureCount: 2, signedPdfIntegrity: 'PREFIX_MATCH' };

  it('so o DEV confirma, com as declaracoes e as duas assinaturas', async () => {
    const attest = { checkedItiValidator: true, documentMatches: true };
    const { svc } = build(ready);
    await expect(svc.confirm(ceo, 'k1', attest)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.confirm(dev, 'k1', { checkedItiValidator: true, documentMatches: false })).rejects.toBeInstanceOf(BadRequestException);
    await expect(build({ ...ready, signatureCount: 1 }).svc.confirm(dev, 'k1', attest)).rejects.toBeInstanceOf(ConflictException);
    await expect(build({ ...ready, verifiedAt: new Date() }).svc.confirm(dev, 'k1', attest)).rejects.toBeInstanceOf(ConflictException);
  });

  it('confirmar marca o contrato como assinado, libera o CEO (ACTIVE) e audita', async () => {
    const { svc, tx } = build(ready);
    expect(await svc.confirm(dev, 'k1', { checkedItiValidator: true, documentMatches: true, note: 'Validado no ITI' })).toEqual({ confirmed: true, onboardingState: 'ACTIVE' });
    expect(tx.cEOContract.updateMany.mock.calls[0][0].data).toMatchObject({ verifiedById: 'dev-1', verifiedAt: expect.any(Date), signedAt: expect.any(Date), verificationNote: 'Validado no ITI' });
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'ceo-1' }, data: { onboardingState: 'ACTIVE' } });
    expect(tx.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: 'CEO_CONTRACT_CONFIRMED', entityId: 'k1' });
  });

  it('confirmacao em corrida: so uma vence', async () => {
    const { svc, tx } = build(ready);
    tx.cEOContract.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(svc.confirm(dev, 'k1', { checkedItiValidator: true, documentMatches: true })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('nao existe mais assinatura facial simulada nem desafio facial', () => {
    expect((CeoOnboardingService.prototype as any).sign).toBeUndefined();
    expect((CeoOnboardingService.prototype as any).createChallenge).toBeUndefined();
  });
});