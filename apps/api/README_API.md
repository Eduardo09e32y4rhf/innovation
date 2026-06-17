# API quickstart

Este diretório contém um esqueleto mínimo da API NestJS para acelerar o desenvolvimento do MVP.

Comandos úteis (na raiz do monorepo):

- Instalar dependências:
  npm ci

- Gerar client Prisma:
  npm --prefix apps/api run prisma:generate

- Rodar migrações (local):
  npm --prefix apps/api run prisma:migrate

- Rodar seed:
  ADMIN_PASSWORD=admin123 npm --prefix apps/api run seed:mvp

- Rodar em modo desenvolvimento (docker-compose.dev.yml):
  docker-compose -f docker-compose.dev.yml up --build

Endpoints expostos inicialmente:
- GET /api/health
- GET /api/employees
- POST /api/employees
- GET /api/employees/:id
- PUT /api/employees/:id
- DELETE /api/employees/:id
