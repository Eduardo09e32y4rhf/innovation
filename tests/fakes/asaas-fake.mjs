// Asaas falso para QA de pagamentos (sem chave de sandbox). Uso:
//   WEBHOOK_URL=http://localhost:3371/finance/webhook/asaas WEBHOOK_TOKEN=<token> node tests/fakes/asaas-fake.mjs
// Endpoints espelham o que apps/api/src/modules/finance/asaas.service.ts consome.
// Comportamento configuravel em runtime por POST /__control/config (ver CONFIG abaixo).
import http from 'node:http';

const PORT = Number(process.env.PORT ?? 3370);
const WEBHOOK_URL = process.env.WEBHOOK_URL ?? 'http://localhost:3371/finance/webhook/asaas';
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN ?? '';
// Asaas rejeita cobranca abaixo de R$ 5,00 (regra de valor minimo da conta).
const MIN_VALUE = Number(process.env.MIN_VALUE ?? 5);

const state = { seq: 0, customers: new Map(), payments: new Map(), subscriptions: new Map(), invoices: new Map(), refunds: new Map(), calls: [], events: [] };
const CONFIG = {
  createDelayMs: 0, // espera antes de responder POST /payments (a cobranca JA foi criada: simula timeout do cliente)
  createFail: null, // 500 | 400 | 'drop' (derruba a conexao sem responder). null = normal
  createFailTimes: 0, // quantas chamadas seguidas falham (0 = nao falha)
  createFailCreatesRemote: false, // com 'drop'/500: a cobranca existe no Asaas mesmo assim (resposta perdida)
  refundFail: false,
};

const nextId = (prefix) => `${prefix}_${String(++state.seq).padStart(6, '0')}`;
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const reject = (res, status, description) => json(res, status, { errors: [{ code: 'invalid_action', description }] });
const readBody = (req) => new Promise((resolve) => { let raw = ''; req.on('data', (c) => { raw += c; }); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } }); });
const today = () => new Date().toISOString().slice(0, 10);
const view = (p) => ({ object: 'payment', ...p });

function payload(event, payment) {
  return { id: nextId('evt'), event, dateCreated: new Date().toISOString().replace('T', ' ').slice(0, 19), payment: view(payment) };
}

async function sendWebhook(body, { token = WEBHOOK_TOKEN } = {}) {
  const res = await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json', 'asaas-access-token': token }, body: JSON.stringify(body) });
  const text = await res.text();
  state.events.push({ at: Date.now(), event: body.event, id: body.id, status: res.status });
  return { status: res.status, body: text };
}

const PAID_STATUS = { PAYMENT_RECEIVED: 'RECEIVED', PAYMENT_CONFIRMED: 'CONFIRMED', PAYMENT_RECEIVED_IN_CASH: 'RECEIVED_IN_CASH' };

function applyEvent(payment, event) {
  if (PAID_STATUS[event]) payment.status = PAID_STATUS[event];
  else if (event === 'PAYMENT_OVERDUE') payment.status = 'OVERDUE';
  else if (event === 'PAYMENT_REFUNDED') payment.status = 'REFUNDED';
  else if (event === 'PAYMENT_DELETED') payment.status = 'DELETED';
  else if (event === 'PAYMENT_CHARGEBACK_REQUESTED') payment.status = 'CHARGEBACK_REQUESTED';
  if (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED') payment.paymentDate = today();
}

function createPayment(body) {
  const id = nextId('pay');
  const payment = {
    id, customer: body.customer, subscription: body.subscription, status: 'PENDING', value: Number(body.value), netValue: Number(body.value),
    dueDate: body.dueDate, billingType: body.billingType ?? 'UNDEFINED', description: body.description, externalReference: body.externalReference,
    invoiceUrl: `http://localhost:${PORT}/i/${id}`, bankSlipUrl: body.billingType === 'BOLETO' ? `http://localhost:${PORT}/b/${id}` : undefined, dateCreated: today(),
  };
  state.payments.set(id, payment);
  return payment;
}

async function handle(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;
  const body = ['POST', 'PUT', 'PATCH'].includes(method) ? await readBody(req) : {};
  if (!path.startsWith('/__control')) state.calls.push({ method, path: path + url.search, body });

  // ---- controle (testes) ----
  if (path === '/__control/config' && method === 'POST') { Object.assign(CONFIG, body); return json(res, 200, CONFIG); }
  if (path === '/__control/reset' && method === 'POST') {
    for (const k of ['customers', 'payments', 'subscriptions', 'invoices', 'refunds']) state[k].clear();
    state.calls.length = 0; state.events.length = 0;
    Object.assign(CONFIG, { createDelayMs: 0, createFail: null, createFailTimes: 0, createFailCreatesRemote: false, refundFail: false });
    return json(res, 200, { ok: true });
  }
  if (path === '/__control/state') {
    return json(res, 200, {
      config: CONFIG, payments: [...state.payments.values()], invoices: [...state.invoices.values()],
      calls: state.calls, events: state.events,
      paymentCreates: state.calls.filter((c) => c.method === 'POST' && c.path === '/payments').length,
    });
  }
  // Muda o estado da cobranca remota e dispara o webhook correspondente. Corpo: { paymentId, event, send?: false, token? }
  if (path === '/__control/event' && method === 'POST') {
    const payment = state.payments.get(body.paymentId);
    if (!payment) return reject(res, 404, 'Cobranca inexistente no fake.');
    if (body.applyState !== false) applyEvent(payment, body.event);
    const evt = payload(body.event, payment);
    if (body.send === false) return json(res, 200, { payload: evt });
    const result = await sendWebhook(evt, body.token !== undefined ? { token: body.token } : {});
    return json(res, 200, { payload: evt, webhook: result });
  }
  // Reenvia um payload exato (duplicado/fora de ordem). Corpo: { payload, token? }
  if (path === '/__control/replay' && method === 'POST') {
    const result = await sendWebhook(body.payload, body.token !== undefined ? { token: body.token } : {});
    return json(res, 200, { webhook: result });
  }
  // Altera o estado remoto SEM disparar webhook (simula webhook perdido). Corpo: { paymentId, status }
  if (path === '/__control/set-status' && method === 'POST') {
    const payment = state.payments.get(body.paymentId);
    if (!payment) return reject(res, 404, 'Cobranca inexistente no fake.');
    payment.status = body.status;
    if (body.value !== undefined) payment.value = Number(body.value);
    if (['RECEIVED', 'CONFIRMED'].includes(body.status)) payment.paymentDate = today();
    return json(res, 200, view(payment));
  }

  // ---- API Asaas ----
  if (path === '/customers' && method === 'POST') {
    const id = nextId('cus');
    state.customers.set(id, { id, ...body });
    return json(res, 200, { id, ...body });
  }
  if (path.startsWith('/customers/') && method === 'POST') return json(res, 200, { id: path.split('/')[2] });

  if (path === '/payments' && method === 'POST') {
    if (CONFIG.createFailTimes > 0 && CONFIG.createFail) {
      CONFIG.createFailTimes -= 1;
      if (CONFIG.createFail === '400') return reject(res, 400, 'Dados invalidos (QA fake).');
      if (CONFIG.createFailCreatesRemote) createPayment(body);
      if (CONFIG.createFail === 'drop') { req.socket.destroy(); return; }
      return json(res, 500, { errors: [{ description: 'Erro interno (QA fake).' }] });
    }
    if (!(Number(body.value) >= MIN_VALUE)) return reject(res, 400, `O valor minimo da cobranca e R$ ${MIN_VALUE.toFixed(2)}.`);
    if (!body.customer || !state.customers.has(body.customer)) return reject(res, 400, 'Cliente invalido ou nao informado.');
    if (!['PIX', 'BOLETO', 'CREDIT_CARD', 'UNDEFINED'].includes(body.billingType)) return reject(res, 400, 'Forma de pagamento invalida.');
    const payment = createPayment(body);
    if (CONFIG.createDelayMs > 0) await new Promise((r) => setTimeout(r, CONFIG.createDelayMs));
    return json(res, 200, view(payment));
  }
  if (path === '/payments' && method === 'GET') {
    let list = [...state.payments.values()];
    const ref = url.searchParams.get('externalReference');
    const sub = url.searchParams.get('subscription');
    const status = url.searchParams.get('status');
    if (ref) list = list.filter((p) => p.externalReference === ref);
    if (sub) list = list.filter((p) => p.subscription === sub);
    if (status) list = list.filter((p) => p.status === status);
    return json(res, 200, { data: list.map(view), totalCount: list.length, hasMore: false });
  }
  const m = path.match(/^\/payments\/([^/]+)(?:\/([^/]+))?$/);
  if (m) {
    const payment = state.payments.get(m[1]);
    if (!payment) return reject(res, 404, 'Cobranca nao encontrada.');
    const sub = m[2];
    if (!sub && method === 'GET') return json(res, 200, view(payment));
    if (!sub && method === 'PUT') { Object.assign(payment, body); return json(res, 200, view(payment)); }
    if (!sub && method === 'DELETE') { payment.status = 'DELETED'; return json(res, 200, { deleted: true, id: payment.id }); }
    if (sub === 'pixQrCode') return json(res, 200, { encodedImage: 'iVBORw0KGgo=', payload: `00020126QA${payment.id}`, expirationDate: payment.dueDate });
    if (sub === 'identificationField') return json(res, 200, { identificationField: '34191.79001 01043.510047 91020.150008 1 00000000000000', barCode: '34191000000000000001790010104351004791020150', nossoNumero: '1' });
    if (sub === 'refund' && method === 'POST') {
      if (CONFIG.refundFail) return json(res, 500, { errors: [{ description: 'Gateway indisponivel (QA fake).' }] });
      if (!['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(payment.status) && payment.status !== 'PARTIALLY_REFUNDED') return reject(res, 400, 'Cobranca nao pode ser estornada neste status.');
      const list = state.refunds.get(payment.id) ?? [];
      const already = list.reduce((s, r) => s + r.value, 0);
      const value = body.value === undefined ? payment.value - already : Number(body.value);
      if (value <= 0 || already + value > payment.value + 1e-9) return reject(res, 400, 'Valor do estorno maior que o valor pago.');
      list.push({ id: nextId('ref'), status: 'DONE', value, description: body.description });
      state.refunds.set(payment.id, list);
      payment.status = already + value >= payment.value - 1e-9 ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      return json(res, 200, { ...view(payment), refunds: list });
    }
    if (sub === 'refunds') { const list = state.refunds.get(payment.id) ?? []; return json(res, 200, { data: list, totalCount: list.length, hasMore: false }); }
  }

  // assinaturas
  if (path === '/subscriptions' && method === 'POST') { const id = nextId('sub'); state.subscriptions.set(id, { id, ...body }); return json(res, 200, { id, ...body }); }
  const s = path.match(/^\/subscriptions\/([^/]+)$/);
  if (s) {
    const sub = state.subscriptions.get(s[1]);
    if (!sub) return reject(res, 404, 'Assinatura nao encontrada.');
    if (method === 'GET') return json(res, 200, { ...sub, status: 'ACTIVE' });
    if (method === 'PUT') { Object.assign(sub, body); return json(res, 200, sub); }
    if (method === 'DELETE') { state.subscriptions.delete(s[1]); return json(res, 200, { deleted: true, id: s[1] }); }
  }

  // notas fiscais
  if (path === '/fiscalInfo') return json(res, 200, { simplesNacional: true, municipalInscription: '123', rpsSerie: '1', rpsNumber: 1 });
  if (path === '/invoices' && method === 'POST') {
    const id = nextId('inv_fiscal');
    const invoice = { id, status: 'SCHEDULED', payment: body.payment, value: body.value, effectiveDate: body.effectiveDate };
    state.invoices.set(id, invoice);
    return json(res, 200, invoice);
  }
  if (path === '/invoices' && method === 'GET') {
    const pay = url.searchParams.get('payment');
    const list = [...state.invoices.values()].filter((i) => !pay || i.payment === pay);
    return json(res, 200, { data: list, totalCount: list.length, hasMore: false });
  }
  const f = path.match(/^\/invoices\/([^/]+)(?:\/(cancel))?$/);
  if (f) {
    const invoice = state.invoices.get(f[1]);
    if (!invoice) return reject(res, 404, 'Nota nao encontrada.');
    if (f[2] === 'cancel') { invoice.status = 'PROCESSING_CANCELLATION'; return json(res, 200, invoice); }
    return json(res, 200, invoice);
  }

  return reject(res, 404, `Rota nao implementada no fake: ${method} ${path}`);
}

http.createServer((req, res) => { handle(req, res).catch((error) => { if (!res.headersSent) json(res, 500, { errors: [{ description: String(error) }] }); }); })
  .listen(PORT, () => console.log(`[asaas-fake] porta ${PORT} -> webhook ${WEBHOOK_URL}`));
