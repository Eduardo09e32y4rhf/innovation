import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { Readable } from 'node:stream';
import { Logger } from '@nestjs/common';
import { RecruitmentDocumentsService } from './recruitment-documents.service';
import { DOC_TYPE_RULES, canReadSensitive, docTypeForLabel } from './recruitment-doc-types';
import { generateAccessToken } from './recruitment-documents.rules';

const aso = { id: 'd1', applicationId: 'app-1', fileKey: 'secret/path/key.pdf', fileName: 'ASO.pdf', mimeType: 'application/pdf', encrypted: false, sensitive: true, legalBasis: DOC_TYPE_RULES.ASO.legalBasis, docType: 'ASO', status: 'RECEIVED', supersededAt: null, label: 'ASO admissional (atestado de saúde)' };

function build(doc: any = aso) {
  const prisma: any = {
    recruitmentDocument: { findFirst: vi.fn(async () => doc), findMany: vi.fn(async () => [{ ...doc, requestId: 'r' }]), updateMany: vi.fn(async () => ({ count: 1 })) },
    recruitmentDocumentRequest: { findMany: vi.fn(async () => []) },
    application: { findFirst: vi.fn(async () => ({ selectedAt: null, forwardedAt: null })) },
    auditLog: { create: vi.fn(async () => ({})) },
  };
  const storage: any = { read: vi.fn(async () => Buffer.from('%PDF-1.7')), replace: vi.fn(), stream: vi.fn(() => Readable.from(Buffer.from('x'))) };
  const scope: any = { assertApplication: vi.fn() };
  return { svc: new RecruitmentDocumentsService(prisma, storage, {} as any, scope, {} as any), prisma, storage };
}

describe('dados sensiveis (RS-D-08)', () => {
  it('ASO, antecedentes, vacina e laudo PCD/CID sao sensiveis e tem base legal; documento comum nao', () => {
    for (const label of ['ASO admissional (atestado de saúde)', 'Certidão de antecedentes criminais', 'Cartão de vacinação (adulto)', 'Laudo médico PCD (com CID)']) {
      const rule = DOC_TYPE_RULES[docTypeForLabel(label)];
      expect(rule.sensitive, label).toBe(true);
      expect(rule.legalBasis, label).toMatch(/LGPD/);
    }
    expect(DOC_TYPE_RULES[docTypeForLabel('CPF')].sensitive).toBe(false);
  });
  it('so RH, ADMIN e DEV leem; RH_RS e GESTOR nao', () => {
    expect(['RH', 'ADMIN', 'DEV'].every(canReadSensitive)).toBe(true);
    expect(['RH_RS', 'GESTOR', 'EMPLOYEE', undefined].some((role) => canReadSensitive(role as string))).toBe(false);
  });
  it('RH_RS nao baixa nem confere documento sensivel e nada e auditado como leitura', async () => {
    const { svc, prisma } = build();
    await expect(svc.download('c1', { sub: 'u', role: 'RH_RS' }, 'd1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.review('c1', { sub: 'u', role: 'RH_RS' }, 'd1', { decision: 'APPROVED', expiresAt: '2099-01-01' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(prisma.recruitmentDocument.updateMany).not.toHaveBeenCalled();
  });
  it('RH le e a LEITURA e auditada com tipo e base legal, sem nome de arquivo nem chave de armazenamento', async () => {
    const { svc, prisma } = build();
    await svc.download('c1', { sub: 'rh-1', role: 'RH' }, 'd1');
    const log = prisma.auditLog.create.mock.calls[0][0].data;
    expect(log.action).toBe('RECRUITMENT_SENSITIVE_DOCUMENT_READ');
    expect(log.metadata).toMatchObject({ documentId: 'd1', docType: 'ASO' });
    expect(log.metadata.legalBasis).toMatch(/LGPD/);
    expect(JSON.stringify(log)).not.toContain('secret/path');
    expect(JSON.stringify(log)).not.toContain('ASO.pdf');
  });
  it('documento comum continua com a auditoria de download de sempre', async () => {
    const { svc, prisma } = build({ ...aso, sensitive: false, docType: 'CPF' });
    await svc.download('c1', { sub: 'u', role: 'RH_RS' }, 'd1');
    expect(prisma.auditLog.create.mock.calls[0][0].data.action).toBe('RECRUITMENT_DOCUMENT_DOWNLOADED');
  });
  it('lista: quem nao e RH ve o estado mas nao o nome do arquivo', async () => {
    const { svc } = build();
    const rs: any = await svc.listForApplication('c1', { sub: 'u', role: 'RH_RS' }, 'app-1');
    expect(rs.documents[0]).toMatchObject({ restricted: true, fileName: 'Documento sensível' });
    expect(rs.canReadSensitive).toBe(false);
    const rh: any = await svc.listForApplication('c1', { sub: 'rh', role: 'RH' }, 'app-1');
    expect(rh.documents[0]).toMatchObject({ restricted: false, fileName: 'ASO.pdf' });
  });
  it('falha de gravacao nao escreve a chave nem o conteudo no log', async () => {
    const { token, hash } = generateAccessToken();
    const request = { id: 'r', companyId: 'c1', applicationId: 'app-1', items: ['ASO admissional (atestado de saúde)'], expiresAt: new Date(Date.now() + 1e8), revokedAt: null, application: { forwardedAt: null, job: { title: 'x', company: { name: 'y' } } } };
    const prisma: any = { recruitmentDocumentRequest: { findUnique: vi.fn(async (a: any) => (a.where.tokenHash === hash ? request : null)) }, recruitmentDocument: { findFirst: vi.fn(async () => null) } };
    const storage: any = { save: vi.fn(async () => { throw new Error('disco cheio em /dados/segredo.pdf'); }) };
    const spy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const svc = new RecruitmentDocumentsService(prisma, storage, { assertClean: vi.fn() } as any, {} as any, {} as any);
    await expect(svc.publicUpload(token, 'ASO admissional (atestado de saúde)', { buffer: Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(32)]) })).rejects.toThrow();
    const logged = spy.mock.calls.map((c) => String(c[0])).join(' ');
    expect(logged).not.toMatch(/documents\/app-1|\.pdf|\/dados/);
    spy.mockRestore();
  });
});
