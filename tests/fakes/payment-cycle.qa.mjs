// QA do ciclo de pagamento contra API (3371) + Asaas falso (3380). Uso:
//   node tests/fakes/payment-cycle.qa.mjs [--cleanup-only] [--old-api=http://localhost:3333]
// Requer: fake rodando (tests/fakes/asaas-fake.mjs), 2a instancia da API com ASAAS_API_URL=http://localhost:3380 e
// ASAAS_WEBHOOK_TOKEN=qa_asaas_webhook_token_0123456789abcdef0123456789, banco local com o seed (LoadTest@123).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const require = createRequire('/home/user/innovation/apps/api/package.json');
for (const line of readFileSync('/home/user/innovation/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const API = process.env.API ?? 'http://localhost:3371';
const FAKE = process.env.FAKE ?? 'http://localhost:3380';
const OLD_API = (process.argv.find((a) => a.startsWith('--old-api=')) ?? '').split('=')[1];
const WEBHOOK_TOKEN = 'qa_asaas_webhook_token_0123456789abcdef0123456789';
const PASSWORD = 'LoadTest@123';
const START = new Date();
const day = 86_400_000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * day).toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];

async function http(base, method, path, { token, body, headers } = {}) {
  const res = await fetch(base + path, { method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json, data: json?.data ?? json };
}
const api = (m, p, o) => http(API, m, p, o);
const fake = (m, p, b) => http(FAKE, m, p, { body: b }).then((r) => r.body);
const fakeState = () => fake('GET', '/__control/state');
const remoteFor = async (invoiceId) => (await fakeState()).payments.filter((p) => p.externalReference === `inv:${invoiceId}`);
const nfCount = async (paymentId) => (await fakeState()).invoices.filter((i) => i.payment === paymentId).length;
const inv = (id) => prisma.platformInvoice.findUnique({ where: { id } });
const company = (id) => prisma.company.findUnique({ where: { id } });
async function waitFor(fn, ms = 15000) { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn(); if (v) return v; await sleep(300); } return null; }
function check(id, name, ok, detail = '') { results.push({ id, name, ok: Boolean(ok), detail: String(detail) }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${id} ${name}${detail ? '  -> ' + detail : ''}`); }

const slugs = ['qa-pay-alpha', 'qa-pay-bravo', 'qa-pay-charlie', 'qa-pay-delta', 'qa-pay-echo'];
async function cleanup() {
  const companies = await prisma.company.findMany({ where: { slug: { in: slugs } }, select: { id: true } });
  const ids = companies.map((c) => c.id);
  const invoices = await prisma.platformInvoice.findMany({ where: { companyId: { in: ids } }, select: { id: true } });
  const invIds = invoices.map((i) => i.id);
  const coupons = await prisma.promotionCoupon.findMany({ where: { code: { startsWith: 'QAPAY' } }, select: { id: true } });
  const steps = [
    () => prisma.paymentRefund.deleteMany({ where: { invoiceId: { in: invIds } } }),
    () => prisma.invoiceAdjustment.deleteMany({ where: { companyId: { in: ids } } }),
    () => prisma.paymentAttempt.deleteMany({ where: { invoiceId: { in: invIds } } }),
    () => prisma.auditLog.deleteMany({ where: { companyId: { in: ids } } }),
    () => prisma.financeNotificationLog.deleteMany({ where: { companyId: { in: ids } } }),
    () => prisma.platformInvoice.deleteMany({ where: { companyId: { in: ids } } }),
    () => prisma.couponRedemption.deleteMany({ where: { couponId: { in: coupons.map((c) => c.id) } } }),
    () => prisma.promotionCoupon.deleteMany({ where: { code: { startsWith: 'QAPAY' } } }),
    () => prisma.companySubscription.deleteMany({ where: { companyId: { in: ids } } }),
    () => prisma.user.deleteMany({ where: { companyId: { in: ids } } }),
    () => prisma.company.deleteMany({ where: { id: { in: ids } } }),
    () => prisma.platformPlan.deleteMany({ where: { code: { startsWith: 'QAPAY' } } }),
    () => prisma.asaasWebhookEvent.deleteMany({ where: { createdAt: { gte: START } } }),
  ];
  for (const step of steps) { try { await step(); } catch (e) { console.log('cleanup:', String(e).slice(-400)); } }
}

async function login(email) {
  const r = await http(API, 'POST', '/auth/login', { body: { email, password: PASSWORD } });
  return r.data?.access_token;
}
async function createInvoice(token, companyId, { amount, billingType = 'PIX', dueDate = iso(5), key = randomUUID(), description = 'QA cobranca' }) {
  return api('POST', '/finance/platform/invoices', { token, headers: { 'idempotency-key': key }, body: { companyId, description, amount, dueDate, billingType, sendToAsaas: true } });
}
async function event(paymentId, name, extra = {}) { return fake('POST', '/__control/event', { paymentId, event: name, ...extra }); }
async function paid(id) { return waitFor(async () => (await inv(id))?.status === 'PAID'); }

async function main() {
  if (process.argv.includes('--cleanup-only')) { await cleanup(); return; }
  await cleanup();
  await fake('POST', '/__control/reset');
  const hash = (await prisma.user.findUnique({ where: { email: 'admin@innovation.local' } })).passwordHash;
  const mkCompany = async (slug, doc) => prisma.company.create({ data: { name: `QA-PAY ${slug}`, slug, document: doc, status: 'ACTIVE', billingStatus: 'ACTIVE', isActive: true } });
  const A = await mkCompany('qa-pay-alpha', '98765432000101');
  await prisma.user.create({ data: { companyId: A.id, name: 'QA Admin', email: 'qa-pay-admin@innovation.local', passwordHash: hash, role: 'ADMIN', isActive: true } });
  const plan = (code, base) => prisma.platformPlan.create({ data: { code, name: code, price: base, baseMonthlyPrice: base, userMonthlyPrice: 10, includedUnits: 0, commitmentMonths: 1, cycle: 'MONTHLY', maxUsers: 50, maxEmployees: 50, activeModules: [], isActive: true } });
  const P1 = await plan('QAPAY-P1', 100);
  const P2 = await plan('QAPAY-P2', 200);
  const fakeSub = await fake('POST', '/subscriptions', { value: 120, cycle: 'MONTHLY' });
  const sub = (companyId, extra = {}) => prisma.companySubscription.create({ data: { companyId, planId: P1.id, status: 'ACTIVE', seatQuantity: 2, currentPeriodStart: new Date(Date.now() - 15 * day), currentPeriodEnd: new Date(Date.now() + 15 * day), nextDueDate: new Date(Date.now() + 15 * day), ...extra } });
  await sub(A.id, { asaasSubscriptionId: fakeSub.id });
  await prisma.company.update({ where: { id: A.id }, data: { asaasSubscriptionId: fakeSub.id, platformPlanId: P1.id } });

  let dev = await login('dev@innovation.local');
  const adminA = await login('qa-pay-admin@innovation.local');
  check('S0', 'login DEV e ADMIN da empresa de teste', dev && adminA);

  // ---- S1 PIX ----
  await prisma.company.update({ where: { id: A.id }, data: { billingStatus: 'PAST_DUE', status: 'SUSPENDED', isActive: false } });
  let r = await createInvoice(dev, A.id, { amount: 150, billingType: 'PIX', description: 'QA PIX' });
  const pix = r.data;
  let remote = await remoteFor(pix.id);
  check('S1a', 'PIX: fatura criada no Asaas (1 cobranca, vinculada, LINK_READY)', r.status === 201 && remote.length === 1 && pix.asaasPaymentId === remote[0]?.id && pix.paymentProcessingStatus === 'LINK_READY', `status=${r.status} remotas=${remote.length}`);
  const pixEvt = await event(remote[0].id, 'PAYMENT_RECEIVED');
  check('S1b', 'PIX: PAYMENT_RECEIVED -> fatura PAID e empresa liberada', await paid(pix.id) && (await company(A.id)).isActive === true && (await company(A.id)).billingStatus === 'ACTIVE' && (await company(A.id)).status === 'ACTIVE');
  await sleep(1500);
  check('S1c', 'PIX: nota fiscal agendada exatamente 1 vez', (await nfCount(remote[0].id)) === 1, `nfs=${await nfCount(remote[0].id)}`);

  // ---- S2 BOLETO (CONFIRMED + RECEIVED) ----
  r = await createInvoice(dev, A.id, { amount: 200, billingType: 'BOLETO', description: 'QA Boleto' });
  const bol = r.data; const bolRemote = (await remoteFor(bol.id))[0];
  const bolEvt1 = await event(bolRemote.id, 'PAYMENT_CONFIRMED');
  await paid(bol.id); const paidAt1 = (await inv(bol.id))?.paidAt?.toISOString();
  const bolEvt2 = await event(bolRemote.id, 'PAYMENT_RECEIVED');
  await sleep(1500);
  const bolAfter = await inv(bol.id);
  check('S2', 'BOLETO: CONFIRMED depois RECEIVED -> PAID uma vez, paidAt inalterado, 1 nota', bolAfter.status === 'PAID' && bolAfter.paidAt.toISOString() === paidAt1 && (await nfCount(bolRemote.id)) === 1, `nfs=${await nfCount(bolRemote.id)}`);

  // ---- S3 CARTAO (aprovado e recusado) ----
  r = await createInvoice(dev, A.id, { amount: 90, billingType: 'CREDIT_CARD', description: 'QA Cartao ok' });
  const cc = r.data; const ccRemote = (await remoteFor(cc.id))[0];
  await event(ccRemote.id, 'PAYMENT_CONFIRMED');
  check('S3a', 'CARTAO aprovado: CONFIRMED -> PAID', await paid(cc.id));
  r = await createInvoice(dev, A.id, { amount: 91, billingType: 'CREDIT_CARD', description: 'QA Cartao recusado' });
  const ccBad = r.data; const ccBadRemote = (await remoteFor(ccBad.id))[0];
  const refused = await event(ccBadRemote.id, 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED', { applyState: false });
  await sleep(1500);
  const badInv = await inv(ccBad.id); const ev = await prisma.asaasWebhookEvent.findUnique({ where: { asaasEventId: refused.payload.id } });
  check('S3b', 'CARTAO recusado: evento IGNORED, fatura segue OPEN, empresa intacta, sem 5xx', refused.webhook.status === 200 && badInv.status === 'OPEN' && ev?.status === 'IGNORED' && (await company(A.id)).billingStatus === 'ACTIVE', `webhook=${refused.webhook.status} evento=${ev?.status} fatura=${badInv.status}`);

  // ---- S4 vencida -> guard 402 -> pagamento libera (mesmo token) ----
  r = await createInvoice(dev, A.id, { amount: 300, billingType: 'PIX', dueDate: iso(-20), description: 'QA vencida' });
  const od = r.data; const odRemote = (await remoteFor(od.id))[0];
  await event(odRemote.id, 'PAYMENT_OVERDUE');
  await waitFor(async () => (await inv(od.id))?.status === 'OVERDUE');
  const blocked = await api('GET', '/employees', { token: adminA });
  check('S4a', 'vencida ha 20 dias: OVERDUE, empresa PAST_DUE e guard responde 402', (await inv(od.id)).status === 'OVERDUE' && (await company(A.id)).billingStatus === 'PAST_DUE' && blocked.status === 402, `guard=${blocked.status}`);
  await event(odRemote.id, 'PAYMENT_RECEIVED');
  await paid(od.id);
  const freed = await api('GET', '/employees', { token: adminA });
  check('S4b', 'pagamento libera o acesso e o MESMO token continua valido (sem 401)', freed.status === 200 && (await company(A.id)).billingStatus === 'ACTIVE', `acesso=${freed.status}`);

  // ---- S5 duplicado e autenticacao do webhook ----
  const dupe = await fake('POST', '/__control/replay', { payload: bolEvt2.payload });
  await sleep(800);
  const evCount = await prisma.asaasWebhookEvent.count({ where: { asaasEventId: bolEvt2.payload.id } });
  const noTok = await fake('POST', '/__control/replay', { payload: bolEvt2.payload, token: '' });
  const badTok = await fake('POST', '/__control/replay', { payload: bolEvt2.payload, token: 'errado' });
  check('S5a', 'webhook duplicado: 200 "duplicate", 1 evento gravado, 1 nota', dupe.webhook.status === 200 && JSON.parse(dupe.webhook.body).data.duplicate === true && evCount === 1 && (await nfCount(bolRemote.id)) === 1, dupe.webhook.body);
  check('S5b', 'webhook sem token / token errado -> 403', noTok.webhook.status === 403 && badTok.webhook.status === 403, `${noTok.webhook.status}/${badTok.webhook.status}`);

  // ---- S6 fora de ordem e chargeback ----
  await event(remote[0].id, 'PAYMENT_OVERDUE', { applyState: false });
  await event(remote[0].id, 'PAYMENT_CREATED', { applyState: false });
  await sleep(1200);
  check('S6a', 'fatura paga ignora OVERDUE/CREATED atrasados (fora de ordem)', (await inv(pix.id)).status === 'PAID');
  await event(bolRemote.id, 'PAYMENT_CHARGEBACK_REQUESTED');
  await waitFor(async () => (await inv(bol.id))?.status === 'CANCELED');
  const sus = await company(A.id);
  await event(bolRemote.id, 'PAYMENT_RECEIVED', { applyState: false });
  await sleep(1500);
  check('S6b', 'chargeback cancela e suspende; RECEIVED atrasado NAO reabre a fatura', (await inv(bol.id)).status === 'CANCELED' && sus.status === 'SUSPENDED' && (await company(A.id)).status === 'SUSPENDED', `empresa=${(await company(A.id)).status}`);
  await prisma.company.update({ where: { id: A.id }, data: { status: 'ACTIVE', billingStatus: 'ACTIVE', isActive: true, suspensionReason: null } });

  // ---- S7 timeout do gateway ----
  const k1 = randomUUID(); const before7 = (await fakeState()).paymentCreates;
  await fake('POST', '/__control/config', { createDelayMs: 14000 });
  r = await createInvoice(dev, A.id, { amount: 77, billingType: 'PIX', key: k1, description: 'QA timeout' });
  await fake('POST', '/__control/config', { createDelayMs: 0 });
  const t = r.data;
  const retry = await createInvoice(dev, A.id, { amount: 77, billingType: 'PIX', key: k1, description: 'QA timeout' });
  const created7 = (await fakeState()).paymentCreates - before7;
  check('S7a', 'timeout: fatura fica UNKNOWN, retry com a mesma chave devolve a MESMA fatura (200) e nao cria 2a cobranca', t.paymentProcessingStatus === 'UNKNOWN' && retry.status === 200 && retry.data.id === t.id && created7 === 1, `retry=${retry.status} criadas=${created7}`);
  const rep7 = await api('POST', '/finance/reconciliation/run', { token: dev });
  const linked = await inv(t.id);
  check('S7b', 'conciliacao liga a cobranca orfa (resposta perdida) sem duplicar', rep7.data?.linked >= 1 && linked.paymentProcessingStatus === 'LINK_READY' && (await remoteFor(t.id)).length === 1 && linked.asaasPaymentId === (await remoteFor(t.id))[0].id, JSON.stringify(rep7.data));

  // ---- S8 erro 500 sem criar nada ----
  const k2 = randomUUID();
  await fake('POST', '/__control/config', { createFail: '500', createFailTimes: 1, createFailCreatesRemote: false });
  r = await createInvoice(dev, A.id, { amount: 55, billingType: 'PIX', key: k2, description: 'QA gateway 500' });
  const g = r.data;
  const early = await api('POST', '/finance/reconciliation/run', { token: dev });
  await prisma.platformInvoice.update({ where: { id: g.id }, data: { createdAt: new Date(Date.now() - 20 * 60_000) } });
  const late = await api('POST', '/finance/reconciliation/run', { token: dev });
  const listed = await api('GET', '/finance/reconciliation/divergences', { token: dev });
  check('S8a', 'gateway 500: UNKNOWN, sem cobranca remota; <15 min nao alarma, >15 min abre ajuste SEM_COBRANCA_REMOTA', g.paymentProcessingStatus === 'UNKNOWN' && (await remoteFor(g.id)).length === 0 && (listed.data ?? []).some((d) => d.entityId === g.id && d.metadata?.reason === 'SEM_COBRANCA_REMOTA'), `cedo.div=${early.data?.diverged} tarde.div=${late.data?.diverged}`);
  await api('DELETE', `/finance/platform/invoices/${g.id}`, { token: dev });
  const afterDel = await api('POST', '/finance/reconciliation/run', { token: dev });
  check('S8b', 'cancelar a fatura orfa baixa o ajuste (divergencias abertas = 0)', afterDel.data?.openDivergences === 0, JSON.stringify(afterDel.data));

  // ---- S9 recusa definitiva ----
  const before9 = (await fakeState()).payments.length;
  const k3 = randomUUID();
  r = await createInvoice(dev, A.id, { amount: 3, billingType: 'PIX', key: k3, description: 'QA valor minimo' });
  const rejected = await prisma.platformInvoice.findFirst({ where: { companyId: A.id, description: 'QA valor minimo' } });
  const ok9 = await createInvoice(dev, A.id, { amount: 12, billingType: 'PIX', description: 'QA valor ok' });
  check('S9', 'Asaas recusa valor < R$ 5: 400 com motivo, fatura cancelada, nada criado la, chave liberada e nova cobranca OK', r.status === 400 && /recusou/i.test(JSON.stringify(r.body)) && rejected?.status === 'CANCELED' && rejected?.chargeRequestKey === null && ok9.status === 201 && (await fakeState()).payments.length === before9 + 1, `status=${r.status}`);

  // ---- S10 concorrencia (10 cliques) ----
  const k4 = randomUUID();
  const burst = await Promise.all(Array.from({ length: 10 }, () => createInvoice(dev, A.id, { amount: 66, billingType: 'PIX', key: k4, description: 'QA duplo clique' })));
  const ids = new Set(burst.map((b) => b.data?.id)); const st = burst.map((b) => b.status);
  check('S10', '10 cobrancas simultaneas com a mesma chave -> 1 fatura, 1 cobranca remota', ids.size === 1 && (await remoteFor([...ids][0])).length === 1 && st.filter((s) => s === 201).length === 1, `201=${st.filter((s) => s === 201).length} 200=${st.filter((s) => s === 200).length} outras=${st.filter((s) => ![200, 201].includes(s)).join(',')}`);

  // ---- S11 webhook perdido -> conciliacao cura ----
  r = await createInvoice(dev, A.id, { amount: 130, billingType: 'PIX', description: 'QA webhook perdido' });
  const lost = r.data; const lostRemote = (await remoteFor(lost.id))[0];
  await fake('POST', '/__control/set-status', { paymentId: lostRemote.id, status: 'RECEIVED' });
  await prisma.company.update({ where: { id: A.id }, data: { billingStatus: 'PAST_DUE', status: 'SUSPENDED', isActive: false } });
  const heal = await api('POST', '/finance/reconciliation/run', { token: dev });
  await sleep(1200);
  const heal2 = await api('POST', '/finance/reconciliation/run', { token: dev });
  const evs = await prisma.asaasWebhookEvent.count({ where: { asaasEventId: { startsWith: `reconcile:${lostRemote.id}` } } });
  check('S11', 'webhook perdido: conciliacao marca PAID, libera empresa, 1 nota; 2a execucao nao repete (idempotente)', (await inv(lost.id)).status === 'PAID' && (await company(A.id)).isActive === true && (await nfCount(lostRemote.id)) === 1 && evs === 1 && heal.data.healed >= 1, `healed1=${heal.data.healed} healed2=${heal2.data.healed} eventos=${evs}`);
  await prisma.company.update({ where: { id: A.id }, data: { status: 'ACTIVE', billingStatus: 'ACTIVE', isActive: true } });

  // ---- S12/S13 divergencias que exigem humano ----
  r = await createInvoice(dev, A.id, { amount: 60, billingType: 'PIX', description: 'QA local pago' });
  const lp = r.data; const lpRemote = (await remoteFor(lp.id))[0];
  await prisma.platformInvoice.update({ where: { id: lp.id }, data: { status: 'PAID', paidAt: new Date() } });
  const d12 = await api('POST', '/finance/reconciliation/run', { token: dev });
  const stillPaid = (await inv(lp.id)).status === 'PAID';
  const open12 = (await api('GET', '/finance/reconciliation/divergences', { token: dev })).data.some((d) => d.entityId === lp.id && d.metadata.reason === 'LOCAL_PAGO_REMOTO_NAO_PAGO');
  await fake('POST', '/__control/set-status', { paymentId: lpRemote.id, status: 'RECEIVED' });
  const f12 = await api('POST', '/finance/reconciliation/run', { token: dev });
  const closed12 = !(await api('GET', '/finance/reconciliation/divergences', { token: dev })).data.some((d) => d.entityId === lp.id);
  check('S12', 'local PAGO x remoto aberto: abre ajuste SEM desfazer o pagamento; quando o remoto confirma, baixa sozinho', d12.data.diverged >= 1 && stillPaid && open12 && closed12, `resolvidas=${f12.data.resolved}`);

  r = await createInvoice(dev, A.id, { amount: 80, billingType: 'PIX', description: 'QA valor divergente' });
  const vd = r.data; const vdRemote = (await remoteFor(vd.id))[0];
  await fake('POST', '/__control/set-status', { paymentId: vdRemote.id, status: 'PENDING', value: 85 });
  await api('POST', '/finance/reconciliation/run', { token: dev });
  const open13 = (await api('GET', '/finance/reconciliation/divergences', { token: dev })).data.some((d) => d.entityId === vd.id && d.metadata.reason === 'VALOR_DIVERGENTE');
  await fake('POST', '/__control/set-status', { paymentId: vdRemote.id, status: 'PENDING', value: 80 });
  await api('POST', '/finance/reconciliation/run', { token: dev });
  const closed13 = !(await api('GET', '/finance/reconciliation/divergences', { token: dev })).data.some((d) => d.entityId === vd.id);
  check('S13', 'valor diferente local x Asaas: abre ajuste e baixa quando volta a bater', open13 && closed13);

  // ---- S14 estornos nunca > pago ----
  r = await createInvoice(dev, A.id, { amount: 100, billingType: 'PIX', description: 'QA estorno' });
  const rf = r.data; const rfRemote = (await remoteFor(rf.id))[0];
  const unpaid = await api('POST', `/faturas/plataforma/invoices/${rf.id}/refund-partial`, { token: dev, body: { amount: 10, reason: 'QA estorno em fatura nao paga' } });
  await event(rfRemote.id, 'PAYMENT_RECEIVED'); await paid(rf.id);
  const refund = (amount) => api('POST', `/faturas/plataforma/invoices/${rf.id}/refund-partial`, { token: dev, body: { amount, reason: 'QA estorno parcial', idempotencyKey: randomUUID() } });
  const a1 = await refund(30); const over = await refund(80); const a2 = await refund(70); const extra = await refund(1);
  await api('POST', '/finance/reconciliation/run', { token: dev });
  const finalInv = await inv(rf.id); const remoteRefunds = ((await fake('GET', `/payments/${rfRemote.id}/refunds`)).data ?? []).reduce((s, x) => s + x.value, 0);
  check('S14', 'estorno: fatura nao paga recusada; 30 ok; 80 recusado (excede); 70 ok; +1 recusado; total devolvido == pago', unpaid.status >= 400 && a1.status < 300 && over.status >= 400 && a2.status < 300 && extra.status >= 400 && Number(finalInv.refundedAmount) === 100 && remoteRefunds === 100, `status=[${unpaid.status},${a1.status},${over.status},${a2.status},${extra.status}] local=${finalInv.refundedAmount} remoto=${remoteRefunds}`);

  // ---- S15 cupons ----
  const mkCoupon = (data) => api('POST', '/coupons', { token: dev, body: data });
  const cExp = await mkCoupon({ code: 'QAPAY-EXP', type: 'PERCENT', value: 10, durationCycles: 1, startsAt: new Date(Date.now() - 10 * day).toISOString(), expiresAt: new Date(Date.now() - day).toISOString() });
  const c100 = await mkCoupon({ code: 'QAPAY-100', type: 'PERCENT', value: 100, durationCycles: 1 });
  const cUse = await mkCoupon({ code: 'QAPAY-USE', type: 'PERCENT', value: 10, durationCycles: 1 });
  const applyA = (code) => api('POST', `/faturas/plataforma/companies/${A.id}/coupon`, { token: dev, body: { code, reason: 'QA cupom' } });
  const exp = await applyA('QAPAY-EXP');
  check('S15a', 'cupom expirado -> 400 e nada alterado', exp.status === 400 && /expirou/i.test(JSON.stringify(exp.body)), `status=${exp.status}`);
  const a100 = await applyA('QAPAY-100');
  const c100row = await prisma.promotionCoupon.findUnique({ where: { code: 'QAPAY-100' } });
  check('S15b', 'cupom de 100% (zera a mensalidade) -> 400 e o uso e DEVOLVIDO (contador 0, sem resgate)', a100.status === 400 && /zera/i.test(JSON.stringify(a100.body)) && c100row.redemptionCount === 0 && (await prisma.couponRedemption.count({ where: { couponId: c100row.id } })) === 0, `status=${a100.status} usos=${c100row.redemptionCount}`);
  const use1 = await applyA('QAPAY-USE'); const use2 = await applyA('QAPAY-USE');
  const fakeSubNow = (await fake('GET', `/subscriptions/${fakeSub.id}`)).value;
  check('S15c', 'cupom 10%: aplica (assinatura no Asaas = 108,00); segundo uso na mesma empresa -> 409', use1.status < 300 && use2.status === 409 && Number(fakeSubNow) === 108, `1o=${use1.status} 2o=${use2.status} assinatura=${fakeSubNow}`);

  // pro-rata com cupom: (198-108) * 15/30 = 45,00
  const quote = await api('GET', `/faturas/plataforma/companies/${A.id}/plan/quote?planId=${P2.id}`, { token: dev });
  check('S15d', 'upgrade com cupom: cotacao pro-rata = (198-108) x 15/30 = R$ 45,00', Number(quote.data?.prorationAmount) === 45 && quote.data?.currentTotal === 108 && quote.data?.nextTotal === 198, JSON.stringify(quote.data));
  const upg = await api('POST', `/faturas/plataforma/companies/${A.id}/plan`, { token: dev, body: { planId: P2.id, reason: 'QA upgrade' } });
  const prorated = (await fakeState()).payments.find((p) => /Rateio/.test(p.description ?? ''));
  const subAfter = await prisma.companySubscription.findUnique({ where: { companyId: A.id } });
  check('S15e', 'upgrade cobra R$ 45,00 no Asaas, plano vai para P2 e assinatura recorrente = 198,00', upg.status < 300 && Number(prorated?.value) === 45 && subAfter.planId === P2.id && Number((await fake('GET', `/subscriptions/${fakeSub.id}`)).value) === 198, `status=${upg.status} rateio=${prorated?.value}`);

  // fim do ciclo do cupom -> preco cheio do plano atual (P2 = 220)
  r = await createInvoice(dev, A.id, { amount: 198, billingType: 'PIX', description: 'QA ciclo com cupom' });
  const cyc = r.data; const cycRemote = (await remoteFor(cyc.id))[0];
  await event(cycRemote.id, 'PAYMENT_RECEIVED'); await paid(cyc.id); await sleep(1500);
  const subEnd = await prisma.companySubscription.findUnique({ where: { companyId: A.id } });
  check('S15f', 'ultimo ciclo do cupom pago: cupom removido e assinatura volta ao preco cheio (220,00)', subEnd.couponType === null && Number((await fake('GET', `/subscriptions/${fakeSub.id}`)).value) === 220, `cupom=${subEnd.couponType} assinatura=${(await fake('GET', `/subscriptions/${fakeSub.id}`)).value}`);

  // uso duplo/limite em paralelo (maxRedemptions = 1)
  await mkCoupon({ code: 'QAPAY-LIM', type: 'PERCENT', value: 10, durationCycles: 2, maxRedemptions: 1 });
  const B = await mkCompany('qa-pay-bravo', '98765432000102'); const C = await mkCompany('qa-pay-charlie', '98765432000103');
  await sub(B.id); await sub(C.id);
  const race = await Promise.all([B, C].map((co) => api('POST', `/faturas/plataforma/companies/${co.id}/coupon`, { token: dev, body: { code: 'QAPAY-LIM', reason: 'QA corrida' } })));
  const lim = await prisma.promotionCoupon.findUnique({ where: { code: 'QAPAY-LIM' } });
  const redemptions = await prisma.couponRedemption.count({ where: { couponId: lim.id } });
  const discounted = await prisma.companySubscription.count({ where: { companyId: { in: [B.id, C.id] }, couponType: 'PERCENT' } });
  check('S15g', 'cupom com limite 1 aplicado por 2 empresas ao mesmo tempo -> exatamente 1 sucesso, 1 resgate, 1 desconto', race.filter((x) => x.status < 300).length === 1 && redemptions === 1 && discounted === 1, `status=[${race.map((x) => x.status)}] resgates=${redemptions} descontos=${discounted}`);

  if (OLD_API) {
    const D = await mkCompany('qa-pay-delta', '98765432000104'); const E = await mkCompany('qa-pay-echo', '98765432000105');
    await sub(D.id); await sub(E.id);
    const devOld = (await http(OLD_API, 'POST', '/auth/login', { body: { email: 'dev@innovation.local', password: PASSWORD } })).data?.access_token;
    await http(OLD_API, 'POST', '/coupons', { token: devOld, body: { code: 'QAPAY-LIMOLD', type: 'PERCENT', value: 10, durationCycles: 2, maxRedemptions: 1 } });
    const raceOld = await Promise.all([D, E].map((co) => http(OLD_API, 'POST', `/faturas/plataforma/companies/${co.id}/coupon`, { token: devOld, body: { code: 'QAPAY-LIMOLD', reason: 'QA corrida (codigo antigo)' } })));
    const limOld = await prisma.promotionCoupon.findUnique({ where: { code: 'QAPAY-LIMOLD' } });
    console.log(`INFO  codigo ANTIGO (3333): status=[${raceOld.map((x) => x.status)}] resgates=${await prisma.couponRedemption.count({ where: { couponId: limOld.id } })} contador=${limOld.redemptionCount} (limite 1)`);
  }

  // ---- S16 conciliacao final ----
  dev = await login('dev@innovation.local'); // o login na API antiga (mesmo banco) renova a sessao do DEV
  const fin1 = await api('POST', '/finance/reconciliation/run', { token: dev });
  const fin2 = await api('POST', '/finance/reconciliation/run', { token: dev });
  check('S16', 'conciliacao final: divergencias abertas = 0 e 2a execucao nao cura nada (idempotente)', fin1.data.openDivergences === 0 && fin2.data.openDivergences === 0 && fin2.data.healed === 0, JSON.stringify(fin2.data));
}

try { await main(); } catch (error) { check('ERRO', 'execucao do roteiro', false, error?.stack ?? error); }
finally {
  if (!process.argv.includes('--cleanup-only')) {
    await cleanup();
    const left = await prisma.company.count({ where: { slug: { in: slugs } } });
    console.log(`\nlimpeza: ${left} empresas de teste restantes`);
    const pass = results.filter((r) => r.ok).length;
    console.log(`RESUMO: ${pass}/${results.length} cenarios verdes`);
    writeFileSync(process.env.QA_REPORT ?? '/tmp/payment-cycle-report.json', JSON.stringify(results, null, 2));
  }
  await prisma.$disconnect();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}
