# Robô de API (banco de teste)

Diferente do robô de tela (`tools/robo-qa`, só leitura), este **cria e exclui registros de verdade**. Por isso só roda contra API local ligada ao banco de teste.

## O que testa
- Autenticação: senha errada, corpo vazio, tipos errados, injeção, sem token, token lixo, JSON quebrado.
- Usuários e Funcionários: criar, ler, editar (e confere no banco), bloquear, arquivar, excluir, excluir de novo, duplicidade, validações, nome gigante, byte nulo, ID inválido, campo desconhecido.
- Perfis: GESTOR e FUNCIONARIO tentam o que não podem (esperado 403).
- Corrida: 8 cadastros simultâneos do mesmo e-mail/CPF devem criar só 1.
- Empresa B tenta ler, editar e excluir dados da empresa A (esperado 403/404) e não pode aparecer nas listas.
- Cálculos de folha: o simulador POST /accounting/rules/simulate roda 90 casos (salários de 1 mínimo a R$ 12 mil, horas extras, noturno, faltas, dependentes) e cada resultado é comparado com um **oráculo independente** (oracle/folha-clt-2026.mjs, escrito só a partir de docs/CLT_PAYROLL_RULES_2026.md). Também confere: perfis sem acesso levam 403, entradas inválidas levam 400 e regras fiscais mal formadas (INSS fora de ordem, FGTS de 90%, hora extra abaixo da CLT) são recusadas.
- Regra global: qualquer resposta 5xx vira defeito, com a chamada, o `requestId` e o arquivo provável do código.
- No fim apaga tudo o que criou e avisa se sobrou algo.

## Como rodar
1. PostgreSQL de teste na porta 5436 (`docker-compose.test.yml` ou instalação local) e `.env.test` (cópia de `.env.test.example`).
2. `npm run test:db:setup` e `npm run test:db:seed`.
3. Subir a API com o `.env.test` (porta 3333) e depois:

```powershell
$env:ROBO_API_BANCO_DE_TESTE = "sim"
node tools/robo-api/robo-api.mjs            # ou --url http://localhost:3333
```

Relatório em `tools/robo-api/relatorios/*.md` e `.json`. Código de saída 1 se houver defeito.

## Travas
Recusa rodar se a URL não for local, se `NODE_ENV=production`, se `ROBO_API_BANCO_DE_TESTE` não for `sim` ou se o `.env.test` não apontar para a porta 5436.
Os pontos de partida (rotas, perfis e e-mails do seed) foram escritos a partir do código, mas **ainda não foram executados**.

## Oráculo de folha sem banco
O mesmo oráculo roda como teste unitário, sem API nem banco: 
px vitest run --config vitest.config.ts tests/unit/payroll. Compara o motor de folha em 2.000+ casos, confere as tabelas embutidas (INSS 2026, IRRF 2026 e redução da Lei 15.270/2025) e as propriedades gerais (INSS crescente e contínuo, IRRF nunca decresce com o salário, líquido = bruto − INSS − IRRF, FGTS 8% sem descontar do empregado).
