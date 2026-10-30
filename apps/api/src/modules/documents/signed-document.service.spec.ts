import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Readable } from 'node:stream';
import { canonicalText, sha256Hex, SIGNATURE_LEGAL_NOTE, SignedDocumentService } from './signed-document.service';
import { isEncryptedFile } from '../../common/crypto/file-crypto';

beforeEach(() => { process.env.KMS_MASTER_KEY = 'ef'.repeat(32); });

function build() {
  const rows = new Map<string, any>();
  const files = new Map<string, Buffer>();
  const prisma: any = {
    signedDocument: {
      create: vi.fn(async ({ data }: any) => { rows.set(data.id, data); return data; }),
      findFirst: vi.fn(async ({ where }: any) => { const r = rows.get(where.id); return r && r.companyId === where.companyId ? r : null; }),
      findMany: vi.fn(async () => [...rows.values()]),
    },
    auditLog: { create: vi.fn(async () => ({})) },
  };
  const storage: any = {
    saveFile: vi.fn(async (k: string, b: Buffer) => { files.set(k, b); return k; }),
    getFileStream: vi.fn(async (k: string) => Readable.from(files.get(k)!)),
    deleteFile: vi.fn(async (k: string) => { files.delete(k); }),
  };
  return { svc: new SignedDocumentService(prisma, storage), prisma, storage, rows, files };
}

const input = {
  companyId: 'c1', kind: 'DECLARACAO_DEPENDENTES', title: 'Declaração de dependentes', text: 'Declaro que os dependentes abaixo são verdadeiros.\nCom acentuação: ção, ã, é.',
  applicationId: 'app-1', templateId: 'tpl-1', templateVersion: 3,
  signer: { name: 'Ana Souza', email: 'ana@x.com', document: '12345678909' },
  evidence: { ip: '203.0.113.7', userAgent: 'Mozilla/5.0 (teste)' },
  brand: { name: 'Acme Ltda', document: '11222333000181' },
  details: [['Dependente 1', 'Beatriz (filha)']] as Array<[string, string]>,
  signedAt: new Date('2026-11-10T15:00:00Z'),
};

describe('assinatura eletronica simples (RS-D-05, documentos)', () => {
  it('gera PDF final, hash do texto e do PDF, e grava IP, user agent, data e hora', async () => {
    const { svc, rows, files } = build();
    const out = await svc.sign(input);
    const row = rows.get(out.id);
    expect(out.textHash).toBe(sha256Hex(canonicalText(input.title, input.text)));
    expect(row).toMatchObject({ ipAddress: '203.0.113.7', userAgent: 'Mozilla/5.0 (teste)', signerName: 'Ana Souza', signerEmail: 'ana@x.com', templateVersion: 3, textHash: out.textHash, signedAt: input.signedAt });
    expect(row.text).toBe(canonicalText(input.title, input.text));
    const stored = files.get(row.pdfKey)!;
    expect(isEncryptedFile(stored)).toBe(true);
    const verified = await svc.verify('c1', out.id);
    expect(verified).toMatchObject({ valid: true, textIntact: true, pdfIntact: true });
    const { buffer } = await svc.read('c1', out.id);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(sha256Hex(buffer)).toBe(out.pdfSha256);
  });
  it('o texto assinado fica versionado: mudar o texto depois invalida o hash', async () => {
    const { svc, rows } = build();
    const out = await svc.sign(input);
    rows.get(out.id).text += ' adulterado';
    expect(await svc.verify('c1', out.id)).toMatchObject({ valid: false, textIntact: false });
  });
  it('PDF adulterado no armazenamento e detectado', async () => {
    const { svc, rows, files } = build();
    const out = await svc.sign(input);
    const key = rows.get(out.id).pdfKey;
    const other = await build().svc.sign({ ...input, text: 'outro texto totalmente diferente' });
    files.set(key, Buffer.from('%PDF-1.4 falso'));
    expect((await svc.verify('c1', out.id)).pdfIntact).toBe(false);
    expect(other.pdfSha256).not.toBe(out.pdfSha256);
  });
  it('isola por empresa e valida a entrada; falha ao gravar o registro remove o PDF e nao deixa lixo', async () => {
    const { svc, prisma, storage, files } = build();
    const out = await svc.sign(input);
    await expect(svc.verify('outra', out.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.sign({ ...input, signer: { name: ' ' } })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.sign({ ...input, text: '  ' })).rejects.toBeInstanceOf(BadRequestException);
    const before = files.size;
    prisma.signedDocument.create.mockRejectedValueOnce(new Error('db'));
    await expect(svc.sign(input)).rejects.toThrow('db');
    expect(storage.deleteFile).toHaveBeenCalled();
    expect(files.size).toBe(before);
  });
  it('audita a criacao com os hashes e cita a base legal', async () => {
    const { svc, prisma } = build();
    const out = await svc.sign(input);
    expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: 'SIGNED_DOCUMENT_CREATED', entityId: out.id, ipAddress: '203.0.113.7', metadata: { kind: 'DECLARACAO_DEPENDENTES', textHash: out.textHash, pdfSha256: out.pdfSha256, templateVersion: 3 } });
    expect(SIGNATURE_LEGAL_NOTE).toMatch(/MP 2\.200-2\/2001/);
    expect(SIGNATURE_LEGAL_NOTE).toMatch(/Lei 14\.063\/2020/);
  });
});
