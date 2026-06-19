# VPS Deploy - Production Notes

Use este resumo para a VPS `23.106.44.75`.

## Portas

Nao usar: `80`, `443`, `3000`, `3333`, `5432`, `5433`, `6379`, `8000`, `8080`.

Usar neste projeto:

- API: `127.0.0.1:5000` ou `0.0.0.0:5000`
- Web: `127.0.0.1:3001` ou `0.0.0.0:3001`
- Postgres container exposto: `127.0.0.1:5435`

## Docker Compose

```bash
cd /var/www/innovation.ia
cp .env.prod.example .env
nano .env
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

## Nginx opcional

Se decidir usar o Nginx ja existente nas portas 80/443, faça proxy para as portas novas:

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /api/ {
    proxy_pass http://127.0.0.1:5000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

O CSS precisa responder como asset estático do container web. Se CSS vier como `text/html`, o proxy está apontando para pasta errada; use proxy para `127.0.0.1:3001`.