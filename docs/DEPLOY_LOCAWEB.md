# Deploy na Locaweb

Este MVP precisa de um ambiente que rode Node.js continuamente e PostgreSQL.
Na Locaweb, use uma VPS/Cloud Server com Docker.

## Publicar para teste

No servidor:

```bash
git clone https://github.com/Eduardo09e32y4rhf/innovation.git
cd innovation
git checkout feat/integracao-frontend
cp infra/locaweb.env.example .env
```

Edite `.env` e troque:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `ADMIN_PASSWORD`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_URL`
- `ALLOWED_ORIGINS`

Depois suba:

```bash
docker compose --env-file .env -f infra/docker-compose.locaweb.yml up -d --build
```

## Acessos

- Frontend: `http://SEU_IP_OU_DOMINIO`
- API: `http://SEU_IP_OU_DOMINIO:3333`
- Swagger: `http://SEU_IP_OU_DOMINIO:3333/docs`

Login inicial:

- Email: `admin@innovation.local`
- Senha: valor de `ADMIN_PASSWORD`

## Atualizar depois

```bash
git pull
docker compose --env-file .env -f infra/docker-compose.locaweb.yml up -d --build
```

## Observacao

Se usar HTTPS/domino com proxy, atualize `NEXT_PUBLIC_API_URL` e
`ALLOWED_ORIGINS` para as URLs `https://...` e rode o build novamente.
