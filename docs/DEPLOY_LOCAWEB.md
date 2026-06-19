# Deploy - Innovation RH Connect

Regra principal: primeiro descubra quem é dono das portas. Porta ocupada pelo Innovation antigo não é conflito externo; nesse caso pare/recrie e mantenha a porta.

## Diagnostico obrigatorio na VPS

```bash
ss -tulpn | grep -E ':3000|:3333|:5000|:3001|:5432|:5433|:8080|:8000'
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"
pm2 list
```

## Decisao de portas

Se `3000` e `3333` forem do Innovation antigo, manter:

```env
API_PORT=3333
API_HOST_PORT=3333
WEB_PORT=3000
WEB_HOST_PORT=3000
NEXT_PUBLIC_API_URL=http://23.106.44.75:3333
ALLOWED_ORIGINS=http://23.106.44.75:3000
```

Se forem de outro sistema que nao pode parar, usar alternativa:

```env
API_PORT=5000
API_HOST_PORT=5000
WEB_PORT=3001
WEB_HOST_PORT=3001
NEXT_PUBLIC_API_URL=http://23.106.44.75:5000
ALLOWED_ORIGINS=http://23.106.44.75:3001
```

## Docker

```bash
cd /var/www/innovation.ia
docker compose -f docker-compose.prod.yml --env-file .env ps
docker compose -f docker-compose.prod.yml --env-file .env down
docker compose -f docker-compose.prod.yml --env-file .env up -d --build --remove-orphans
```

## PM2

```bash
pm2 list
pm2 restart innovation-api
pm2 restart innovation-web
pm2 logs --lines 100
```

## Smoke test MVP

Ajuste a porta conforme a decisao acima:

```bash
API_BASE_URL=http://23.106.44.75:3333 npm run test:mvp:api
```