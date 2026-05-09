# Deploy VPS - Innovation IA

## 1. Ambiente

Use Node.js 20+, PostgreSQL e PM2.

```bash
cp .env.vps.example .env
nano .env
```

Preencha no minimo:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APP_URL`
- `ALLOWED_ORIGINS`

Mantenha em producao:

```bash
ENABLE_DEMO_TOKEN=false
ENABLE_LOCAL_SESSION=false
NEXT_PUBLIC_ENABLE_LOCAL_SESSION=false
```

## 2. Instalar e compilar

```bash
npm ci
npm run vps:infra
npm --prefix apps/api run prisma:generate
npm --prefix apps/api run prisma:deploy
npm run build:api
npm run build:web
```

Importante: o `NEXT_PUBLIC_API_URL` precisa estar certo antes do `npm run build:web`, porque o frontend e exportado estaticamente.

Postgres e Redis sobem pelo [`docker-compose.vps.yml`](../../docker-compose.vps.yml):

- Postgres: `127.0.0.1:5432`
- Redis: `127.0.0.1:6379`
- Volumes persistentes: `innovation_postgres_data` e `innovation_redis_data`

Para checar saude:

```bash
docker compose --env-file .env -f docker-compose.vps.yml ps
docker compose --env-file .env -f docker-compose.vps.yml logs -f
```

## 3. Rodar com PM2

```bash
npm i -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Servicos esperados:

- API: `127.0.0.1:3333`
- Web: `127.0.0.1:3000`

## 4. Nginx sugerido

```nginx
server {
  server_name seudominio.com www.seudominio.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

server {
  server_name api.seudominio.com;

  location / {
    proxy_pass http://127.0.0.1:3333;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## 5. Checklist rapido

```bash
curl -I https://seudominio.com
curl -I https://seudominio.com/_next/static/css/a7264e1ba7947b33.css
curl https://api.seudominio.com/health
pm2 logs innovation-api
pm2 logs innovation-web
```

O CSS precisa responder com `Content-Type: text/css`. Se responder `text/html`, o Nginx esta servindo uma pasta errada ou fazendo fallback para `index.html` nos assets. Nesse caso, use proxy para `127.0.0.1:3000` como no exemplo acima e reinicie:

```bash
npm run build:web
pm2 restart innovation-web --update-env
sudo nginx -t
sudo systemctl reload nginx
```

Depois entre no painel, faca login real, abra WhatsApp > Conexao, leia o QR Code e valide as conversas reais.
