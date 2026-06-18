# Features novas: limites, perfil DEV e gestao de empresas

Este pacote prepara o Innovation RH Connect para venda multiempresa com limite de usuarios, perfil DEV e tela de plataforma.

## O que mudou

### Banco de dados

- `UserRole` ganhou o perfil `DEV`.
- `Company` ganhou `maxUsers`, `maxEmployees` e `isActive`.
- Foi adicionada uma migration inicial para permitir deploy em banco limpo.
- As migrations atuais ficam em `apps/api/prisma/migrations/`.

### Perfil DEV

- O `AuthModule` e global e exporta `JwtModule`, evitando `JwtService undefined` em guards/modulos.
- O `RolesGuard` permite que `DEV` acesse rotas protegidas de plataforma.
- O seed cria uma empresa interna e um usuario DEV.

### Limite de usuarios

- A criacao de usuarios respeita `company.maxUsers`.
- A tela de usuarios mostra o uso atual e bloqueia criacao quando o limite e atingido.

### Modulo Plataforma

Rotas `/platform/*`, acessiveis ao DEV:

- `GET /platform/stats`: metricas globais.
- `GET /platform/companies`: empresas com contagem de uso.
- `POST /platform/companies`: cria empresa e admin inicial.
- `PATCH /platform/companies/:id`: ajusta nome, limites e status.
- `DELETE /platform/companies/:id`: remove empresa e dados relacionados.

### Frontend

- `apps/web/app/dashboard/platform/page.tsx`: tela de plataforma para DEV.
- `apps/web/app/dashboard/users/page.tsx`: limite de usuarios.
- `apps/web/app/dashboard/_components/dashboard-sidebar.tsx`: link Plataforma apenas para DEV.
- `apps/web/app/lib/api.ts`: metodos `api.platform.*` e `api.users.usage()`.

### Infra

- `apps/api/Dockerfile` e `apps/api/Dockerfile.prod` sobem a API em producao.
- `docker-compose.yml` existe na raiz para `docker compose up -d --build`.
- `docker-compose.prod.yml` recebe `NEXT_PUBLIC_API_URL` como build arg do frontend.
- `.env.prod.example` documenta variaveis de producao.

## Validacao local

Comandos usados:

```powershell
npm install
npx prisma validate --schema apps/api/prisma/schema.prisma
npx prisma generate --schema apps/api/prisma/schema.prisma
npx tsc --noEmit -p apps/web/tsconfig.json
npm run build
```

Observacao: o teste real de `prisma migrate deploy` em banco limpo precisa de Postgres/Docker disponivel.