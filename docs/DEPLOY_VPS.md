# Deploy na VPS - Innovation RH Connect

Guia rapido para colocar o sistema no ar na VPS `23.106.44.75` com Docker.
Ao final, Postgres, API e frontend ficam rodando, com o usuario DEV criado pelo seed.

> Antes de subir: confirme que a VPS esta ativa e sem fatura vencida.

## 1. Entrar na VPS

```bash
ssh root@23.106.44.75
```

Confirme Docker e Docker Compose:

```bash
docker --version && docker compose version
```

Se nao tiver Docker:

```bash
curl -fsSL https://get.docker.com | sh
```

## 2. Clonar ou atualizar o repositorio

```bash
cd /opt
git clone https://github.com/Eduardo09e32y4rhf/innovation.git
cd innovation
```

Se o repo ja existir:

```bash
cd /opt/innovation
git pull
```

## 3. Criar o .env de producao

```bash
cp .env.prod.example .env
nano .env
```

Troque no minimo:

- `POSTGRES_PASSWORD`: senha forte do banco.
- `JWT_SECRET`: gere com `openssl rand -hex 32`.
- `DEV_EMAIL` e `DEV_PASSWORD`: seu acesso de engenharia/plataforma.
- `ADMIN_PASSWORD`: senha do admin demo.
- `NEXT_PUBLIC_API_URL`: `http://23.106.44.75:3333` no primeiro deploy.
- `ALLOWED_ORIGINS`: `http://23.106.44.75:8080` no primeiro deploy.

As variaveis `PLATFORM_COMPANY_DOCUMENT` e `DEMO_COMPANY_DOCUMENT` sao usadas pelo seed para fazer upsert seguro das empresas internas/demo.

## 4. Subir tudo

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

A API aplica as migrations, roda o seed e sobe em producao. O primeiro build pode demorar alguns minutos por causa de dependencias nativas.

Acompanhe a API:

```bash
docker compose -f docker-compose.prod.yml logs -f api
```

Quando aparecer a linha do seed com `DEV ->`, sua conta DEV esta criada.

## 5. Testar

- Frontend: `http://23.106.44.75:8080`
- API health: `http://23.106.44.75:3333/health`

Entre com `DEV_EMAIL` e `DEV_PASSWORD`. O usuario DEV ve o menu Plataforma para criar empresas, ajustar limites e suspender clientes.

## 6. Atualizar depois de novo push

```bash
cd /opt/innovation
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## 7. Comandos uteis

```bash
# Status
docker compose -f docker-compose.prod.yml ps

# Logs da API
docker compose -f docker-compose.prod.yml logs -f api

# Parar tudo
docker compose -f docker-compose.prod.yml down

# Backup do banco
docker exec innovation-postgres pg_dump -U innovation_user innovation > backup_$(date +%F).sql
```

## Dominio e HTTPS

Rodar por IP funciona para validar. Para vender, use dominio com HTTPS. Depois de configurar proxy/SSL, atualize:

```env
NEXT_PUBLIC_API_URL=https://api.seudominio.com
ALLOWED_ORIGINS=https://app.seudominio.com
```

E rebuilde:

```bash
docker compose -f docker-compose.prod.yml up -d --build web api
```

## WhatsApp

A sessao do WhatsApp fica no volume `innovation_wa`, entao sobrevive a restarts. Conecte uma vez pelo QR Code e a API mantem a sessao na VPS.