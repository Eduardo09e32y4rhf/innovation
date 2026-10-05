import { afterEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException, PayloadTooLargeException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { RecruitmentDocumentsService } from './recruitment-documents.service';
import { generateAccessToken, hashAccessToken } from './recruitment-documents.rules';

const actor = { sub: 'rs-1', role: 'RH_RS' };
const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(32)]);
const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(32)]);

function build(opts: { request?: any; scan?: () => Promise<void>; scopeFail?: boolean; docs?: any[]; application?: any } = {}) {
  const calls: string[] = [];
  const { token, hash } = generateAccessToken();
  const request = opts.request === undefined
    ? { id: 'req-1', companyId: 'c1', applicationId: 'app-1', items: ['RG', 'CPF'], expiresAt: new Date(Date.now() + 86_400_000), revokedAt: null, application: { forwardedAt: null, job: { title: 'Dev', company: { name: 'Acme' } } } }
    : opts.request;
  const tx: any = {
    $executeRaw: vi.fn(async () => 1),
    recruitmentDocument: {
      updateMany: vi.fn(async () => ({ count: 1 })),
      create: vi.fn(async () => { calls.push('db.create'); return {}; }),
      findMany: vi.fn(async () => opts.docs ?? []),
    },
    recruitmentDocumentRequest: { findMany: vi.fn(async () => [{ items: ['RG', 'CPF'] }]), updateMany: vi.fn(async () => ({ count: 1 })) },
    application: { findFirst: vi.fn(async () => opts.application ?? { selectedAt: new Date(), forwardedAt: null }), update: vi.fn(async () => ({})) },
    auditLog: { create: vi.fn(async () => ({})) },
  };
  const prisma: any = {
    recruitmentDocumentRequest: { findUnique: vi.fn(async () => request), create: vi.fn(async (a: any) => ({ id: 'req-9', items: a.data.items, expiresAt: a.data.expiresAt })), findMany: vi.fn(async () => []), findFirst: vi.fn(async () => ({ id: 'req-1', applicationId: 'app-1' })), updateMany: vi.fn(async () => ({ count: 1 })) },
    recruitmentDocument: { findFirst: vi.fn(async () => opts.docs?.[0] ?? null), findMany: vi.fn(async () => opts.docs ?? []), updateMany: vi.fn(async () => ({ count: 1 })) },
    application: { findFirst: vi.fn(async () => ({ forwardedAt: null })), updateMany: vi.fn(async () => ({ count: 1 })) },
    auditLog: { create: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (fn: any) => fn(tx)),
  };
  const storage: any = { save: vi.fn(async () => { calls.push('storage.save'); }), remove: vi.fn(async () => undefined), stream: vi.fn() };
  const scanner: any = { assertClean: vi.fn(async (b: Buffer) => { calls.push('scan'); await opts.scan?.(); }) };
  const scope: any = { assertApplication: vi.fn(async () => { if (opts.scopeFail) throw new NotFoundException('Candidatura nao encontrada.'); }) };
  prisma.recruitmentDocumentRequest.findUnique.mockImplementation(async (a: any) => (a.where.tokenHash === hash ? request : null));
  return { svc: new RecruitmentDocumentsService(prisma, storage, scanner, scope), prisma, tx, storage, scanner, scope, calls, token, hash };
}

afterEach(() => vi.restoreAllMocks());

describe('link de documentos', () => {
  it('guarda so o hash do token e devolve o token bruto uma unica vez', async () => {
    const { svc, prisma } = build();
    const out: any = await svc.createRequest('c1', actor, 'app-1', { items: ['RG', 'rg', 'CPF'], expiresInDays: 5 });
    const stored = prisma.recruitmentDocumentRequest.create.mock.calls[0][0].data;
    expect(stored.tokenHash).toBe(hashAccessToken(out.token));
    expect(JSON.stringify(stored)).not.toContain(out.token);
    expect(stored.items).toEqual(['RG', 'CPF']);
    expect(out.path).toBe(`/carreiras/documentos/${out.token}`);
  });

  it('fora do escopo da vaga/empresa nada e gravado; candidatura ja encaminhada recusa novo link', async () => {
    const out = build({ scopeFail: true });
    await expect(out.svc.createRequest('c1', actor, 'app-1', { items: ['RG'] })).rejects.toBeInstanceOf(NotFoundException);
    expect(out.prisma.recruitmentDocumentRequest.create).not.toHaveBeenCalled();
    const fwd = build();
    fwd.prisma.application.findFirst.mockResolvedValue({ forwardedAt: new Date() });
    await expect(fwd.svc.createRequest('c1', actor, 'app-1', { items: ['RG'] })).rejects.toBeInstanceOf(ConflictException);
  });

  it('link expirado, revogado, inexistente ou de formato invalido responde igual (404)', async () => {
    const past = new Date(Date.now() - 1000);
    for (const request of [{ id: 'r', companyId: 'c1', applicationId: 'a', items: ['RG'], expiresAt: past, revokedAt: null, application: { forwardedAt: null, job: { title: 't', company: { name: 'n' } } } }, { id: 'r', companyId: 'c1', applicationId: 'a', items: ['RG'], expiresAt: new Date(Date.now() + 1e6), revokedAt: new Date(), application: { forwardedAt: null, job: { title: 't', company: { name: 'n' } } } }]) {
      const { svc, token } = build({ request });
      await expect(svc.publicView(token)).rejects.toThrow('Link invalido ou expirado.');
    }
    const { svc } = build();
    await expect(svc.publicView('curto')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.publicView(generateAccessToken().token)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('a visao publica nao expoe dados pessoais nem o arquivo', async () => {
    const { svc, token } = build({ docs: [{ label: 'RG', status: 'RETURNED', returnReason: 'Ilegivel' }] });
    const view: any = await svc.publicView(token);
    expect(view).toEqual({ company: 'Acme', jobTitle: 'Dev', expiresAt: expect.any(Date), items: [{ label: 'RG', status: 'RETURNED', returnReason: 'Ilegivel' }, { label: 'CPF', status: 'PENDING', returnReason: null }] });
  });
});

describe('envio do documento pelo candidato', () => {
  it('conteudo invalido nao e escaneado, salvo nem persistido (nome .pdf nao basta)', async () => {
    const { svc, token, scanner, storage, tx } = build();
    await expect(svc.publicUpload(token, 'RG', { buffer: exe })).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(scanner.assertClean).not.toHaveBeenCalled();
    expect(storage.save).not.toHaveBeenCalled();
    expect(tx.recruitmentDocument.create).not.toHaveBeenCalled();
  });

  it('item nao solicitado, arquivo vazio e arquivo acima de 5 MB sao recusados', async () => {
    const { svc, token } = build();
    await expect(svc.publicUpload(token, 'Outro', { buffer: pdf })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.publicUpload(token, 'RG', undefined)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.publicUpload(token, 'RG', { buffer: Buffer.concat([pdf, Buffer.alloc(5 * 1024 * 1024)]) })).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('arquivo infectado ou scanner indisponivel (producao) nunca chega ao banco nem ao disco', async () => {
    for (const failure of [new UnprocessableEntityException('infectado'), new ServiceUnavailableException('indisponivel')]) {
      const { svc, token, storage, tx } = build({ scan: async () => { throw failure; } });
      await expect(svc.publicUpload(token, 'RG', { buffer: pdf })).rejects.toBe(failure);
      expect(storage.save).not.toHaveBeenCalled();
      expect(tx.recruitmentDocument.create).not.toHaveBeenCalled();
    }
  });

  it('sucesso: scan antes de salvar e de gravar; a versao anterior vira superada', async () => {
    const { svc, token, calls, tx, storage } = build();
    await svc.publicUpload(token, 'RG', { buffer: pdf });
    expect(calls).toEqual(['scan', 'storage.save', 'db.create']);
    expect(tx.recruitmentDocument.updateMany).toHaveBeenCalledWith({ where: { applicationId: 'app-1', label: 'RG', supersededAt: null }, data: { supersededAt: expect.any(Date) } });
    const data = tx.recruitmentDocument.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ companyId: 'c1', applicationId: 'app-1', label: 'RG', mimeType: 'application/pdf', fileName: 'RG.pdf' });
    expect(data.fileKey).toMatch(/^c1\/documents\/app-1\/[0-9a-f-]{36}\.pdf$/);
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('falha ao gravar no banco remove o arquivo salvo; documento ja aprovado nao e substituido', async () => {
    const failing = build();
    failing.tx.recruitmentDocument.create.mockRejectedValue(new Error('db'));
    await expect(failing.svc.publicUpload(failing.token, 'RG', { buffer: pdf })).rejects.toThrow('db');
    expect(failing.storage.remove).toHaveBeenCalledTimes(1);
    const approved = build({ docs: [{ label: 'RG', status: 'APPROVED' }] });
    await expect(approved.svc.publicUpload(approved.token, 'RG', { buffer: pdf })).rejects.toBeInstanceOf(ConflictException);
    expect(approved.scanner.assertClean).not.toHaveBeenCalled();
  });
});

describe('conferencia e encaminhamento', () => {
  it('devolver exige motivo; decisao concorrente nao sobrescreve', async () => {
    const { svc, prisma } = build();
    prisma.recruitmentDocument.findFirst.mockResolvedValue({ id: 'd1', applicationId: 'app-1', status: 'RECEIVED', supersededAt: null });
    await expect(svc.review('c1', actor, 'd1', { decision: 'RETURNED', reason: ' ' })).rejects.toBeInstanceOf(BadRequestException);
    prisma.recruitmentDocument.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(svc.review('c1', actor, 'd1', { decision: 'APPROVED' })).rejects.toBeInstanceOf(ConflictException);
    prisma.recruitmentDocument.updateMany.mockResolvedValueOnce({ count: 1 });
    await expect(svc.review('c1', actor, 'd1', { decision: 'RETURNED', reason: 'Imagem ilegivel' })).resolves.toEqual({ id: 'd1', status: 'RETURNED' });
  });

  it('documento de outra empresa/escopo responde 404 e nao e baixado nem revisado', async () => {
    const { svc, prisma } = build({ scopeFail: true });
    prisma.recruitmentDocument.findFirst.mockResolvedValue({ id: 'd1', applicationId: 'app-1', fileKey: 'k', fileName: 'f', mimeType: 'application/pdf', status: 'RECEIVED', supersededAt: null });
    await expect(svc.download('c1', actor, 'd1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.review('c1', actor, 'd1', { decision: 'APPROVED' })).rejects.toBeInstanceOf(NotFoundException);
    prisma.recruitmentDocument.findFirst.mockResolvedValue(null);
    await expect(svc.download('c1', actor, 'd1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('encaminhar exige candidato selecionado e todos os itens aprovados', async () => {
    const notSelected = build({ application: { selectedAt: null, forwardedAt: null } });
    await expect(notSelected.svc.forward('c1', actor, 'app-1')).rejects.toBeInstanceOf(ConflictException);
    const pending = build({ docs: [{ label: 'RG', status: 'APPROVED' }, { label: 'CPF', status: 'RECEIVED' }] });
    await expect(pending.svc.forward('c1', actor, 'app-1')).rejects.toMatchObject({ response: { code: 'DOCUMENTS_NOT_READY', pending: ['CPF'] } });
    expect(pending.tx.application.update).not.toHaveBeenCalled();
  });

  it('encaminhar com tudo aprovado revoga links e NAO cria funcionario nem usuario', async () => {
    const { svc, tx } = build({ docs: [{ label: 'RG', status: 'APPROVED' }, { label: 'CPF', status: 'APPROVED' }] });
    const out = await svc.forward('c1', actor, 'app-1');
    expect(out).toEqual({ forwarded: true, alreadyForwarded: false });
    expect(tx.application.update).toHaveBeenCalledWith({ where: { id: 'app-1' }, data: { forwardedAt: expect.any(Date), forwardedById: 'rs-1' } });
    expect(tx.recruitmentDocumentRequest.updateMany).toHaveBeenCalledWith({ where: { companyId: 'c1', applicationId: 'app-1', revokedAt: null }, data: { revokedAt: expect.any(Date) } });
    expect(Object.keys(tx)).not.toContain('employee');
    expect(Object.keys(tx)).not.toContain('user');
  });

  it('reenvio do encaminhamento e idempotente', async () => {
    const { svc, tx } = build({ application: { selectedAt: new Date(), forwardedAt: new Date() } });
    expect(await svc.forward('c1', actor, 'app-1')).toEqual({ forwarded: true, alreadyForwarded: true });
    expect(tx.application.update).not.toHaveBeenCalled();
  });
});