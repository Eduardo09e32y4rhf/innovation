# Seeds e dados de teste: auditoria (L11, 21/10/2026)

Escopo: item **L11** de [`ESCOPO-PRODUCAO-V1.md`](../ESCOPO-PRODUCAO-V1.md). Esta auditoria so **leu** `apps/` e `infra/`; as correcoes que dependem deles estao listadas como pendencias com dono.

## 1. Inventario dos seeds

| Seed | Como roda | O que cria | Guarda contra producao | Situacao |
|---|---|---|---|---|
| `apps/api/prisma/seed-plans-catalog.ts` | manual | catalogo de planos | nao precisa (dado legitimo de producao) | ok |
| `apps/api/prisma/seed-pricing.ts` | `npm run seed:pricing` | precos | nao precisa | ok |
| `apps/api/prisma/seed-admin.cjs` | `npm run db:seed`, `seed:mvp`, `seed:admin`; **`infra/render.yaml`**; E2E no CI | empresa **"Empresa Demo"** (doc. `00000000000191`), admin dela, usuario **DEV** | so exige variaveis fortes em producao (`requiredEnv`); **nao bloqueia a empresa demo** | **defeito** |
| `apps/api/prisma/seed-realistic-demo.ts` | `npm run seed:realistic-demo` | dezenas de funcionarios e usuarios ficticios (`@innovation.com`) | **nenhuma** | **defeito** |
| `apps/api/test/e2e-seed.ts` | E2E | `dev@`/`comercial@innovation.com` | **nenhuma** | **defeito** |
| `scripts/test/seed-test-data.ts` | `npm run test:db:seed` | dados de teste | aborta se `DATABASE_URL` nao for o banco de teste (porta 5436) | ok |
| SQL de E2E (`tests/e2e`, `tests-e2e`) | CI/dev | usuarios E2E | so dev/staging | ok |

## 2. Achados

| # | Gravidade | Achado | Dono / correcao |
|---|---|---|---|
| F1 | **Alta** | `infra/render.yaml` define `startCommand: npm run db:deploy && npm run db:seed && npm run start:api` com `NODE_ENV=production`. A **cada subida** da API o seed cria/atualiza a "Empresa Demo" e os usuarios admin/DEV, e o `upsert` do DEV **regrava o hash da senha com o valor da variavel de ambiente**. O arquivo parece legado (aponta para `feat/integracao-frontend`, plano `free`; o deploy vigente e a VPS), mas continua no repositorio como armadilha | `infra/`: apagar `render.yaml` ou tirar `db:seed` do `startCommand`. Nao e do escopo desta onda |
| F2 | **Alta** | `seed-realistic-demo.ts` nao tem nenhuma guarda de ambiente: rodar em producao cria usuarios ficticios, inclusive ADMIN, RH e GESTOR, **todos com a mesma senha** (`SEED_DEFAULT_PASSWORD`, exigida pelo script; a senha fixa antiga ja foi removida, ver `docs/architecture/SECURITY-001-credential-rotation.md`). So roda se essa variavel estiver definida no ambiente | `apps/api`: recusar com `NODE_ENV=production` |
| F3 | Media | `seed-admin.cjs` em producao ainda cria a empresa demo e seu admin. O usuario DEV (dono da plataforma) e legitimo, mas a empresa/admin demo nao | `apps/api`: em producao pular a empresa demo (ou exigir `SEED_ALLOW_DEMO=true`) |
| F4 | Media | `e2e-seed.ts` sem guarda | `apps/api`: recusar com `NODE_ENV=production` |
| F5 | Info | `tests/security/no-demo-data-in-production.spec.ts` ignora qualquer caminho com `seed` (so procura textos ficticios no codigo), entao nao via nada disso | Resolvido nesta onda: novo `tests/security/seed-production-guard.spec.ts` |

Guarda sugerida (colar no topo dos seeds de demo; deve ficar na coluna 0, e o teste novo a reconhece):

```ts
if (process.env.NODE_ENV === 'production') {
  console.error('Recusado: este seed cria dados de demonstracao e nao pode rodar em producao.');
  process.exit(1);
}
```

### O teste novo (`tests/security/seed-production-guard.spec.ts`)
- Falha se aparecer um **seed versionado sem classificacao** (obriga a decidir "catalogo" ou "demo" ao criar um seed novo).
- Exige a guarda no topo dos seeds de demo. Hoje F2, F3 e F4 estao registrados como **defeito aberto** com `it.fails`: a suite fica verde enquanto o defeito existe e **falha quando alguem adicionar a guarda**, hora de trocar `gap: true` por `false`.
- Rodou no CI (`tests/security` esta no vitest principal).

## 3. Dados de teste que precisam sair do staging

Calibrado com **consultas somente de leitura** no banco local de desenvolvimento (o staging real nao foi acessado). O que casa:

| Tipo | Criterio | No banco local |
|---|---|---|
| Usuarios | todos os usuarios das empresas abaixo; `qa-*@innovation.local`; `e2e*@*`; `funcionario@innovation.local`; `*@innovation.com` (seeds de demo); `robo-qa.*@example.com` | 12 |
| Empresas | "Empresa Demo" (doc. `00000000000191`); "Empresa B" sem documento; nome `ROBO-QA*` | 2 |
| Funcionarios | nome `Race Test*` (testes de concorrencia); nome com `<script` (testes de XSS) | 2 ativos (+2 ja desligados) |

Nao casam (ficam): "Innovation Plataforma" e o usuario `dev@innovation.local`; `admin@innovation.local` fica por padrao (`keep_seed_admins=yes`).

### Como limpar: `scripts/dev/cleanup-test-data.sql`
- **Somente dev/staging.** Tres travas: `-v prod_db=<banco de producao>` (recusa se o banco conectado tiver esse nome), `-v confirm=LIMPAR-DADOS-DE-TESTE` e `-v apply=yes` para gravar; sem `apply=yes` e um **ensaio que lista e faz ROLLBACK**.
- **Reversivel**: desativa e anonimiza (`removido+<id>@invalid.local`), cancela empresa, desliga funcionario. Nao apaga linhas: apagar de verdade exige conhecer as chaves estrangeiras (134 tabelas) e deve ser feito por quem administra o banco, depois de backup.
- Testado numa **copia descartavel** do banco local (nunca no banco em uso): sem variaveis aborta; banco igual ao `prod_db` aborta; `confirm` errado aborta; ensaio nao altera nada (14 usuarios ativos antes e depois); `apply=yes` desativa 12 usuarios, cancela 2 empresas e desliga 2 funcionarios, mantendo `dev@` e `admin@innovation.local`; com `keep_seed_admins=no` desativa tambem esses dois.
- Para os dados do robo de QA que ja existem em bancos reais, use `scripts/ops/purge-robo-qa.cjs` (dry-run por padrao).

## 4. Pendencias (fora desta onda)
1. **F1** apagar `infra/render.yaml` (ou remover `db:seed` dele). **Alta.**
2. **F2/F3/F4** adicionar a guarda nos tres seeds e virar `gap` para `false` no teste novo.
3. Rodar o ensaio do `cleanup-test-data.sql` no staging real e conferir a lista antes de `apply=yes`.
