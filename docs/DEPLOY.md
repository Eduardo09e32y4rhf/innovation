# Deploy do MVP

Este projeto esta pronto para subir no Render usando o arquivo `render.yaml` na raiz.

## Servicos criados

- `innovation-rh-connect-db`: PostgreSQL gerenciado.
- `innovation-rh-connect-api`: API NestJS em Node.js.
- `innovation-rh-connect-web`: frontend Next.js exportado como site estatico.

## Publicar

1. Envie a branch `feat/integracao-frontend` para o GitHub.
2. No Render, crie um novo Blueprint a partir do repositorio `Eduardo09e32y4rhf/innovation`.
3. Selecione a branch `feat/integracao-frontend`.
4. Confirme a criacao dos servicos.

## URLs esperadas

- Frontend: `https://innovation-rh-connect-web.onrender.com`
- API: `https://innovation-rh-connect-api.onrender.com`
- Swagger: `https://innovation-rh-connect-api.onrender.com/docs`

Se o Render alterar algum nome de servico por conflito, ajuste:

- `NEXT_PUBLIC_API_URL` no servico web.
- `ALLOWED_ORIGINS` no servico api.

## Login inicial

O seed cria o usuario:

- Email: `admin@innovation.local`
- Senha: definida pela variavel `ADMIN_PASSWORD` gerada no Render.

Para escolher uma senha manual, substitua `ADMIN_PASSWORD` nas variaveis do servico API e rode novamente o deploy ou o job de seed.
