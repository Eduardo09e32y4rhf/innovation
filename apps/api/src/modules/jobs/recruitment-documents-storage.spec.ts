import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrivacyRepository } from '../privacy/privacy.repository';
import { RecruitmentDocumentsService } from './recruitment-documents.service';
import { decryptForCompany, encryptForCompany, isEncryptedFile } from '../../common/crypto/file-crypto';
import { generateAccessToken } from './recruitment-documents.rules';

const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.from('CONTEUDO-SECRETO-DO-CANDIDATO'), Buffer.alloc(32)]);
const saved = process.env.KMS_MASTER_KEY;
beforeEach(() => { process.env.KMS_MASTER_KEY = 'cd'.repeat(32); });
afterEach(() => { if (saved === undefined) delete process.env.KMS_MASTER_KEY; else process.env.KMS_MASTER_KEY = saved; });

function build(doc?: any) {
  const { token, hash } = generateAccessToken();
  const request = { id: 'req-1', companyId: 'c1', applicationId: 'app-1', items: ['RG ou CNH'], expiresAt: new Date(Date.now() + 1e8), revokedAt: null, application: { forwardedAt: null, job: { title: 'x', company: { name: 'y' } } } };
  const tx: any = { $executeRaw: vi.fn(), recruitmentDocument: { updateMany: vi.fn(), create: vi.fn(async () => ({})) } };
  const files = new Map<string, Buffer>();
  const prisma: any = {
    recruitmentDocumentRequest: { findUnique: vi.fn(async (a: any) => (a.where.tokenHash === hash ? request : null)) },
    recruitmentDocument: { findFirst: vi.fn(async () => doc ?? null), updateMany: vi.fn(async () => ({ count: 1 })), findMany: vi.fn(async () => []) },
    auditLog: { create: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (fn: any) => fn(tx)),
  };
  const storage: any = { save: vi.fn(async (k: string, b: Buffer) => { files.set(k, b); }), read: vi.fn(async (k: string) => files.get(k)!), replace: vi.fn(async (k: string, b: Buffer) => { files.set(k, b); }), remove: vi.fn() };
  const scope: any = { assertApplication: vi.fn() };
  return { svc: new RecruitmentDocumentsService(prisma, storage, { assertClean: vi.fn() } as any, scope, {} as any), prisma, tx, storage, files, token };
}

describe('arquivos de candidatos cifrados em repouso (RS-D-14)', () => {
  it('o upload grava o arquivo cifrado e marca encrypted=true', async () => {
    const { svc, storage, tx, token } = build();
    await svc.publicUpload(token, 'RG ou CNH', { buffer: pdf });
    const written: Buffer = storage.save.mock.calls[0][1];
    expect(isEncryptedFile(written)).toBe(true);
    expect(written.includes('CONTEUDO-SECRETO')).toBe(false);
    expect(decryptForCompany(written, 'c1').equals(pdf)).toBe(true);
    expect(tx.recruitmentDocument.create.mock.calls[0][0].data.encrypted).toBe(true);
  });
  it('download abre o arquivo cifrado e tambem o antigo em texto plano, cifrando o antigo na leitura', async () => {
    const enc = build();
    enc.files.set('k1', encryptForCompany(pdf, 'c1'));
    const out = await enc.svc.openFile('c1', { id: 'd1', fileKey: 'k1', encrypted: true });
    expect(out.equals(pdf)).toBe(true);
    expect(enc.storage.replace).not.toHaveBeenCalled();

    const legacy = build();
    legacy.files.set('k2', pdf);
    const read = await legacy.svc.openFile('c1', { id: 'd2', fileKey: 'k2', encrypted: false });
    expect(read.equals(pdf)).toBe(true);
    expect(isEncryptedFile(legacy.files.get('k2')!)).toBe(true);
    expect(legacy.prisma.recruitmentDocument.updateMany).toHaveBeenCalledWith({ where: { id: 'd2', companyId: 'c1' }, data: { encrypted: true } });
  });
  it('migracao em lote cifra os arquivos antigos e ignora o que falha', async () => {
    const { svc, prisma, files } = build();
    files.set('a', pdf);
    prisma.recruitmentDocument.findMany.mockResolvedValue([{ id: 'a1', companyId: 'c1', fileKey: 'a' }, { id: 'a2', companyId: 'c1', fileKey: 'ausente' }]);
    expect(await svc.encryptLegacyFiles()).toEqual({ encrypted: 1 });
  });
  it('sem chave mestra a migracao nao faz nada', async () => {
    delete process.env.KMS_MASTER_KEY;
    const { svc } = build();
    expect(await svc.encryptLegacyFiles()).toEqual({ encrypted: 0 });
  });
});

describe('PDF do aceite de privacidade sai do banco (RS-D-14)', () => {
  function repo(consent: any) {
    const prisma: any = {
      privacyConsent: { findUniqueOrThrow: vi.fn(async () => ({ id: consent.id, companyId: consent.companyId })), update: vi.fn(async (a: any) => ({ ...consent, ...a.data })) },
      generatedDocument: { findFirst: vi.fn(async () => null), create: vi.fn(async () => ({})) },
    };
    const files = new Map<string, Buffer>();
    const storage: any = {
      saveFile: vi.fn(async (k: string, b: Buffer) => { files.set(k, b); return k; }),
      getFileStream: vi.fn(async (k: string) => (async function* () { yield files.get(k)!; })()),
    };
    return { repository: new PrivacyRepository(prisma, storage), prisma, storage, files };
  }
  it('novo PDF vai cifrado para o armazenamento e o base64 da linha fica nulo', async () => {
    const consent = { id: 'p1', companyId: 'c1', userId: 'u1', termVersion: 'v1', purpose: 'x', acceptedAt: new Date() };
    const { repository, prisma, storage } = repo(consent);
    await repository.updatePdfBase64('p1', pdf.toString('base64'));
    const data = prisma.privacyConsent.update.mock.calls[0][0].data;
    expect(data.pdfBase64).toBeNull();
    expect(data.pdfKey).toMatch(/^privacy\/c1\/p1-/);
    const privateCall = storage.saveFile.mock.calls.find((c: any[]) => String(c[0]).startsWith('privacy/'));
    expect(isEncryptedFile(privateCall[1])).toBe(true);
  });
  it('registro antigo com base64 e movido para o armazenamento na primeira leitura', async () => {
    const consent = { id: 'p2', companyId: 'c1', pdfKey: null, pdfBase64: pdf.toString('base64') };
    const { repository, prisma } = repo(consent);
    expect(await repository.readConsentPdf(consent)).toBe(pdf.toString('base64'));
    expect(prisma.privacyConsent.update).toHaveBeenCalledWith({ where: { id: 'p2' }, data: { pdfKey: expect.stringMatching(/^privacy\/c1\//), pdfBase64: null } });
  });
  it('registro novo e lido do armazenamento, decifrado', async () => {
    const consent = { id: 'p3', companyId: 'c1', userId: 'u', termVersion: 'v', purpose: 'p', acceptedAt: new Date() };
    const { repository, files } = repo(consent);
    files.set('privacy/c1/p3.pdf', encryptForCompany(pdf, 'c1'));
    expect(await repository.readConsentPdf({ id: 'p3', companyId: 'c1', pdfKey: 'privacy/c1/p3.pdf', pdfBase64: null })).toBe(pdf.toString('base64'));
  });
});
