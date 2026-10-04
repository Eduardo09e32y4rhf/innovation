# Deploy de produção — Innovation RH Connect

## Pré-requisitos

1. Copie `.env.prod.example` para `.env`.
2. Substitua todos os valores `TROQUE_*`.
3. Faça backup do volume/banco antes de migrations ou mudanças estruturais.
4. Não use `docker compose down -v`: o parâmetro `-v` remove os volumes de dados.

## Deploy recomendado

Na raiz do repositório:

```bash
git pull --ff-only origin main
bash scripts/deploy-prod.sh
```

O script:

- valida o Compose e as variáveis;
- encerra apenas os containers/rede da versão anterior;
- preserva todos os volumes;
- remove serviços órfãos;
- constrói e inicia a versão nova;
- aguarda a API ficar saudável;
- mostra automaticamente os logs se a API falhar.

## Por que o PgBouncer foi removido

A configuração anterior publicava `127.0.0.1:6432`, embora a API usasse conexão direta com `postgres:5432`. Isso criava um ponto de falha sem participar do tráfego da aplicação. O serviço foi removido do Compose de produção; PostgreSQL e Redis continuam acessíveis apenas pela rede Docker e pelas portas locais explicitamente configuradas.

## Diagnóstico

```bash
docker compose --env-file .env -f docker-compose.prod.yml ps
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=150 api
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=100 web
docker inspect --format '{{.State.Health.Status}}' innovation-api
```

Use comandos do Compose em vez de assumir nomes gerados como `innovation-api-1`. A configuração atual fixa os nomes `innovation-postgres`, `innovation-redis`, `innovation-api`, `innovation-web` e `innovation-caddy`.

## Smoke test

Substitua o domínio antes de executar:

```bash
curl -fsS https://seu-dominio.com/api/health
curl -fsSI https://seu-dominio.com/login
```

## Erros conhecidos

### `container name is already in use`

Execute o script de deploy. Ele usa `down --remove-orphans` antes do `up`, sem apagar volumes.

### `Bind for 127.0.0.1:6432 failed: port is already allocated`

Atualize para a versão atual da `main`. O PgBouncer não utilizado e o bind da porta 6432 foram removidos.

### API encerra durante `prisma migrate deploy`

Não apague o banco. Consulte os logs da API e compare o estado de `_prisma_migrations`. O histórico antigo precisa de baseline formal para bancos criados do zero; faça isso primeiro em staging, com backup e procedimento documentado.
