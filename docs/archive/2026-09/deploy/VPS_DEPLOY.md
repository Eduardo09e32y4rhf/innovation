# VPS Deploy - Production Notes

Use este resumo para a VPS publicada em:

```txt
https://vps8369.panel.icontainer.net
```

## Regra de preservacao

Nao apague volumes, nao rode `docker compose down -v` e nao recrie banco sem autorizacao. A atualizacao deve ser incremental e preservar o sistema atual.

## Portas atuais do Innovation

- Nginx publico: `80` e `443`
- Web container: host `8080` -> container `3000`
- API container: host `3333` -> container `3333`
- Postgres Docker novo: host `5435` -> container `5432`, quando usado

Porta ocupada pelo proprio Innovation antigo deve ser mantida. Porta ocupada por outro sistema deve ser investigada antes de mudar.

## Nginx esperado

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
}

location /api/ {
    proxy_pass http://127.0.0.1:3333/;
}
```

## Variaveis publicas do frontend

```env
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_API_BASE_URL=/api
NEXT_PUBLIC_API_BASE=/api
ALLOWED_ORIGINS=https://vps8369.panel.icontainer.net
```

Nao use `http://localhost:3333`, `http://127.0.0.1:3333` ou `http://23.106.44.75:3333` no build do frontend de producao.

## Deploy Docker

```bash
cd /var/www/innovation.ia
git pull origin feat/integracao-frontend
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
sudo nginx -t
sudo systemctl reload nginx
```

## Validacao

```bash
curl -i https://vps8369.panel.icontainer.net/api/health
curl -I https://vps8369.panel.icontainer.net/login
docker exec innovation-web sh -lc "grep -R '23.106.44.75:3333\|localhost:3333\|127.0.0.1:3333' /app/out || echo OK"
API_BASE_URL=https://vps8369.panel.icontainer.net/api npm run test:mvp:api
```

O CSS precisa responder como asset estatico do container web. Se CSS vier como `text/html`, valide se o container web foi reconstruido com `scripts/serve-static.cjs` e se o Nginx aponta `/` para `127.0.0.1:8080`.