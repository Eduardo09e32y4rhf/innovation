import 'reflect-metadata';
import { Readable } from 'node:stream';
import fastifyMultipart from '@fastify/multipart';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../database/prisma.service';
import { ScheduleScopeService } from '../schedule/access/schedule-scope.service';
import { ScheduleService } from '../schedule/schedule.service';
import { CalendarService } from './calendar/calendar.service';
import { HubController } from './hub.controller';
import { LaunchService } from './launch/launch.service';
import { OverridesService } from './overrides/overrides.service';
import { OverviewService } from './overview/overview.service';

/** Anexo de atestado da escala: upload (multipart) e download sob FastifyAdapter, sem Express. */
const MB = 1024 * 1024;
const EMPLOYEE = '22222222-2222-4222-8222-222222222222';
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');

function multipart(parts: Array<{ name: string; value?: string; filename?: string; content?: Buffer }>) {
  const boundary = '----hubtest';
  const chunks: Buffer[] = [];
  for (const part of parts) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"${part.filename ? `; filename="${part.filename}"` : ''}\r\n${part.filename ? 'Content-Type: application/pdf\r\n' : ''}\r\n`));
    chunks.push(part.content ?? Buffer.from(part.value ?? ''));
    chunks.push(Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { payload: Buffer.concat(chunks), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } };
}

describe('anexo de escala (hub) sob Fastify (HTTP real)', () => {
  let app: NestFastifyApplication;
  const saved: any[] = [];
  const launches = {
    saveAttachment: async (_actor: any, employeeId: string, file: any) => { saved.push({ employeeId, file }); return { id: 'a1', fileName: file.originalname }; },
    attachmentFile: async () => ({ stream: Readable.from(pdf), fileName: 'Atestado médico.pdf', mimetype: 'application/pdf' }),
  };

  beforeAll(async () => {
    Reflect.defineMetadata('design:paramtypes', [OverviewService, CalendarService, OverridesService, ScheduleScopeService, PrismaService, ScheduleService, LaunchService], HubController);
    const moduleRef = await Test.createTestingModule({
      controllers: [HubController],
      providers: [
        { provide: OverviewService, useValue: {} }, { provide: CalendarService, useValue: {} }, { provide: OverridesService, useValue: {} },
        { provide: ScheduleScopeService, useValue: {} }, { provide: PrismaService, useValue: {} }, { provide: ScheduleService, useValue: {} },
        { provide: LaunchService, useValue: launches },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: (c: any) => { c.switchToHttp().getRequest().user = { sub: 'u1', companyId: 'c1', role: 'ADMIN' }; return true; } })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.register(fastifyMultipart as any, { limits: { fileSize: 10 * MB } });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());

  it('upload de PDF pequeno responde 201 e repassa employeeId + arquivo ao servico', async () => {
    saved.length = 0;
    const res = await app.inject({ method: 'POST', url: '/escalas/launch/attachment', ...multipart([{ name: 'employeeId', value: EMPLOYEE }, { name: 'file', filename: 'atestado.pdf', content: pdf }]) });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ id: 'a1' });
    expect(saved[0].employeeId).toBe(EMPLOYEE);
    expect(saved[0].file.originalname).toBe('atestado.pdf');
    expect(saved[0].file.size).toBe(pdf.length);
    expect(saved[0].file.buffer.equals(pdf)).toBe(true);
  });

  it('aceita o campo employeeId depois do arquivo', async () => {
    saved.length = 0;
    const res = await app.inject({ method: 'POST', url: '/escalas/launch/attachment', ...multipart([{ name: 'file', filename: 'a.pdf', content: pdf }, { name: 'employeeId', value: EMPLOYEE }]) });
    expect(res.statusCode).toBe(201);
    expect(saved[0].employeeId).toBe(EMPLOYEE);
  });

  it('employeeId invalido responde 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/escalas/launch/attachment', ...multipart([{ name: 'employeeId', value: 'nao-e-uuid' }, { name: 'file', filename: 'a.pdf', content: pdf }]) });
    expect(res.statusCode).toBe(400);
  });

  it('arquivo acima do limite de 10 MB responde 413', async () => {
    const res = await app.inject({ method: 'POST', url: '/escalas/launch/attachment', ...multipart([{ name: 'employeeId', value: EMPLOYEE }, { name: 'file', filename: 'g.pdf', content: Buffer.concat([pdf, Buffer.alloc(11 * MB)]) }]) });
    expect(res.statusCode).toBe(413);
  });

  it('sem arquivo responde 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/escalas/launch/attachment', ...multipart([{ name: 'employeeId', value: EMPLOYEE }]) });
    expect(res.statusCode).toBe(400);
  });

  it('download responde 200 com Content-Disposition seguro e nosniff', async () => {
    const res = await app.inject({ method: 'GET', url: '/escalas/launch/attachments/a1' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(String(res.headers['content-disposition'])).toMatch(/^attachment; filename="Atestado medico.pdf"; filename\*=UTF-8''/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.rawPayload.equals(pdf)).toBe(true);
  });
});
