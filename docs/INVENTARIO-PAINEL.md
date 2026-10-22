# Inventário do painel (`apps/web/app/[tenant]/dashboard`)

Gerado em 21/10/2026 para o item **L3** de `docs/ESCOPO-PRODUCAO-V1.md`. **Nada foi movido ou apagado por este inventário**: ele só registra evidência e recomenda. Nenhuma ação destrutiva deve ser feita sem repetir as buscas da coluna "Referências".

## 1. Fonte da verdade da navegação

A navegação oficial é `_components/shell-v2/nav-config.ts`. Ela só lista:
`dashboard`, `employees`, `escalas`, `vacations`, `management`, `jobs` (+ `jobs/internas`), `users`, `faturas`, `settings`, `support`, `platform`, `contabilidade`.

Ficam **fora do menu**: `colaboradores`, `escala`, `ponto`, `time-track`, `rh`, `chat`, `media`, `finance`, `performance`, `reports`.

Existem ainda duas definições paralelas da mesma navegação: `_components/dashboard-sidebar.tsx` (não é importado por nenhum arquivo; é código morto) e `_components/tour/tour-content.ts` (textos do tour; só aponta para `employees`, `escalas` e `faturas`).

## 2. Resultado por pasta

Legenda de linhas: tamanho dos arquivos `.ts/.tsx` da pasta.

| Pasta | Conteúdo | Quem referencia | API que chama | Recomendação |
|---|---|---|---|---|
| `employees` | 7 arquivos, 1.563 linhas: lista (274), cadastro/edição (910), importação (91) | `shell-v2/nav-config.ts:30`, `dashboard-sidebar.tsx:21`, `dashboard/page.tsx:217-227`, `jobs/[jobId]/page.tsx:151`, `management/onboarding/page.tsx:97`, tour, teste `tests/unit/web/employees-access-result.spec.ts` | `api.employees.*` (list, dossier, bulkAccess, validateImport, confirmImport) | **MANTER** (rota canônica de funcionários) |
| `colaboradores` | 1 arquivo, 2 linhas: redireciona para `/employees` | Nenhuma | Nenhuma | **REMOVER** + regra `redirects()` `/:tenant/dashboard/colaboradores` → `employees` |
| `escalas` | 28 arquivos, 2.729 linhas. `page.tsx` (136) é o hub com `?view=` (`hoje`, `calendario`, `ponto`, `solicitacoes`, `aprovacoes`, `modelos`, `fechamento`, `relatorios`) | `nav-config.ts:31`, `dashboard-sidebar.tsx:22`, `dashboard/page.tsx:219-229`, `employee-dashboard.tsx:64-110`, `employees/page.tsx:114`, `management/onboarding/page.tsx:99`, tour | `/escalas/*`, `/schedules*` e `api.timeClosing.*` (via `_lib/hub-api.ts`) | **MANTER** como destino único de escala, ponto e fechamento |
| `escalas/{calendario,documentos,equipe,fechamento,ocorrencias,ponto,regras,trocas}` | 8 stubs de 5 linhas que só redirecionam para `?view=`: calendario→calendario, ponto→ponto, fechamento→fechamento, documentos→fechamento, equipe→modelos, regras→modelos, ocorrencias→aprovacoes, trocas→solicitacoes | Nenhuma | Nenhuma | **REMOVER** + 8 regras em `redirects()` (mapeamento ao lado) |
| `escala` (singular) | 1 arquivo, 18 linhas: redirecionamento no cliente para `escalas?view=calendario` | Nenhuma | Nenhuma | **REMOVER** + regra `redirects()` |
| `ponto` | 1 arquivo, 5 linhas: redireciona para `escalas?view=ponto` | Nenhuma | Nenhuma | **REMOVER** + regra `redirects()` |
| `time-track` | 5 stubs (25 linhas): `/`→ponto, `clock-in`→ponto, `closing`→fechamento, `occurrences`→aprovacoes, `rules`→modelos | **Testes:** `tests-e2e/flows/smoke.spec.ts:14,47`, `tests-e2e/tests/responsivo.spec.ts:21`, `tests/security/official-pdf-boundary.spec.ts:10` (este lê o **arquivo** `time-track/page.tsx` com `fs.readFileSync`) | Nenhuma | **REMOVER**, mas **só depois** de trocar os 3 testes para `escalas` (o de `official-pdf-boundary` deve apontar para `escalas/page.tsx`) + 5 regras em `redirects()` |
| `faturas` | 18 arquivos, 3.302 linhas. `page.tsx` (28) escolhe entre visão da plataforma (abas planos, cupons, assinaturas, ajustes fiscais) e a da empresa (`BancoView`, checkout, plano, licenças) | `nav-config.ts:37`, `ProtectedRoute.tsx:122`, `dashboard/layout.tsx:47-49`, `platform/page.tsx`, `platform/_hub/{configuracao,companies,dossie}-view.tsx`, `platform/finance/page.tsx:10`, tour | `api.faturas.*`, `api.platform.finance.*`, `/platform/plans`, `/coupons` | **MANTER** como tela única de cobrança |
| `finance` | 1 arquivo, 2 linhas: redireciona para `/dashboard` (**destino errado:** deveria ser `faturas`) | Nenhuma (a referência em `platform-nav-config.ts` era a rota `platform/finance`, outra) | Nenhuma | **REMOVER** (+ regra opcional para `faturas`) |
| `rh` | 1 arquivo, 2 linhas: redireciona para `management` | Nenhuma | Nenhuma | **REMOVER** + regra `redirects()` |
| `chat` | 1 arquivo, 2 linhas: redireciona para `whatsapp` | Nenhuma | Nenhuma | **REMOVER** (o módulo WhatsApp é congelado no L1) |
| `media` | 1 arquivo, 2 linhas: redireciona para `/dashboard` | Nenhuma | Nenhuma | **REMOVER** (não existe destino) |
| `performance` | 1 arquivo, 106 linhas. Tabela de avaliações com **dados fixos no código** (`const evaluations = [...]`) | Nenhuma | **Nenhuma** | **REMOVER** (é protótipo, não funcionalidade; fora do MVP) |
| `reports` | 1 arquivo, 59 linhas. Placeholder "Relatórios e BI" com cartões sem dados; o botão "Exportar CSV" não tem ação | Nenhuma | **Nenhuma** | **REMOVER** (a tela real é a visão `relatorios` dentro de `escalas`) |
| `overview.tsx` | 1 linha (`import React from 'react'`) | Nenhum importador (as ocorrências de "overview" no código são de outras funções de API) | Nenhuma | **REMOVER** (arquivo vazio) |
| `_components/dashboard-sidebar.tsx` | Definição antiga da navegação | **Nenhum importador** | Nenhuma | **REMOVER** (duplicata morta do `shell-v2`) |

## 3. Achados extras (rotas legadas fora da lista de 13 do L4)

| Rota | O que é | Quem ainda usa | Ação sugerida |
|---|---|---|---|
| `platform/finance` | Redirecionamento no cliente para `/dashboard/faturas` | `dashboard/page.tsx` (3 links: CEO, CONTABIL, DEV), `faturas/_assinaturas.tsx:621` | Trocar esses 4 links para `/dashboard/faturas` e remover a rota (+ `redirects()`) |
| `platform/accounting` | Redireciona para `/dashboard/contabilidade` | `platform-nav-config.ts` (atalho do hub) | Trocar o atalho para `/dashboard/contabilidade` e remover (cuidado: o layout da Plataforma libera a seção `accounting` ao perfil CONTABIL; manter essa liberação até remover) |
| `platform/proposals` e `platform/contracts` | `page.tsx` redireciona para o hub; `proposals/new` e `proposals/[id]` são páginas reais | Atalhos do hub e links internos (já atualizados para `?tab=comercial&sub=...`) | Ficam: pertencem aos módulos congelados pelo L1 |

## 4. Ordem segura de execução (onda 2)

1. **Testes primeiro:** trocar `/dashboard/time-track` por `/dashboard/escalas?view=ponto` em `tests-e2e/flows/smoke.spec.ts`, `tests-e2e/tests/responsivo.spec.ts` e `tests/security/official-pdf-boundary.spec.ts` (neste, apontar para `escalas/page.tsx`).
2. **Rede de proteção para favoritos:** acrescentar em `apps/web/next.config.js` (`redirects()`, já usado no L4) as regras das pastas removidas: `colaboradores`, `escala`, `ponto`, `time-track/*`, `escalas/{...}`, `rh`, `finance`, `chat`, `media` (use `/:tenant/dashboard/...` como origem).
3. **Remover** as pastas e arquivos marcados e rodar: `tsc` do web, `vitest` da raiz e o E2E.
4. **Prova:** `grep` sem nenhuma referência às rotas removidas fora do `next.config.js`.
5. **Fora do L3 (L7/L8):** `dashboard/page.tsx` (945 linhas) e `employees/new/page.tsx` (910 linhas) são candidatos à divisão por responsabilidade.

> Ressalva: `tests/e2e/` (Playwright local, ainda sem CI) e `tests-e2e/` (usado pelo workflow `e2e.yml`) são duas pastas de E2E distintas; a unificação é tratada no item Q2.
