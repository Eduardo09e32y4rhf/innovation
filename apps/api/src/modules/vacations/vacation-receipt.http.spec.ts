import 'reflect-metadata';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { VacationsController } from './vacations.controller';
import { VacationsService } from './vacations.service';

/** Recibo de ferias em PDF sob FastifyAdapter: antes usava response.setHeader (Express) e dava 500. */
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');

describe('PDF do recibo de ferias sob Fastify (HTTP real)', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    Reflect.defineMetadata('design:paramtypes', [VacationsService], VacationsController);
    const moduleRef = await Test.createTestingModule({
      controllers: [VacationsController],
      providers: [{ provide: VacationsService, useValue: { generateReceiptPdf: async () => ({ buffer: pdf, filename: 'Recibo de férias João.pdf', documentId: 'doc-1', sha256: 'abc', version: 2 }) } }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: (c: any) => { c.switchToHttp().getRequest().user = { sub: 'u1', companyId: 'c1', role: 'RH' }; return true; } })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());

  it('responde 200 application/pdf com Content-Disposition seguro e cabecalhos do documento', async () => {
    const res = await app.inject({ method: 'GET', url: '/vacations/11111111-1111-4111-8111-111111111111/receipt.pdf' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(String(res.headers['content-disposition'])).toMatch(/^attachment; filename="Recibo de ferias Joao.pdf"; filename\*=UTF-8''/);
    expect(res.headers['x-document-id']).toBe('doc-1');
    expect(res.headers['x-document-version']).toBe('2');
    expect(res.rawPayload.equals(pdf)).toBe(true);
  });
});
