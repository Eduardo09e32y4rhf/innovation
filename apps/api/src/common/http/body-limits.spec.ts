import fastifyMultipart from '@fastify/multipart';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_BODY_LIMIT, ROUTE_BODY_LIMITS, applyRouteBodyLimits } from './body-limits';

const MB = 1024 * 1024;
const json = (bytes: number) => JSON.stringify({ data: 'x'.repeat(bytes - 20) });

describe('body limits por rota', () => {
  const adapter = new FastifyAdapter({ bodyLimit: DEFAULT_BODY_LIMIT });
  const app = adapter.getInstance();

  beforeAll(async () => {
    applyRouteBodyLimits(app);
    await app.register(fastifyMultipart, { limits: { fileSize: 10 * MB } });
    app.post('/upload', async (req) => {
      const file = await (req as any).file();
      const buffer = await file.toBuffer();
      return { size: buffer.length };
    });
    app.post('/employees', async () => ({ ok: true }));
    app.patch('/companies/me', async () => ({ ok: true }));
    app.post('/companies/me', async () => ({ ok: true }));
    app.post('/communication/messages/send', async () => ({ ok: true }));
    await app.ready();
  });

  afterAll(() => app.close());

  const send = (method: 'POST' | 'PATCH', url: string, bytes: number) =>
    app.inject({ method, url, headers: { 'content-type': 'application/json' }, payload: json(bytes) });

  it('rota comum aceita 900 KB', async () => {
    expect((await send('POST', '/employees', 900 * 1024)).statusCode).toBe(200);
  });

  it('rota comum rejeita 2 MB com 413', async () => {
    expect((await send('POST', '/employees', 2 * MB)).statusCode).toBe(413);
  });

  it('logo da empresa aceita 5 MB e rejeita 7 MB', async () => {
    expect((await send('PATCH', '/companies/me', 5 * MB)).statusCode).toBe(200);
    expect((await send('PATCH', '/companies/me', 7 * MB)).statusCode).toBe(413);
  });

  it('o limite maior vale só para o método da regra', async () => {
    expect((await send('POST', '/companies/me', 2 * MB)).statusCode).toBe(413);
  });

  it('mídia do WhatsApp aceita 12 MB e rejeita 20 MB', async () => {
    expect((await send('POST', '/communication/messages/send', 12 * MB)).statusCode).toBe(200);
    expect((await send('POST', '/communication/messages/send', 20 * MB)).statusCode).toBe(413);
  });

  it('upload multipart de 8 MB não é barrado pelo limite JSON de 1 MB', async () => {
    const boundary = '----qa';
    const head = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="a.pdf"\r\nContent-Type: application/pdf\r\n\r\n`;
    const payload = Buffer.concat([Buffer.from(head), Buffer.alloc(8 * MB, 1), Buffer.from(`\r\n--${boundary}--\r\n`)]);
    const res = await app.inject({ method: 'POST', url: '/upload', headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, payload });
    expect(res.statusCode).toBe(200);
    expect(res.json().size).toBe(8 * MB);
  });

  it('nenhuma regra passa de 16 MB', () => {
    for (const rule of ROUTE_BODY_LIMITS) expect(rule.bytes).toBeLessThanOrEqual(16 * MB);
  });
});
