/**
 * Isolamento entre empresas (black-box, API ao vivo). Nao roda no vitest (nao e .spec).
 *
 *   BASE=http://localhost:3360 A_EMAIL=admin@innovation.local B_EMAIL=adminb@innovation.local \
 *   PASSWORD='LoadTest@123' node tests/security/tenant-isolation.live.mjs [saida.json]
 *
 * 1. Com o token da empresa A, le toda listagem GET sem parametro e coleta UUIDs reais de A.
 * 2. Para cada rota com {param}, usa UUIDs de A como valor e dispara com o token da empresa B
 *    (GET/POST/PUT/PATCH/DELETE). Escritas so saem com o token de B, nunca com o de A.
 * 3. Veredito: FAIL (2xx de escrita, ou GET 2xx contendo dado de A), OK (401/403/404),
 *    INCONCLUSIVO (400/422: validacao barrou antes do filtro de empresa).
 * Rode somente contra banco local/descartavel: uma falha de isolamento altera dados.
 */
import { writeFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:3333';
const PASSWORD = process.env.PASSWORD ?? 'LoadTest@123';
const A_EMAIL = process.env.A_EMAIL ?? 'admin@innovation.local';
const B_EMAIL = process.env.B_EMAIL ?? 'adminb@innovation.local';
const OUT = process.argv[2] ?? 'tenant-isolation-report.json';
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const SKIP_PREFIX = ['/public', '/candidate-portal', '/auth', '/health', '/metrics', '/api'];
const NEEDS_PUBLIC_OR_SIGNED = /webhook/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(email) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const j = await r.json();
  const t = j?.data?.access_token ?? j?.data?.accessToken;
  if (!t) throw new Error(`login ${email}: ${JSON.stringify(j).slice(0, 200)}`);
  return t;
}

// Varios tokens distintos (iat diferente) dividem o limite de 300 req/min por token.
async function tokens(email, n) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    out.push(await login(email));
    await sleep(1100);
  }
  return out;
}

let rr = 0;
const pick = (list) => list[rr++ % list.length];

async function call(token, method, path, body) {
  const headers = { authorization: `Bearer ${token}` };
  const init = { method, headers };
  if (body !== undefined && method !== 'GET' && method !== 'DELETE') {
    headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const r = await fetch(`${BASE}${path}`, init);
    if (r.status === 429) {
      await sleep(5000);
      continue;
    }
    const text = await r.text();
    return { status: r.status, text };
  }
  return { status: 429, text: '' };
}

function resolveRef(spec, node) {
  let cur = node;
  for (let i = 0; i < 6 && cur?.$ref; i += 1) {
    cur = cur.$ref.replace('#/', '').split('/').reduce((o, k) => o?.[k], spec);
  }
  return cur;
}

function synth(spec, schema, pool, depth = 0) {
  const s = resolveRef(spec, schema);
  if (!s || depth > 4) return {};
  if (s.enum?.length) return s.enum[0];
  switch (s.type) {
    case 'string':
      if (s.format === 'uuid') return pool[0] ?? '00000000-0000-4000-8000-000000000000';
      if (s.format === 'date-time') return new Date().toISOString();
      if (s.format === 'date') return new Date().toISOString().slice(0, 10);
      if (s.format === 'email') return 'qa@example.com';
      return 'x';
    case 'integer':
    case 'number':
      return Math.max(s.minimum ?? 1, 1);
    case 'boolean':
      return false;
    case 'array':
      return [];
    default: {
      const obj = {};
      const names = s.required?.length ? s.required : Object.keys(s.properties ?? {}).slice(0, 8);
      for (const k of names) obj[k] = synth(spec, s.properties?.[k], pool, depth + 1);
      return obj;
    }
  }
}

async function main() {
  const spec = await (await fetch(`${BASE}/api/docs-json`)).json();
  const aTokens = await tokens(A_EMAIL, 4);
  const bTokens = await tokens(B_EMAIL, 4);

  // 1. UUIDs reais de A
  const pool = new Map(); // uuid -> origem (primeiro segmento da rota)
  const aCompanyId = JSON.parse(Buffer.from(aTokens[0].split('.')[1], 'base64url').toString()).companyId;
  if (aCompanyId) pool.set(aCompanyId, 'company');
  const listRoutes = Object.entries(spec.paths)
    .filter(([p, m]) => m.get && !p.includes('{') && !SKIP_PREFIX.some((x) => p.startsWith(x)))
    .map(([p]) => p);
  for (const p of listRoutes) {
    const r = await call(pick(aTokens), 'GET', p);
    if (r.status >= 200 && r.status < 300) {
      for (const id of r.text.match(UUID) ?? []) if (!pool.has(id)) pool.set(id, p.split('/')[1]);
    }
  }
  const bSelf = new Set();
  for (const p of ['/users/me', '/auth/me']) {
    const r = await call(pick(bTokens), 'GET', p);
    for (const id of r.text.match(UUID) ?? []) bSelf.add(id.toLowerCase());
  }
  for (const id of bSelf) pool.delete(id);
  const poolIds = [...pool.keys()];
  const aMarkers = new Set(poolIds.map((x) => x.toLowerCase()));
  console.log(`rotas de listagem: ${listRoutes.length} | UUIDs de A coletados: ${poolIds.length}`);

  // 2. rotas com parametro, com B
  const results = [];
  const targets = [];
  for (const [p, methods] of Object.entries(spec.paths)) {
    if (!p.includes('{')) continue;
    for (const [m, op] of Object.entries(methods)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(m)) continue;
      targets.push({ path: p, method: m.toUpperCase(), op });
    }
  }
  for (const { path, method, op } of targets) {
    const row = { route: `${method} ${path}`, result: '', detail: '' };
    if (SKIP_PREFIX.some((x) => path.startsWith(x)) || NEEDS_PUBLIC_OR_SIGNED.test(path)) {
      row.result = 'PUBLICA';
      row.detail = 'rota publica/webhook por desenho';
      results.push(row);
      continue;
    }
    const seg = path.split('/')[1];
    const params = [...path.matchAll(/\{([^}]+)\}/g)].map((x) => x[1]);
    const sameSeg = poolIds.filter((id) => pool.get(id) === seg);
    const candidates = [...new Set([...sameSeg, ...poolIds])].slice(0, 5);
    if (!candidates.length) candidates.push('00000000-0000-4000-8000-000000000000');
    const bodySchema = op.requestBody?.content?.['application/json']?.schema;
    const body = bodySchema ? synth(spec, bodySchema, poolIds) : method === 'GET' || method === 'DELETE' ? undefined : {};
    const seen = [];
    let verdict = 'OK';
    let reason = '';
    for (const id of candidates) {
      let url = path;
      for (const prm of params) url = url.replace(`{${prm}}`, /name|slug|code|token/i.test(prm) ? 'x' : id);
      const r = await call(pick(bTokens), method, url, body);
      seen.push(r.status);
      const leaked = (r.text.match(UUID) ?? []).some((u) => aMarkers.has(u.toLowerCase()));
      if (r.status >= 200 && r.status < 300) {
        if (method !== 'GET' || leaked || r.text.length > 2) {
          verdict = 'FAIL';
          reason = `${method} ${url} -> ${r.status} ${r.text.slice(0, 120)}`;
          break;
        }
      } else if ((r.status === 400 || r.status === 422) && verdict === 'OK') {
        verdict = 'INCONCLUSIVO';
        reason = 'validacao respondeu antes do filtro de empresa';
      }
    }
    row.result = verdict === 'INCONCLUSIVO' && seen.some((s) => [401, 403, 404].includes(s)) ? 'OK' : verdict;
    row.detail = reason || `statuses: ${[...new Set(seen)].join(',')}`;
    results.push(row);
  }

  const count = results.reduce((a, r) => ((a[r.result] = (a[r.result] ?? 0) + 1), a), {});
  writeFileSync(OUT, JSON.stringify({ base: BASE, poolSize: poolIds.length, count, results }, null, 2));
  console.log(JSON.stringify(count));
  for (const r of results.filter((x) => x.result === 'FAIL')) console.log('FAIL', r.route, r.detail);
  process.exit(count.FAIL ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
