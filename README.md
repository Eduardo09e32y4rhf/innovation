# Innovation RH Connect

Sistema de RH com controle de ponto e comunicacao via WhatsApp para pequenas e medias empresas.

## Objetivo do MVP

Entregar um MVP vendavel para equipes de RH acompanharem funcionarios, ponto, ferias e comunicacao operacional por WhatsApp em uma unica plataforma.

## Stack oficial

- Frontend: Next.js 14, React, TailwindCSS, Lucide, Recharts e Framer Motion.
- Backend: NestJS, Prisma, PostgreSQL, JWT, Helmet, Throttler e cookie-parser.
- Banco de dados: PostgreSQL com schema Prisma oficial em `apps/api/prisma/schema.prisma`.
- Comunicacao: modulo WhatsApp integrado ao backend.

## Modulos visiveis

- Dashboard RH
- Funcionarios
- Controle de Ponto
- Ferias
- WhatsApp
- Configuracoes
- Usuarios

## Modulos ocultos no MVP

Financeiro, IA, Recrutamento/ATS, Desktop e Contabilidade ficam fora da navegacao e do escopo de entrega inicial.

## Como rodar localmente

```bash
npm install
docker compose -f infra/docker-compose.yml up -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:api
npm run dev:web
```

Por padrao, o frontend roda em `http://localhost:3000` e a API usa `API_PORT` ou `PORT`, com fallback para `3333`.

O compose fica em `infra/docker-compose.yml` e e dedicado a dependencias locais, como PostgreSQL. API e Web rodam pelos scripts npm para manter o fluxo de desenvolvimento simples.

## Migrations

```bash
npm run db:migrate
npm run db:deploy
npm run db:studio
```

Todos os comandos Prisma apontam para `apps/api/prisma/schema.prisma`.

## Build

```bash
npm run typecheck
npm run build
```

## Novidades recentes

- Botao "Ponto" nas listagens de **Funcionarios** e **Folha de ponto da empresa**.
- Acesso direto ao registro de ponto individual por colaborador via `/dashboard/time-track?employeeId=ID`.
- Filtro automatico por colaborador ao acessar por esse botao.
- Titulo dinamico da pagina: "Folha de ponto da empresa", "Ponto da equipe" (por colaborador) ou "Meu ponto" (funcionario).
- PDFs de ponto com layout reutilizavel (Ficha, Folha Individual, Espelho Individual/Empresa, Recibo de Ferias).

## Roadmap curto

- Consolidar cadastros de funcionarios com status de desligamento logico.
- Fechar fluxo mensal de ponto com correcao por RH/Admin.
- Completar solicitacao e aprovacao de ferias.
- Evoluir painel WhatsApp com QR Code, conversas e mensagens.
- Preparar a primeira implantacao comercial do MVP.
