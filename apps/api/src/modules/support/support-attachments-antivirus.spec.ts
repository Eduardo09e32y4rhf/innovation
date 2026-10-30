import 'reflect-metadata';
import { Readable } from 'node:stream';
import fastifyMultipart from '@fastify/multipart';
import { ForbiddenException } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SupportAttachmentService } from './support-attachment.service';
import { SupportAuthorizationService } from './support-authorization.service';
import { SupportController } from './support.controller';
import { SupportRefundService } from './support-refund.service';
import { SupportSatisfactionService } from './support-satisfaction.service';
import { SupportStorageService } from './support-storage.service';
import { SupportRepository } from './support.repository';
import { SupportService } from './support.service';

/**
 * Antivirus dos anexos de suporte: o download so libera arquivo CLEAN; qualquer outro estado bloqueia.
 */
const av = vi.hoisted(() => ({
  initFails: false,
  result: (): any => ({ isInfected: false, viruses: [] }),
}));
vi.mock('clamscan', () => ({
  default: class {
    async init() {
      if (av.initFails) throw new Error('clamd indisponivel');
      return { isInfected: async () => av.result() };
    }
  },
}));

const MB = 1024 * 1024;
const TICKET = '11111111-1111-4111-8111-111111111111';
const pdf = () => Buffer.concat([Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n')]);

function multipart(filename: string, content: Buffer, contentType = 'application/pdf') {
  const boundary = '----supporttest';
  const payload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`),
    content,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { payload, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } };
}

describe('anexos de suporte: antivirus fail-closed e tipo real', () => {
  let app: NestFastifyApplication;
  const rows = new Map<string, any>();
  const files = new Map<string, Buffer>();

  const repository = {
    findPlatformTicketById: async (id: string) => (id === TICKET ? { id, companyId: 'c1' } : null),
    createAttachment: async (data: any) => { const row = { id: `att-${rows.size + 1}`, ...data }; rows.set(row.id, row); return row; },
    getAttachmentById: async (id: string) => rows.get(id) ?? null,
    updateAttachmentStatus: async (storageKey: string, status: string, scanResult?: string) => {
      for (const row of rows.values()) if (row.storageKey === storageKey) Object.assign(row, { status, scanResult });
    },
  };
  const storage = {
    saveFile: async (key: string, buffer: Buffer) => { files.set(key, buffer); return `/tmp/${key}`; },
    deleteFile: async (key: string) => { files.delete(key); },
    getFileStream: async (key: string) => Readable.from(files.get(key) ?? Buffer.alloc(0)),
    fileExists: async (key: string) => files.has(key),
    getFilePath: (key: string) => `/tmp/${key}`,
  };
  const authorization = { assertCanUploadAttachment: async () => undefined, assertCanViewTicket: async () => undefined };
  const allowAll = { canActivate: (context: any) => { context.switchToHttp().getRequest().user = { sub: 'u1', companyId: 'c1', role: 'ADMIN' }; return true; } };

  beforeAll(async () => {
    Reflect.defineMetadata('design:paramtypes', [SupportService, SupportAttachmentService, SupportRefundService, SupportSatisfactionService], SupportController);
    Reflect.defineMetadata('design:paramtypes', [SupportRepository, SupportStorageService, SupportAuthorizationService], SupportAttachmentService);
    const moduleRef = await Test.createTestingModule({
      controllers: [SupportController],
      providers: [
        SupportAttachmentService,
        { provide: SupportRepository, useValue: repository },
        { provide: SupportStorageService, useValue: storage },
        { provide: SupportAuthorizationService, useValue: authorization },
        { provide: SupportService, useValue: {} },
        { provide: SupportRefundService, useValue: {} },
        { provide: SupportSatisfactionService, useValue: {} },
      ],
    }).overrideGuard(JwtAuthGuard).useValue(allowAll).overrideGuard(RolesGuard).useValue({ canActivate: () => true }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.register(fastifyMultipart as any, { limits: { fileSize: 10 * MB } });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => { (app.get(SupportAttachmentService) as any).clamscan = null; rows.clear(); files.clear(); av.initFails = false; av.result = () => ({ isInfected: false, viruses: [] }); });

  const upload = (filename: string, content: Buffer, contentType?: string) =>
    app.inject({ method: 'POST', url: `/support/tickets/${TICKET}/attachments`, ...multipart(filename, content, contentType) });


  const statusOf = (id = 'att-1') => rows.get(id)?.status;
  const settle = () => new Promise((resolve) => setTimeout(resolve, 50));
  const download = (id = 'att-1') => app.inject({ method: 'GET', url: `/support/tickets/${TICKET}/attachments/${id}/download` });
  const seed = (status: string) => {
    rows.set('att-1', { id: 'att-1', ticketId: TICKET, storageKey: 'k/a.pdf', originalName: 'a.pdf', declaredMimeType: 'application/pdf', sizeBytes: BigInt(pdf().length), status });
    files.set('k/a.pdf', pdf());
  };

  it.each([
    ['QUARANTINED', 409],
    ['SCANNING', 409],
    ['REJECTED', 403],
    ['DELETED', 404],
    ['STATUS_DESCONHECIDO', 403],
  ])('download com status %s bloqueia (%i) e nao entrega o arquivo', async (status, code) => {
    seed(status);
    const res = await download();
    expect(res.statusCode).toBe(code);
    expect(res.headers['content-disposition']).toBeUndefined();
    expect(res.rawPayload.includes(Buffer.from('%PDF'))).toBe(false);
  });

  it('download de anexo CLEAN libera (200)', async () => {
    seed('CLEAN');
    expect((await download()).statusCode).toBe(200);
  });

  it('o status e checado so depois da autorizacao do chamado', async () => {
    seed('REJECTED');
    const original = authorization.assertCanViewTicket;
    authorization.assertCanViewTicket = async () => { throw new ForbiddenException('Sem acesso ao chamado.'); };
    try {
      const res = await download();
      expect(res.statusCode).toBe(403);
      expect(res.json().message).not.toMatch(/virus|seguranca/i);
    } finally { authorization.assertCanViewTicket = original; }
  });

  it('upload fica em quarentena e so vira CLEAN quando o scan confirma', async () => {
    const res = await upload('ok.pdf', pdf());
    expect(res.statusCode).toBe(201);
    await settle();
    expect(statusOf()).toBe('CLEAN');
    expect((await download()).statusCode).toBe(200);
  });

  it('ClamAV indisponivel: anexo permanece em quarentena e o download e bloqueado', async () => {
    av.initFails = true;
    expect((await upload('ok.pdf', pdf())).statusCode).toBe(201);
    await settle();
    expect(statusOf()).toBe('QUARANTINED');
    expect((await download()).statusCode).toBe(409);
  });

  it('scan com resultado indeterminado (isInfected null) NAO vira CLEAN', async () => {
    av.result = () => ({ isInfected: null, viruses: [] });
    await upload('ok.pdf', pdf());
    await settle();
    expect(statusOf()).toBe('QUARANTINED');
    expect((await download()).statusCode).toBe(409);
  });

  it('erro durante o scan mantem a quarentena', async () => {
    av.result = () => { throw new Error('timeout'); };
    await upload('ok.pdf', pdf());
    await settle();
    expect(statusOf()).toBe('QUARANTINED');
    expect((await download()).statusCode).toBe(409);
  });

  it('virus detectado: REJECTED, arquivo apagado e download 403', async () => {
    av.result = () => ({ isInfected: true, viruses: ['Eicar-Test'] });
    await upload('ok.pdf', pdf());
    await settle();
    expect(statusOf()).toBe('REJECTED');
    expect(files.size).toBe(0);
    expect((await download()).statusCode).toBe(403);
  });

  it('tipo real vale mais que a extensao e o mimetype declarados', async () => {
    const res = await upload('foto.png', pdf(), 'text/html');
    expect(res.statusCode).toBe(201);
    await settle();
    const row = rows.get('att-1');
    expect(row.storageKey).toMatch(/\.pdf$/);
    expect(row.declaredMimeType).toBe('application/pdf');
    expect(row.originalName).toBe('foto.pdf');
    const dl = await download();
    expect(dl.statusCode).toBe(200);
    expect(dl.headers['content-type']).toContain('application/pdf');
  });

  it('PDF com JavaScript ativo e recusado (400)', async () => {
    const active = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >>\nendobj\n%%EOF\n');
    expect((await upload('a.pdf', active)).statusCode).toBe(400);
  });
});
