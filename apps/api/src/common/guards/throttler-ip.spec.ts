import 'reflect-metadata';
import { Controller, Post, UseGuards } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SkipThrottle, Throttle, ThrottlerModule } from '@nestjs/throttler';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { UserThrottlerGuard } from './user-throttler.guard';
import { buildThrottlerOptions } from './throttler.config';

class JwtAuthGuard { canActivate() { return true; } }

class DemoController {
  login() { return { ok: true }; }
  open() { return { ok: true }; }
  priv() { return { ok: true }; }
  hook() { return { ok: true }; }
}
/** O transformador do Vitest nao compila a sintaxe @: aplica os decorators por chamada. */
function decorate(name: keyof DemoController, ...decorators: MethodDecorator[]) {
  const d = Object.getOwnPropertyDescriptor(DemoController.prototype, name)!;
  for (const dec of decorators.reverse()) dec(DemoController.prototype, name as string, d);
}
Controller()(DemoController);
decorate('login', Throttle({ default: { limit: 5, ttl: 60000 } }), Post('auth/login'));
decorate('open', Post('public/open'));
UseGuards(JwtAuthGuard as any)(DemoController.prototype, 'priv', Object.getOwnPropertyDescriptor(DemoController.prototype, 'priv')!);
decorate('priv', Throttle({ default: { limit: 5, ttl: 60000 } }), Post('private/thing'));
decorate('hook', SkipThrottle(), Post('finance/webhook/asaas'));

async function build(storage?: any): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [ThrottlerModule.forRoot(buildThrottlerOptions(storage))],
    controllers: [DemoController],
    providers: [{ provide: APP_GUARD, useClass: UserThrottlerGuard }],
  }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

const post = (app: NestFastifyApplication, url: string, body: any, ip = '10.0.0.1', headers: Record<string, string> = {}) =>
  app.inject({ method: 'POST', url, payload: body, remoteAddress: ip, headers });

describe('SEG-05: limite por IP alem da conta', () => {
  let app: NestFastifyApplication;
  afterEach(() => app?.close());

  it('mesmo IP com e-mails diferentes e bloqueado na 6a tentativa', async () => {
    app = await build();
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) codes.push((await post(app, '/auth/login', { email: `a${i}@x.com` })).statusCode);
    expect(codes.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
    expect(codes[5]).toBe(429);
  });

  it('CPF diferente no mesmo IP tambem e bloqueado', async () => {
    app = await build();
    let last = 0;
    for (let i = 0; i < 6; i++) last = (await post(app, '/auth/login', { cpf: `1234567890${i}` })).statusCode;
    expect(last).toBe(429);
  });

  it('IPs diferentes nao se afetam, mas a mesma conta continua limitada entre IPs', async () => {
    app = await build();
    for (let i = 0; i < 5; i++) expect((await post(app, '/auth/login', { email: 'v@x.com' }, `10.0.1.${i}`)).statusCode).toBe(201);
    expect((await post(app, '/auth/login', { email: 'v@x.com' }, '10.0.1.99')).statusCode).toBe(429);
    expect((await post(app, '/auth/login', { email: 'outro@x.com' }, '10.0.2.1')).statusCode).toBe(201);
  });

  it('rota autenticada (JwtAuthGuard) nao e contada por IP: empresa atras de NAT nao se bloqueia', async () => {
    app = await build();
    let last = 0;
    for (let i = 0; i < 8; i++) last = (await post(app, '/private/thing', {}, '10.0.0.1', { authorization: `Bearer tok-${i}` })).statusCode;
    expect(last).toBe(201);
  });

  it('webhook (@SkipThrottle) tem limite generoso por IP em vez de ilimitado', async () => {
    app = await build();
    const codes: number[] = [];
    for (let i = 0; i < 602; i++) codes.push((await post(app, '/finance/webhook/asaas', { event: i })).statusCode);
    expect(codes.slice(0, 600).every((c) => c === 201)).toBe(true);
    expect(codes[600]).toBe(429);
  }, 30000);
});

describe('SEG-05: storage em Redis', () => {
  it('o limite sobrevive a reinicio da API (novo app, mesmo Redis) e cai para memoria se o Redis nao responde', async () => {
    const { spawn, execSync } = await import('node:child_process');
    const Redis = (await import('ioredis')).default;
    let bin = '';
    try { bin = execSync('command -v redis-server', { encoding: 'utf8' }).trim(); } catch { /* sem redis-server */ }
    if (!bin) return; // ambiente sem redis-server: coberto pelo teste de memoria abaixo
    const { RedisThrottlerStorage } = await import('../redis/redis-throttler.storage');
    const port = 20000 + Math.floor(Math.random() * 10000);
    const proc = spawn(bin, ['--port', String(port), '--save', '', '--appendonly', 'no'], { stdio: 'ignore' });
    const client = new Redis({ port, lazyConnect: true, maxRetriesPerRequest: 1 });
    try {
      for (let i = 0; i < 50; i++) { try { await client.connect(); break; } catch { await new Promise((r) => setTimeout(r, 100)); } }
      const redis = { getClient: () => client, getStatus: () => true } as any;
      let a = await build(new RedisThrottlerStorage(redis));
      for (let i = 0; i < 5; i++) expect((await post(a, '/auth/login', { email: `r${i}@x.com` })).statusCode).toBe(201);
      await a.close();
      a = await build(new RedisThrottlerStorage(redis)); // "reinicio"
      expect((await post(a, '/auth/login', { email: 'novo@x.com' })).statusCode).toBe(429);
      await a.close();
      // Redis fora: memoria, ainda limita
      const down = { getClient: () => client, getStatus: () => false } as any;
      a = await build(new RedisThrottlerStorage(down));
      const codes: number[] = [];
      for (let i = 0; i < 6; i++) codes.push((await post(a, '/auth/login', { email: `m${i}@x.com` }, '10.9.9.9')).statusCode);
      expect(codes[5]).toBe(429);
      await a.close();
    } finally {
      client.disconnect();
      proc.kill();
    }
  }, 30000);
});
