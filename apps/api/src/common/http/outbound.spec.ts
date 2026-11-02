import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OutboundTimeoutError, outboundFetch } from './outbound';

let server: http.Server;
let base: string;
const sockets = new Set<import('node:net').Socket>();

beforeAll(async () => {
  // Servidor que aceita a conexao e nunca responde.
  server = http.createServer((req, res) => {
    if (req.url === '/ok') { res.end('{"ok":true}'); return; }
  });
  server.on('connection', (s) => { sockets.add(s); s.on('close', () => sockets.delete(s)); });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => { sockets.forEach((s) => s.destroy()); await new Promise((r) => server.close(r)); });

describe('outboundFetch', () => {
  it('rejeita com OutboundTimeoutError perto do limite quando o servidor nunca responde', async () => {
    const t0 = Date.now();
    await expect(outboundFetch(`${base}/hang`, {}, { timeoutMs: 300 })).rejects.toBeInstanceOf(OutboundTimeoutError);
    const dt = Date.now() - t0;
    expect(dt).toBeGreaterThanOrEqual(250);
    expect(dt).toBeLessThan(1500);
  });
  it('responde normalmente dentro do limite', async () => {
    const res = await outboundFetch(`${base}/ok`, {}, { timeoutMs: 2000 });
    expect(await res.json()).toEqual({ ok: true });
  });
  it('respeita o signal do chamador', async () => {
    const c = new AbortController();
    setTimeout(() => c.abort(), 100);
    const t0 = Date.now();
    await expect(outboundFetch(`${base}/hang`, { signal: c.signal }, { timeoutMs: 5000 })).rejects.not.toBeInstanceOf(OutboundTimeoutError);
    expect(Date.now() - t0).toBeLessThan(1500);
  });
});
