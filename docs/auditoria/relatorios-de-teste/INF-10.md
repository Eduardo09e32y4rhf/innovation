# INF-10: nginx de referencia

## Problema
Nao havia nginx endurecido no repo (nginx-lb.conf: host fixo, 50M, sem TLS/limites). `tests/contract/nginx-innovation.spec.ts` falhava (arquivo ausente).

## Documentacao
nginx.org e ssl-config.mozilla.org: NAO VERIFICADO (rede bloqueada nesta sessao; nginx nao instalado e sem daemon Docker; apt sem rede). Diretivas por conhecimento previo (perfil intermediate do Mozilla). `nginx -t`: **NAO VERIFICADO**.

## Correcao: infra/nginx-innovation.conf (REFERENCIA; nao afirma que o nginx da VPS e assim)
TLSv1.2/1.3, ciphers ECDHE/AEAD, tickets off, OCSP stapling comentado, server_tokens off, client_max_body_size 20m, timeouts (header 15s, body 30s, send 30s, proxy_read 60s), limit_req 10r/m em /api/auth/ e 20r/s + limit_conn em /api/public/ (429), gzip, cache imutavel so em /_next/static/, proxies para 127.0.0.1:3333 e :3000 com X-Forwarded-For $proxy_add_x_forwarded_for. Sem add_header de seguranca (Next ja envia; SEG-headers.md). /api/metrics e /api/health -> 404; /api/health/live e /ready liberados (deploy.yml usa /ready). Webhooks: `/api/finance/webhook/` sem limit_req, 1m; o prefixo /api e removido por `rewrite ^/api/(.*)$ /$1 break;` + `proxy_pass http://innovation_api;` (com URI no proxy_pass, `location ^~ /api/auth/` perderia "auth/"). `rollback.yml` passou a checar /api/health/ready.

## Testes
nginx-innovation.spec.ts: 13 passam (sintaxe basica, TLS, sem headers duplicados, limites, rewrite/webhook, bloqueios).

## Conferir na VPS
Lista completa de comandos em docs/DEPLOY-VPS.md (secao "nginx de referencia"): `nginx -T`, `nginx -t && reload`, curl de HSTS, /api/metrics 404, rajada em /api/auth/login 429. Risco: `http2 on` exige nginx >= 1.25.1.
