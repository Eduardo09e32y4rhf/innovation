# Como contribuir

Regras curtas para manter a `main` sempre publicável. Vale para pessoas e para agentes de IA.

## Fluxo

1. Crie uma branch a partir da `main` (`feat/...`, `fix/...`, `chore/...`).
2. Faça commits pequenos, **um tema por commit**.
3. Abra um Pull Request com o template. Um tema por PR.
4. O check obrigatório é o **`ci-ok`** (resume todos os jobs do CI). Só faz merge com ele verde.
5. Merge por *squash* ou *rebase* (histórico linear). Nada de push direto na `main`.

## Mensagens de commit e título do PR

Formato: `tipo(área): descrição no imperativo, até ~72 caracteres`

| Tipo | Quando |
|---|---|
| `feat` | funcionalidade nova |
| `fix` | correção de defeito |
| `refactor` | muda a estrutura sem mudar o comportamento |
| `test` | só testes |
| `docs` | só documentação |
| `chore` | manutenção (dependências, limpeza, configuração) |
| `perf` | desempenho |
| `ci` / `build` | pipeline e build |
| `revert` | desfaz outro commit |

Exemplos: `fix(time-track): ler o dia da semana do dia civil de São Paulo`, `feat(privacy): exportar dados do titular`.

Para mudança que quebra compatibilidade, use `!` depois do tipo (`feat(api)!: ...`) e explique no corpo.

### Proibido na `main`

- Commits ou PRs com **`wip`** no título (trabalho em andamento fica na branch, e vira commits limpos antes do merge).
- Commits que misturam temas (por exemplo, correção de folha junto com mudança de tela).
- `--no-verify`, force-push e commit de segredo, `.env`, dados pessoais reais ou arquivos de upload.

## Antes de abrir o PR

```bash
npx tsc --noEmit -p apps/api      # tipos da API
npx tsc --noEmit -p apps/web      # tipos do front
npx vitest run                    # testes (na raiz)
```

Mudou dinheiro, folha, autenticação ou isolamento entre empresas? Escreva primeiro o teste que falha, depois a correção.

## Migrations

- Só **aditivas** (tabela/coluna nova) sem aviso; remover ou alterar coluna exige plano de migração no PR.
- Produção recebe apenas `prisma migrate deploy`. Nada de SQL manual.
- Moeda é sempre `Decimal`, nunca `Float`.

## Revisão

`.github/CODEOWNERS` define quem revisa finanças, folha, autenticação, privacidade, Prisma, infra e CI. Esses PRs precisam da aprovação do dono do código.

## Issues e rótulos

- Severidade: **P0** (bloqueia produção), **P1** (crítico), **P2** (importante).
- Área: `area:*`. Estado: `status:*`.
- Defeitos que o contador ou o jurídico precisam validar usam o modelo "Validação".
