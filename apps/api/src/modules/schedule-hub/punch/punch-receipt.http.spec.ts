import 'reflect-metadata';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RateLimitGuard } from '../../../common/guards/rate-limit.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PunchController } from './punch.controller';
import { PunchService } from './punch.service';

/** Recibo de ponto em PDF sob FastifyAdapter: antes usava res.set/res.end do Express e dava 500. */
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');

describe('PDF do recibo de ponto sob Fastify (HTTP real)', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    Reflect.defineMetadata('design:paramtypes', [PunchService], PunchController);
    const moduleRef = await Test.createTestingModule({
      controllers: [PunchController],
      providers: [{ provide: PunchService, useValue: { receiptPdf: async () => ({ buffer: pdf, filename: 'Recibo de ponto João.pdf' }) } }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: (c: any) => { c.switchToHttp().getRequest().user = { sub: 'u1', companyId: 'c1', role: 'FUNCIONARIO' }; return true; } })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard).useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());

  it('responde 200 application/pdf com Content-Disposition seguro, sem cache e com o conteudo', async () => {
    const res = await app.inject({ method: 'GET', url: '/escalas/punch/receipt/ABC123/pdf' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(String(res.headers['content-disposition'])).toMatch(/^attachment; filename="Recibo de ponto Joao.pdf"; filename\*=UTF-8''/);
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(Number(res.headers['content-length'])).toBe(pdf.length);
    expect(res.rawPayload.equals(pdf)).toBe(true);
  });
});
