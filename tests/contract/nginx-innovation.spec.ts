import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// INF-10: contrato do nginx de REFERENCIA (infra/nginx-innovation.conf). Nao prova o nginx real da VPS.
// `nginx -t` nao pode rodar na sessao de desenvolvimento (sem nginx e sem daemon Docker): ver docs/DEPLOY-VPS.md.
const RAIZ = join(__dirname, '../..');
const conf = readFileSync(join(RAIZ, 'infra/nginx-innovation.conf'), 'utf8');
const semComentarios = conf.split('\n').map((l) => l.replace(/(^|\s)#.*$/, '')).join('\n');

/** Corpo do bloco `location ... {` cujo cabecalho contem `head`. */
function block(head: string): string {
  const i = semComentarios.indexOf(head);
  expect(i, `bloco ${head}`).toBeGreaterThanOrEqual(0);
  const open = semComentarios.indexOf('{', i);
  let depth = 0;
  for (let k = open; k < semComentarios.length; k++) {
    if (semComentarios[k] === '{') depth++;
    if (semComentarios[k] === '}' && --depth === 0) return semComentarios.slice(open + 1, k);
  }
  throw new Error('bloco nao fechado');
}

describe('sintaxe basica', () => {
  it('chaves balanceadas e toda linha de diretiva termina em ; { ou }', () => {
    expect((semComentarios.match(/{/g) ?? []).length).toBe((semComentarios.match(/}/g) ?? []).length);
    for (const raw of semComentarios.split('\n')) {
      const l = raw.trim();
      if (l) expect(l, 'linha sem terminador').toMatch(/[;{}]$/);
    }
  });
});

describe('TLS e servidor', () => {
  it('so TLSv1.2/1.3, sem tokens, sessao e ciphers modernos', () => {
    expect(semComentarios).toMatch(/ssl_protocols\s+TLSv1\.2 TLSv1\.3;/);
    expect(semComentarios).not.toMatch(/TLSv1(\.0|\.1)?[ ;]|SSLv/);
    expect(semComentarios).toMatch(/ssl_ciphers\s+[^;]*ECDHE-ECDSA-AES128-GCM-SHA256[^;]*;/);
    expect(semComentarios).toMatch(/ssl_prefer_server_ciphers\s+off;/);
    expect(semComentarios).toMatch(/server_tokens\s+off;/);
    expect(semComentarios).toMatch(/ssl_session_tickets\s+off;/);
  });
  it('OCSP stapling presente mas comentado (depende do certificado)', () => {
    expect(conf).toMatch(/^\s*#\s*ssl_stapling on;/m);
    expect(semComentarios).not.toMatch(/ssl_stapling\s+on/);
  });
  it('HTTP redireciona para HTTPS e o dominio e um marcador, nao um host real', () => {
    expect(semComentarios).toMatch(/return 301 https:\/\/\$host\$request_uri;/);
    expect(semComentarios).not.toMatch(/icontainer|vps8369/);
    expect(semComentarios).toMatch(/SEU-DOMINIO/);
  });
  it('NAO duplica cabecalhos de seguranca que o Next ja envia', () => {
    expect(semComentarios).not.toMatch(/add_header\s+(Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options|Referrer-Policy|Permissions-Policy|Content-Security-Policy)/i);
    expect(semComentarios).not.toMatch(/proxy_hide_header/);
  });
});

describe('limites e timeouts', () => {
  it('corpo 20m, timeouts de cliente e proxy', () => {
    expect(semComentarios).toMatch(/client_max_body_size\s+20m;/);
    expect(semComentarios).not.toMatch(/client_max_body_size\s+(25|50)/i);
    expect(semComentarios).toMatch(/client_body_timeout\s+30s;/);
    expect(semComentarios).toMatch(/client_header_timeout\s+\d+s;/);
    expect(semComentarios).toMatch(/send_timeout\s+\d+s;/);
    expect(semComentarios).toMatch(/proxy_connect_timeout\s+\d+s;/);
    expect(semComentarios).toMatch(/proxy_read_timeout\s+60s;/);
  });
  it('limit_req/limit_conn por IP em /api/auth/ e /api/public/, com 429', () => {
    expect(semComentarios).toMatch(/limit_req_zone\s+\$binary_remote_addr\s+zone=innovation_auth:\d+m\s+rate=10r\/m;/);
    expect(semComentarios).toMatch(/limit_req_zone\s+\$binary_remote_addr\s+zone=innovation_public:\d+m\s+rate=\d+r\/s;/);
    expect(semComentarios).toMatch(/limit_conn_zone\s+\$binary_remote_addr\s+zone=innovation_conn:\d+m;/);
    expect(semComentarios).toMatch(/limit_req_status\s+429;/);
    const auth = block('location ^~ /api/auth/');
    expect(auth).toMatch(/limit_req\s+zone=innovation_auth\s+burst=\d+\s+nodelay;/);
    const pub = block('location ^~ /api/public/');
    expect(pub).toMatch(/limit_req\s+zone=innovation_public\s+burst=\d+\s+nodelay;/);
    expect(pub).toMatch(/limit_conn\s+innovation_conn\s+\d+;/);
  });
});

describe('proxy', () => {
  it('upstreams em 127.0.0.1:3333 e :3000', () => {
    expect(semComentarios).toMatch(/upstream\s+innovation_api\s*{\s*server 127\.0\.0\.1:3333;/);
    expect(semComentarios).toMatch(/upstream\s+innovation_web\s*{\s*server 127\.0\.0\.1:3000;/);
  });
  it('toda location de proxy repassa X-Forwarded-For com $proxy_add_x_forwarded_for', () => {
    expect(semComentarios).toMatch(/proxy_set_header\s+X-Forwarded-For\s+\$proxy_add_x_forwarded_for;/);
    for (const head of ['location ^~ /api/auth/', 'location ^~ /api/public/', 'location /api/', 'location ^~ /api/finance/webhook/', 'location /']) {
      const b = block(head);
      expect(b, head).toMatch(/proxy_set_header\s+X-Forwarded-For\s+\$proxy_add_x_forwarded_for;/);
    }
  });
  it('/api/* chega na API sem o prefixo /api (proxy_pass com barra final) em todas as rotas de API, inclusive webhooks', () => {
    for (const head of ['location ^~ /api/auth/', 'location ^~ /api/public/', 'location /api/', 'location ^~ /api/finance/webhook/']) {
      const b = block(head);
      expect(b, head).toMatch(/rewrite\s+\^\/api\/\(\.\*\)\$\s+\/\$1\s+break;/);
      expect(b, head).toMatch(/proxy_pass\s+http:\/\/innovation_api;/); // sem URI: usa o caminho reescrito (com URI, ^~ /api/auth/ perderia "auth/")
    }
  });
  it('webhooks (/api/finance/webhook/) nao tem limit_req', () => {
    expect(block('location ^~ /api/finance/webhook/')).not.toMatch(/limit_req|limit_conn/);
  });
  it('/api/metrics e /api/health completo nao saem; /api/health/live e /ready sim (deploy.yml usa /ready)', () => {
    expect(block('location ^~ /api/metrics')).toMatch(/return 404;/);
    expect(block('location = /api/health')).toMatch(/return 404;/);
    expect(block('location = /api/health/live')).toMatch(/proxy_pass/);
    expect(block('location = /api/health/ready')).toMatch(/proxy_pass/);
  });
  it('estaticos do Next: cache imutavel somente em /_next/static/ e gzip ligado', () => {
    expect(block('location /_next/static/')).toMatch(/add_header\s+Cache-Control\s+"public, max-age=31536000, immutable"\s+always;/);
    expect(semComentarios.match(/add_header\s+Cache-Control/g)?.length).toBe(1);
    expect(semComentarios).toMatch(/gzip\s+on;/);
  });
});
