# API quickstart

Este diretorio contem a API NestJS do MVP de RH.

Comandos uteis na raiz do monorepo:

- Instalar dependencias:
  npm ci

- Gerar client Prisma:
  npm run db:generate

- Rodar migracoes locais:
  npm run db:migrate

- Rodar seed:
  npm run db:seed

- Subir PostgreSQL local:
  docker compose -f infra/docker-compose.yml up -d postgres

- Rodar API em desenvolvimento:
  npm run dev:api

Endpoints principais:
- GET /api/health
- GET /api/employees
- POST /api/employees
- GET /api/employees/:id
- PUT /api/employees/:id
- DELETE /api/employees/:id
