# Defeitos abertos da suite de QA (21/10/2026)

Origem: `tests/qa/` (agora rodando no CI pela configuracao principal do vitest). Cada caso descreve o comportamento **correto** e esta marcado com `it.fails`: a suite fica verde **enquanto o defeito existe** e passa a falhar quando alguem o corrige. Nesse momento, adicione o codigo ao `FIXED_BUGS` (`tests/qa/employees/helpers.ts`) para o caso virar regressao. O defeito `S-04` ja foi corrigido e foi promovido assim (52 casos).

- **31 defeitos com codigo, 152 casos** (10 de seguranca `S-*`, 21 de qualidade `Q-*`/`QA-*`). O vitest reporta 152 "esperados falhar" no total.
- A suite testa os **servicos com repositorio simulado** (sem banco e sem HTTP): confirma a regra no codigo, nao o comportamento de ponta a ponta. Reproduza no ambiente de testes antes de priorizar.
- Os de seguranca merecem triagem imediata e entram na frente H1 do escopo: S-01 (criar administrador via `accessProfile`), S-02 (CPF consultado globalmente, revela CPF de outra empresa), S-03 e S-05 (perfis agindo sobre contas de perfil superior), S-06 (lote de 10.000 ids com bcrypt em serie), S-07 (injecao de formula em CSV), S-08 (gestor recebe salario e CPF da equipe), S-09, S-11, S-13.
- `QA-01` (parametros de paginacao invalidos chegam ao servico) e `Q-07`/`Q-08`/`Q-16` (validacao de entrada) coincidem com a frente H6 (paginacao e entradas invalidas).

## Seguranca (`S-*`)
| Codigo | Casos | Exemplo (comportamento correto esperado) | Arquivo |
|---|---:|---|---|
| S-01 | 2 | criar funcionário com accessProfile=ADMIN não cria administrador sem checar quem pediu | `employees/02-hacker.spec.ts, employees/03-importacao.spec.ts` |
| S-02 | 3 | CPF é consultado só dentro da empresa (hoje a busca é global e revela CPF de OUTRA empresa) | `employees/02-hacker.spec.ts, employees/03-importacao.spec.ts` |
| S-03 | 14 | ADMIN NÃO pode rebaixar/reaproveitar usuário DEV pelo e-mail | `employees/02-hacker.spec.ts` |
| S-05 | 28 | ADMIN NÃO pode terminate no cadastro ligado a conta CEO | `employees/02-hacker.spec.ts` |
| S-06 | 11 | bulk com 10.000 ids é recusado (cada item faz bcrypt custo 12 em série) | `employees/02-hacker.spec.ts` |
| S-07 | 7 | nome começando com fórmula é neutralizado (#0: "=HYPERLINK(\"http://evi) | `employees/03-importacao.spec.ts` |
| S-08 | 2 | GESTOR não recebe salário, conta bancária e CPF da equipe na listagem | `employees/02-hacker.spec.ts` |
| S-09 | 1 | identificar "a minha ficha" por e-mail pode trazer a ficha de outra pessoa (findByUserId usa OR com e-mail) | `employees/02-hacker.spec.ts` |
| S-11 | 1 | importar 50 pessoas com acesso respeita o limite de licenças contratadas (3) | `employees/03-importacao.spec.ts` |
| S-13 | 6 | redefinir senha em lote grava registro de auditoria (quem fez, em quem, quando) | `employees/04-analista-de-produto.spec.ts` |

## Qualidade (`Q-*`, `QA-*`)
| Codigo | Casos | Exemplo (comportamento correto esperado) | Arquivo |
|---|---:|---|---|
| Q-02 | 1 | editar um funcionário "Em admissão" (status=ONBOARDING) é aceito pela API de edição | `employees/04-analista-de-produto.spec.ts` |
| Q-03 | 28 | CEO pode rebaixar/reaproveitar usuário ADMIN pelo e-mail | `employees/02-hacker.spec.ts, employees/04-analista-de-produto.spec.ts` |
| Q-04 | 1 | desligar duas vezes não gera dois ASO demissionais | `employees/04-analista-de-produto.spec.ts` |
| Q-05 | 1 | desligar via edição (status=TERMINATED) também bloqueia o login do funcionário | `employees/04-analista-de-produto.spec.ts` |
| Q-06 | 1 | se dar acesso ao painel falha, o cadastro não fica pela metade (e o RH consegue tentar de novo) | `employees/04-analista-de-produto.spec.ts` |
| Q-07 | 2 | rejeita salário negativo | `employees/04-analista-de-produto.spec.ts` |
| Q-08 | 8 | rejeita nome vazio | `employees/04-analista-de-produto.spec.ts` |
| Q-09 | 1 | CSV salvo em Windows-1252 (padrão do Excel BR) mantém os acentos ("José", "João") | `employees/03-importacao.spec.ts` |
| Q-10 | 1 | campo entre aspas com quebra de linha é lido como um único campo | `employees/03-importacao.spec.ts` |
| Q-11 | 1 | e-mail que já tem usuário: NÃO devolve uma senha temporária que não funciona | `employees/03-importacao.spec.ts` |
| Q-12 | 1 | confirmar duas vezes ao mesmo tempo (duplo clique) importa uma única vez | `employees/03-importacao.spec.ts` |
| Q-13 | 1 | a transação de importação tem timeout explícito (padrão do Prisma é 5 s e cada senha leva ~250 ms) | `employees/03-importacao.spec.ts` |
| Q-14 | 1 | uma linha que falha dentro da transação não pode "importar" as demais só no relatório (Postgres aborta a transação) | `employees/03-importacao.spec.ts` |
| Q-15 | 1 | cabeçalho sem a coluna CPF devolve mensagem de cabeçalho, não um erro por linha | `employees/03-importacao.spec.ts` |
| Q-16 | 4 | CPF com letras/lixo no meio não é "limpo" e aceito: "529.982.247-25x" | `employees/03-importacao.spec.ts` |
| Q-17 | 2 | nenhuma linha válida é descartada quando existem linhas inválidas (300 linhas, ~35% inválidas) | `employees/03-importacao.spec.ts` |
| Q-18 | 2 | empresa sem registro de assinatura (contrato manual/legado) não fica travada em 1 licença | `employees/04-analista-de-produto.spec.ts` |
| Q-19 | 1 | listagem de ADMIN com fichas de DEV escondidas ainda devolve a página cheia (50 de 50) | `employees/04-analista-de-produto.spec.ts` |
| Q-20 | 1 | gestor do funcionário não pode ser ele mesmo, nem alguém de outra empresa | `employees/04-analista-de-produto.spec.ts` |
| Q-21 | 1 | data de desligamento anterior à admissão é recusada | `employees/04-analista-de-produto.spec.ts` |
| QA-01 | 17 | page="abc" chega ao serviço como inteiro entre 1 e 1.000.000 | `employees/01-qa-funcional.spec.ts` |
