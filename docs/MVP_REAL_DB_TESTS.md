# Teste MVP com banco real

Use este roteiro quando houver um PostgreSQL real acessivel. No Windows local deste workspace nao havia Docker, Postgres nem `psql` em `localhost:5432`, `5433` ou `5435`, entao o CRUD real precisa rodar na VPS ou com `DATABASE_URL` remoto valido.

## VPS

Na VPS, depois de enviar o projeto para `/var/www/innovation.ia`:

```bash
cd /var/www/innovation.ia
cp .env.prod.example .env
nano .env
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Validar API e web:

```bash
curl http://23.106.44.75:5000/health
curl http://23.106.44.75:3001/login
```

Rodar a bateria automatizada de API:

```bash
API_BASE_URL=http://23.106.44.75:5000 npm run test:mvp:api
```

O teste cria uma empresa unica, faz login real, cria funcionario, registra ponto, cria/aprova ferias, consulta usuarios/dashboard e valida WhatsApp status em fallback seguro.

## Local ou banco remoto

Configure `.env` com `DATABASE_URL` valido e rode:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:api
npm run dev:web
```

Em outro terminal:

```bash
API_BASE_URL=http://localhost:3333 npm run test:mvp:api
```

## Contratos usados pelo teste

- `POST /auth/register-company`
- `POST /auth/login`
- `GET /auth/me`
- `GET /dashboard/summary`
- `GET /users`
- `GET /users/usage`
- `POST /employees`
- `GET /employees`
- `GET /employees/:id`
- `PATCH /employees/:id`
- `DELETE /employees/:id`
- `POST /time-track/register` com `type: "ENTRY"`
- `GET /time-track`
- `GET /time-track/:employeeId/month`
- `POST /vacations`
- `GET /vacations`
- `GET /vacations/employee/:employeeId`
- `PATCH /vacations/:id/status`
- `GET /communication/whatsapp/status`