# Deploy - Innovation RH Connect

Regra principal: primeiro descubra quem e dono das portas. Porta ocupada pelo Innovation antigo nao e conflito externo; nesse caso suba a nova versao no mesmo lugar e mantenha Nginx/API URL.

## Diagnostico obrigatorio na VPS

```bash
ss -tulpn | grep -E ':3000|:3333|:5000|:3001|:5432|:5433|:8080|:8000'
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"
pm2 list
```

## Producao atual

A VPS publica o sistema por HTTPS no Nginx:

```txt
https://vps8369.panel.icontainer.net
```

O Nginx deve manter:

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
}

location /api/ {
    proxy_pass http://127.0.0.1:3333/;
}
```

No `.env` de producao, mantenha a API relativa para evitar mixed content:

```env
API_PORT=3333
API_HOST_PORT=3333
WEB_PORT=3000
WEB_HOST_PORT=8080
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_API_BASE_URL=/api
NEXT_PUBLIC_API_BASE=/api
ALLOWED_ORIGINS=https://vps8369.panel.icontainer.net
```

So use portas alternativas se ficar confirmado que as portas atuais pertencem a outro sistema que nao pode ser parado.

## Docker incremental

Nao use `down -v` e nao remova volumes. Para atualizar:

```bash
cd /var/www/innovation.ia
git pull origin feat/integracao-frontend
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
sudo nginx -t
sudo systemctl reload nginx
```

## Smoke test MVP

```bash
curl -i https://vps8369.panel.icontainer.net/api/health
curl -I https://vps8369.panel.icontainer.net/login
docker exec innovation-web sh -lc "grep -R '23.106.44.75:3333\|localhost:3333\|127.0.0.1:3333' /app/out || echo OK"
API_BASE_URL=https://vps8369.panel.icontainer.net/api npm run test:mvp:api
```

## PM2

Use PM2 apenas se a versao atual estiver rodando por PM2:

```bash
pm2 list
pm2 restart innovation-api
pm2 restart innovation-web
pm2 logs --lines 100
```