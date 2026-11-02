import 'reflect-metadata';
import { createServer, Server as HttpServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { JwtService } from '../../apps/api/node_modules/@nestjs/jwt';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { RedisIoAdapter } from '../../apps/api/src/common/adapters/redis-io.adapter';
import { CommunicationGateway } from '../../apps/api/src/modules/communication/realtime/communication.gateway';

// SEG-14: namespace 'communication' exige JWT de acesso no handshake; a sala vem do token, nao do cliente.
process.env.JWT_SECRET = 'test-secret-socket-auth-0123456789';
const jwt = new JwtService();
const sign = (payload: object) => jwt.signAsync(payload, { secret: process.env.JWT_SECRET });

let http: HttpServer; let base: string; let io: any; const gateway = new CommunicationGateway();

async function connect(authPayload: object | null, query = '') {
  const url = `${base}/socket.io/?EIO=4&transport=polling${query}`;
  const open = await (await fetch(url)).text();
  const sid = JSON.parse(open.slice(1)).sid;
  const body = `40/communication${authPayload ? ',' + JSON.stringify(authPayload) : ','}`;
  await fetch(`${url}&sid=${sid}`, { method: 'POST', body });
  const reply = await (await fetch(`${url}&sid=${sid}`)).text();
  return reply;
}

beforeAll(async () => {
  http = createServer();
  const adapter = new RedisIoAdapter(http as any);
  io = adapter.createIOServer(0);
  const ns = io.of('communication');
  gateway.server = ns;
  ns.on('connection', (socket: any) => gateway.handleConnection(socket));
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
});
afterAll(async () => { await io?.close(); });

describe('SEG-14 handshake do socket.io', () => {
  it('sem token: recusa (44)', async () => {
    expect(await connect(null)).toMatch(/^44\/communication,.*Não autorizado/);
  });
  it('companyId enviado pelo cliente (auth/query) sem JWT nao autentica', async () => {
    expect(await connect({ companyId: 'empresa-b' }, '&companyId=empresa-b')).toMatch(/^44\/communication/);
  });
  it('token invalido ou de outro proposito (reset/refresh): recusa', async () => {
    expect(await connect({ token: 'lixo' })).toMatch(/^44\//);
    const reset = await sign({ sub: 'u1', companyId: 'empresa-a', purpose: 'password-reset' });
    expect(await connect({ token: reset })).toMatch(/^44\//);
  });
  it('token de acesso valido conecta (40) e entra SO na sala da empresa do token', async () => {
    const token = await sign({ sub: 'u1', companyId: 'empresa-a', role: 'RH', purpose: 'access' });
    const reply = await connect({ token, companyId: 'empresa-b' });
    expect(reply).toMatch(/^40\/communication,/);
    const sockets = [...(io.of('communication').sockets.values())] as any[];
    expect(sockets.length).toBe(1);
    expect(sockets[0].data.user.companyId).toBe('empresa-a');
    expect(sockets[0].rooms.has('empresa-a')).toBe(true);
    expect(sockets[0].rooms.has('empresa-b')).toBe(false);
  });
});

describe('SEG-14 gateway so existe com FEATURE_COMMUNICATION ligada', () => {
  const providersWith = async (flag: string | undefined) => {
    vi.resetModules();
    if (flag === undefined) delete process.env.FEATURE_COMMUNICATION; else process.env.FEATURE_COMMUNICATION = flag;
    const mod = await import('../../apps/api/src/modules/communication/communication.module');
    const gw = await import('../../apps/api/src/modules/communication/realtime/communication.gateway');
    return (Reflect.getMetadata('providers', mod.CommunicationModule) as any[]).includes(gw.CommunicationGateway);
  };
  it('desligada (padrao) ou "false": gateway nao e registrado', async () => {
    expect(await providersWith(undefined)).toBe(false);
    expect(await providersWith('false')).toBe(false);
  });
  it('ligada: gateway registrado', async () => {
    expect(await providersWith('true')).toBe(true);
    delete process.env.FEATURE_COMMUNICATION;
  });
});
