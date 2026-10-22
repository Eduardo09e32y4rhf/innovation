# E2E (Playwright): suíte única

Todo teste de navegador do repositório vive aqui. Não existe outra pasta E2E.

| Grupo | Pasta | Config | Como roda | Quando |
|---|---|---|---|---|
| Público e celular | `tests/` | `playwright.config.ts` | API simulada no próprio navegador; sobe o `next dev` sozinho | todo PR (`public-flow`) |
| Fluxos logados | `flows/` | `playwright.flows.config.ts` | API, banco e Redis **reais** | todo PR (`logged-flows`) |
| Legado | `specs/`, `autoteste/` | `playwright.config.js`, `playwright.autoteste.config.ts` | apontam para um servidor externo | manual, **fora do CI** |

O job `browser-e2e` do `ci.yml` chama `.github/workflows/e2e.yml`, que roda os dois grupos. O `logged-flows` está com `continue-on-error: true` até a primeira execução verde; depois, remova essa linha para torná-lo obrigatório no `ci-ok`.

## Rodar local

```bash
npm --prefix tests-e2e ci
npm --prefix tests-e2e exec -- playwright install chromium

# Público e celular (sobe o front sozinho)
npm --prefix tests-e2e test
```

### Fluxos logados

Precisam de Postgres, Redis, API e front no ar e de dois usuários E2E:

```bash
# 1) banco com o admin de seed e os usuários E2E (copiam a senha do admin)
ADMIN_PASSWORD='SuaSenha#2026' DEV_PASSWORD='SuaSenha#2026' npm --prefix apps/api run seed:admin
psql "$DATABASE_URL" -f tests-e2e/setup/seed-users.sql        # SOMENTE banco local/teste

# 2) API e front
npm run build:api && (cd apps/api && node dist/main.js)       # porta 3333, ALLOWED_ORIGINS=http://localhost:3000
(cd apps/web && NEXT_PUBLIC_API_URL=http://localhost:3333 npx next dev -p 3000)

# 3) testes (desktop 1280x800)
E2E_PASSWORD='SuaSenha#2026' npm --prefix tests-e2e run test:flows
#    celular 360x740
E2E_PASSWORD='SuaSenha#2026' E2E_VIEWPORT=360x740 npm --prefix tests-e2e run test:flows
```

Variáveis: `E2E_API_URL` (padrão `http://localhost:3333`), `E2E_WEB_URL` (padrão `http://localhost:3000`), `E2E_PASSWORD`, `E2E_VIEWPORT` (`LARGURAxALTURA`), `E2E_CHROMIUM_PATH` (Chromium já instalado).

## O que a fumaça dos fluxos logados confere

Para cada tela: abre para o perfil certo, sem voltar ao login, **sem erro 5xx da API**, **sem erro de JavaScript** e **sem rolagem horizontal** na largura do projeto.

- Administrador: login, painel, funcionários, cadastro de funcionário, ponto, escalas e ponto, férias, vagas, faturas, usuários.
- Funcionário: painel, ponto, férias; a área de usuários bloqueia ou redireciona sem erro 5xx.
- Visitante: landing, portal de vagas públicas, saúde e prontidão da API.

## Cuidados

- O login aceita 5 tentativas por 15 minutos e o refresh token rotaciona; por isso há **uma sessão por usuário**, guardada em `.auth/` (ignorada pelo git) e reaproveitada.
- `helpers/ui.ts` assina o termo de uso e fecha o aviso de boas-vindas do primeiro acesso.
- Nunca rode o `seed-users.sql` em produção.
