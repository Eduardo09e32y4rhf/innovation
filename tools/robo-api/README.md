# Robô de API (banco de teste)

Diferente do robô de tela (`tools/robo-qa`, só leitura), este **cria e exclui registros de verdade**. Por isso só roda contra API local ligada ao banco de teste.

## O que testa
- Autenticação: senha errada, corpo vazio, tipos errados, injeção, sem token, token lixo, JSON quebrado.
- Usuários e Funcionários: criar, ler, editar (e confere no banco), bloquear, arquivar, excluir, excluir de novo, duplicidade, validações, nome gigante, byte nulo, ID inválido, campo desconhecido.
- Perfis: GESTOR e FUNCIONARIO tentam o que não podem (esperado 403).
- Corrida: 8 cadastros simultâneos do mesmo e-mail/CPF devem criar só 1.
- Empresa B tenta ler, editar e excluir dados da empresa A (esperado 403/404) e não pode aparecer nas listas.
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
