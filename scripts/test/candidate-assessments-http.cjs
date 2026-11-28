// Real HTTP/Nest/Fastify stack with an isolated in-memory persistence double.
// Measures local request isolation, NOT PostgreSQL/VPS capacity.
require('reflect-metadata');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Module, Controller, Post, UseGuards, ValidationPipe } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const apiRequire = require('node:module').createRequire(path.resolve(__dirname, '../../apps/api/package.json'));
const { FastifyAdapter } = apiRequire('@nestjs/platform-fastify');
const { CandidateAssessmentsController } = require('../../apps/api/dist/modules/jobs/candidate-assessments.controller');
const { CandidateAssessmentsService } = require('../../apps/api/dist/modules/jobs/candidate-assessments.service');
const { CandidateAuthGuard } = require('../../apps/api/dist/modules/jobs/candidate-account.guard');
const { CandidateApplicationGuard } = require('../../apps/api/dist/modules/jobs/candidate-application.guard');
const { CandidateAccountService } = require('../../apps/api/dist/modules/jobs/candidate-account.service');
const { PrismaService } = require('../../apps/api/dist/database/prisma.service');
const records = new Map();
const matches = (row, where) => Object.entries(where).every(([key, value]) => row[key] === value);
const delegate = {
  async findUnique({ where }) { return where.accountId_kind ? records.get(`${where.accountId_kind.accountId}:${where.accountId_kind.kind}`) ?? null : [...records.values()].find(row => row.id === where.id) ?? null; },
  async findUniqueOrThrow(args) { const row = await this.findUnique(args); assert.ok(row); return row; },
  async create({ data }) { const key = `${data.accountId}:${data.kind}`; if (records.has(key)) throw { code: 'P2002' }; const row = { id: String(records.size + 1), revision: 0, status: 'IN_PROGRESS', essay: '', score: null, completedAt: null, shareConsent: false, ...data }; records.set(key, row); return row; },
  async updateMany({ where, data }) { const row = [...records.values()].find(value => matches(value, where)); if (!row) return { count: 0 }; Object.assign(row, { ...data, revision: row.revision + data.revision.increment }); return { count: 1 }; },
  async findMany({ where }) { return [...records.values()].filter(row => matches(row, where)); },
};
class TestModule {}
class ApplicationProbe { apply() { return { received: true }; } }
Controller('test-application')(ApplicationProbe);
Post()(ApplicationProbe.prototype, 'apply', Object.getOwnPropertyDescriptor(ApplicationProbe.prototype, 'apply'));
UseGuards(CandidateAuthGuard, CandidateApplicationGuard)(ApplicationProbe);
Module({ controllers: [CandidateAssessmentsController, ApplicationProbe], providers: [CandidateAssessmentsService, CandidateAuthGuard, CandidateApplicationGuard, { provide: PrismaService, useValue: { candidatePortalAssessment: delegate } }, { provide: CandidateAccountService, useValue: { async findAccountBySession(token) { return /^test-account-\d+$/.test(token) ? { id: token, verifiedAt: new Date() } : null; } } }] })(TestModule);

(async () => {
  const app = await NestFactory.create(TestModule, new FastifyAdapter({ bodyLimit: 32768 }), { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const durations = []; let requests = 0;
  async function request(token, suffix = '', method = 'GET', body) {
    const start = performance.now();
    const result = await fetch(`${base}${suffix === '/test-application' ? suffix : `/candidate-portal/assessments${suffix}`}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const payload = await result.json(); durations.push(performance.now() - start); requests++;
    return { status: result.status, body: payload, headers: result.headers };
  }
  try {
    assert.equal((await request(null)).status, 401);
    assert.equal((await request('invalid')).status, 401);
    const began = performance.now();
    await Promise.all(Array.from({ length: 50 }, async (_, i) => {
      const token = `test-account-${i}`;
      const start = await request(token, '/MATH/start', 'POST'); assert.equal(start.status, 201);
      assert.equal(start.headers.get('cache-control'), 'private, no-store');
      assert.ok(!JSON.stringify(start.body).includes('correct'));
      const q = start.body.questions[0];
      const data = { revision: 0, answers: { [q.id]: i % 5 }, essay: '', complete: false, shareConsent: false };
      assert.equal((await request(token, '/MATH', 'PUT', data)).status, 200);
      const resumed = await request(token, '/MATH/start', 'POST');
      assert.deepEqual(resumed.body.answers, data.answers);
      assert.equal((await request(token, '/MATH', 'PUT', data)).status, 409);
      assert.equal((await request(token, '/MATH', 'PUT', { ...data, accountId: 'another-account' })).status, 400);
    }));
    const foreign = await request('test-account-999', '/MATH', 'PUT', { revision: 0, answers: {}, essay: '', complete: false, shareConsent: false }); assert.equal(foreign.status, 404);
    assert.equal(records.size, 50);
    assert.equal((await request(null, '/test-application', 'POST')).status, 401);
    assert.equal((await request('test-account-0', '/test-application', 'POST')).status, 403);
    for (const kind of ['MATH', 'PORTUGUESE', 'ESSAY']) {
      const row = (await request('test-account-0', `/${kind}/start`, 'POST')).body;
      const result = await request('test-account-0', `/${kind}`, 'PUT', { revision: row.revision, answers: Object.fromEntries(row.questions.map(q => [q.id, 0])), essay: kind === 'ESSAY' ? 'palavra '.repeat(150) : '', complete: true, shareConsent: false });
      assert.equal(result.status, 200);
      assert.equal((await request('test-account-0', '/test-application', 'POST')).status, kind === 'ESSAY' ? 201 : 403);
    }
    durations.sort((a, b) => a - b);
    const report = { checkedAt: new Date().toISOString(), scope: 'Local HTTP stack; mocked persistence, no production load, no global rate limiter', concurrentAccounts: 50, requests, elapsedMs: Math.round(performance.now() - began), p50Ms: Math.round(durations[Math.floor(durations.length * .5)]), p95Ms: Math.round(durations[Math.floor(durations.length * .95)]), applicationGate: '401 without session; 403 until all three required assessments complete; then 201', assertions: 'passed' };
    const directory = path.resolve(__dirname, '../../storage/qa/portal-candidato'); fs.mkdirSync(directory, { recursive: true }); fs.writeFileSync(path.join(directory, 'http-concurrency.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
