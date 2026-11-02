import 'reflect-metadata';
import { Readable } from 'node:stream';
import fastifyMultipart from '@fastify/multipart';
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
 * Integracao real: Nest + FastifyAdapter + @fastify/multipart + app.inject().
 * Antes da correcao o controller usava FileInterceptor/req/res do Express e dava 500 sob Fastify.
 */
vi.mock('clamscan', () => ({
  default: class {
    async init() { return { isInfected: async () => ({ isInfected: false, viruses: [] }) }; }
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

describe('anexos de suporte sob Fastify (HTTP real)', () => {
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
  beforeEach(() => { rows.clear(); files.clear(); });

  const upload = (filename: string, content: Buffer, contentType?: string) =>
    app.inject({ method: 'POST', url: `/support/tickets/${TICKET}/attachments`, ...multipart(filename, content, contentType) });

  it('PDF pequeno e aceito (201) e fica em quarentena ate o scan', async () => {
    const res = await upload('relatorio.pdf', pdf());
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ success: true, status: 'QUARANTINED' });
    expect(files.size).toBe(1);
  });

  it('executavel disfarcado de PDF (magic bytes MZ) e recusado com 400', async () => {
    const res = await upload('virus.pdf', Buffer.concat([Buffer.from('MZ'), Buffer.alloc(400)]));
    expect(res.statusCode).toBe(400);
    expect(files.size).toBe(0);
  });

  it('extensao proibida (.exe) e recusada com 400', async () => {
    const res = await upload('setup.exe', Buffer.concat([Buffer.from('MZ'), Buffer.alloc(400)]), 'application/octet-stream');
    expect(res.statusCode).toBe(400);
  });

  it('arquivo acima de 20 MB responde 413', async () => {
    const res = await upload('grande.pdf', Buffer.concat([pdf(), Buffer.alloc(21 * MB)]));
    expect(res.statusCode).toBe(413);
    expect(files.size).toBe(0);
  });

  it('requisicao sem arquivo responde 400', async () => {
    const boundary = '----vazio';
    const res = await app.inject({
      method: 'POST', url: `/support/tickets/${TICKET}/attachments`,
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: `--${boundary}\r\nContent-Disposition: form-data; name="x"\r\n\r\ny\r\n--${boundary}--\r\n`,
    });
    expect(res.statusCode).toBe(400);
  });

  it('download de anexo limpo responde 200 com Content-Disposition seguro e o conteudo', async () => {
    const buffer = pdf();
    rows.set('att-ok', { id: 'att-ok', ticketId: TICKET, storageKey: 'k/ok.pdf', originalName: 'Relatório "final"\r\nX-Evil: 1.pdf', declaredMimeType: 'application/pdf', sizeBytes: BigInt(buffer.length), status: 'CLEAN' });
    files.set('k/ok.pdf', buffer);
    const res = await app.inject({ method: 'GET', url: `/support/tickets/${TICKET}/attachments/att-ok/download` });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    const disposition = String(res.headers['content-disposition']);
    expect(disposition).toMatch(/^attachment; filename="/);
    expect(disposition).not.toMatch(/[\r\n]/);
    expect(disposition).not.toContain('X-Evil:\r');
    expect(res.headers['x-evil']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.rawPayload.equals(buffer)).toBe(true);
  });
});
