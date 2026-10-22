# Divida de tipos (`any`) - inventario e plano de reducao

Item **L7** de [`ESCOPO-PRODUCAO-V1.md`](ESCOPO-PRODUCAO-V1.md). Este documento e so inventario: **nenhum codigo foi alterado**. Medido em 21/10/2026.

## Resumo (linha de base)

| Onde | `any` (codigo de producao) | `any` em testes (`*.spec.ts`) |
|---|---:|---:|
| API (`apps/api/src`, `apps/api/scripts`) | **669** | 524 |
| Web (`apps/web/app`) | **241** | 0 |
| **Total** | **910** | 524 |

- 181 de 851 arquivos de producao (21%) tem ao menos um `any`.
- Os 5 modulos criticos do escopo (time-track, finance, auth, payroll, privacy) somam **186** ocorrencias (28% do `any` da API).
- A contagem citada no escopo (586 na API e 187 no web) usava um padrao mais estreito; os numeros acima usam o padrao abaixo e por isso sao maiores. **Use sempre o mesmo script para comparar antes e depois.**

### Como foi contado
Regex por linha sobre arquivos `.ts`/`.tsx` versionados (ignora `.d.ts` e linhas de comentario): `: any`, `as any`, `<any>`, `any[]`, `, any>`, `(any)`, `=> any`, `any |`, `| any`, `Promise<any>`, `Record<_, any>`. E uma **estimativa** (pode contar `any` dentro de string e nao ve `any` implicito), suficiente para priorizar e para o limite de nao-regressao abaixo.

## API por modulo
| `any` | Modulo |
|---:|---|
| 70 | `api/modules/time-track` |
| 68 | `api/modules/jobs` |
| 53 | `api/modules/finance` |
| 51 | `api/modules/support` |
| 41 | `api/modules/auth` |
| 40 | `api/modules/employees` |
| 36 | `api/modules/schedule-hub` |
| 36 | `api/modules/schedule` |
| 35 | `api/modules/communication` |
| 30 | `api/modules/accounting` |
| 28 | `api/common` |
| 22 | `api/modules/management` |
| 21 | `api/modules/platform` |
| 16 | `api/modules/manual-contracts` |
| 16 | `api/modules/users` |
| 14 | `api/modules/dashboard` |
| 13 | `api/modules/ai` |
| 12 | `api/modules/payroll` |
| 10 | `api/modules/privacy` |
| 10 | `api/modules/proposals` |
| 9 | `api/modules/notifications` |
| 8 | `api/modules/vacations` |
| 5 | `api/modules/ceo-onboarding` |
| 5 | `api/modules/promotions` |
| 3 | `api/modules/holidays` |
| 2 | `api/database` |
| 2 | `api/modules/analytics` |
| 2 | `api/modules/companies` |
| 2 | `api/modules/coupons` |
| 2 | `api/modules/document-templates` |
| 1 | `api/scripts` |
| 1 | `api/health` |
| 1 | `api/raiz` |
| 1 | `api/modules/documents` |
| 1 | `api/modules/lookup` |
| 1 | `api/modules/platform-hub` |
| 1 | `api/modules/queue` |

## Web por area
| `any` | Area |
|---:|---|
| 120 | `web/lib` |
| 28 | `web/dashboard/platform` |
| 25 | `web/dashboard/escalas` |
| 18 | `web/dashboard/_components` |
| 16 | `web/dashboard/management` |
| 10 | `web/dashboard/support` |
| 9 | `web/dashboard/faturas` |
| 8 | `web/[tenant]` |
| 3 | `web/dashboard/employees` |
| 2 | `web/auth` |
| 1 | `web/dashboard/whatsapp` |
| 1 | `web/suporte` |

## Top 20 arquivos (producao)
| `any` | Arquivo |
|---:|---|
| 117 | `apps/web/app/lib/api.ts` |
| 36 | `apps/api/src/modules/schedule/schedule.service.ts` |
| 27 | `apps/api/src/modules/jobs/recruitment.service.ts` |
| 24 | `apps/api/src/modules/auth/auth.controller.ts` |
| 20 | `apps/api/src/modules/time-track/time-closing.controller.ts` |
| 19 | `apps/api/src/modules/time-track/time-closing.service.ts` |
| 17 | `apps/api/src/modules/communication/whatsapp/whatsapp.provider.ts` |
| 17 | `apps/api/src/modules/schedule-hub/requests/requests.service.ts` |
| 16 | `apps/api/src/modules/finance/platform-finance.service.ts` |
| 16 | `apps/api/src/modules/support/support-authorization.service.ts` |
| 14 | `apps/api/src/modules/accounting/accounting-hub.service.ts` |
| 14 | `apps/api/src/modules/communication/communication.service.ts` |
| 14 | `apps/api/src/modules/dashboard/dashboard.repository.ts` |
| 14 | `apps/api/src/modules/time-track/time-track.service.ts` |
| 13 | `apps/web/app/[tenant]/dashboard/escalas/_components/closing-view.tsx` |
| 12 | `apps/api/src/modules/accounting/accounting-rules.service.ts` |
| 12 | `apps/api/src/modules/users/users.controller.ts` |
| 11 | `apps/api/src/modules/support/platform-support.controller.ts` |
| 10 | `apps/api/src/modules/employees/employees-import.service.ts` |
| 10 | `apps/api/src/modules/employees/employees.service.ts` |

## Plano de reducao

**Meta do escopo (L7):** zero `any` nos 5 modulos criticos e reducao de 50% no resto. Trabalho de agente, por ondas; cada onda termina com `tsc` sem erros e testes verdes.

| Onda | Escopo | Meta | Como |
|---|---|---|---|
| A | `time-track`, `finance`, `auth`, `payroll`, `privacy` (186 hoje) | **0** | Tipos do Prisma (`Prisma.<Model>GetPayload<...>`) no lugar de objetos soltos; DTOs com `class-validator` nos `@Body()`/`@Query()` (o `ValidationPipe` global so valida classes); `JwtUser` para `request.user`; `unknown` com estreitamento em vez de `any` nos `catch` |
| B | `employees`, `accounting`, `schedule`/`schedule-hub` (unificar antes, item L5), `jobs`, `support` | -60% | Mesmas tecnicas; os servicos grandes (`schedule.service.ts`, `recruitment.service.ts`) ganham tipos junto da quebra de arquivo (L8) |
| C | `web/lib/api.ts` (maior arquivo isolado) | **0** | Gerar os tipos a partir do OpenAPI da API (`/api/docs-json`, ex.: `openapi-typescript`) e usar nas respostas de `api.*`, em vez de `request<any>` |
| D | restante da API e do web | -50% | Oportunista: ao mexer no arquivo, remova os `any` dele |
| - | testes (`*.spec.ts`) | sem meta | Baixa prioridade: mocks de Prisma costumam usar `as never` ou `any` |

### Travas para nao piorar (fazer junto da onda A)
1. **Regra de lint** `@typescript-eslint/no-explicit-any: error` com `overrides` so nos diretorios das ondas concluidas (liga por modulo, sem quebrar o resto).
2. **Catraca no CI:** script que conta `any` com o mesmo regex e falha se o total subir em relacao a um arquivo de linha de base versionado; a linha de base so pode diminuir.
3. `noImplicitAny` por modulo via `tsconfig` de referencia, conforme cada onda fecha.

### Riscos
- Trocar `any` por tipos reais em codigo sem testes pode expor erros que hoje passam em silencio; por isso cada onda comeca pelos testes de caracterizacao do modulo (itens Q3 a Q5 do escopo).
- `Decimal` do Prisma: nas saidas ja e convertido para `number` pelo `ResponseInterceptor`; ao tipar, mantenha essa fronteira explicita.
