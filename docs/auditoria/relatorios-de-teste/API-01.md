# API-01: `throw new Error` vira 500 (Onda 1, grupo G2)

## Problema
`throw new Error` em codigo alcancavel por rota vira 500 no filtro global. Confirmado no codigo: calculadora de rescisao (`termination.calculator.ts`), `parseDay` (`labor-dates.ts`), `lookupCnpj`, webhook Asaas, respostas incompletas de provedor em `platform-finance.service.ts` e `asaas-fiscal.service.ts`. Os `compute()` da rescisao ja embrulhavam em 400, mas escondiam o tipo certo (422) e `parseDay` fora do `try` virava 500.

## Documentacao
RFC 9110 (https://www.rfc-editor.org/rfc/rfc9110.html#name-status-codes): 4xx = erro do cliente, 5xx = servidor, 502/503 = falha de upstream/indisponibilidade temporaria. Marcador: **NAO VERIFICADO** (www.rfc-editor.org bloqueado na rede da sessao, ENOTFOUND; conhecimento previo). Nenhuma regra de dinheiro/seguranca foi alterada, so o tipo da excecao.

## Conversoes
- `parseDay` data invalida: 400. Desligamento anterior a admissao: 422. Salario invalido e `contractEndDate` ausente: 400. `termination.service` agora repassa `HttpException` (antes forcava tudo em 400).
- `lookupCnpj` provedor com erro: 503 (antes 409 por cair no catch).
- Webhook Asaas sem conseguir persistir o evento: 503 (provedor reenvia). Logica de pagamento intacta.
- `platform-finance.service.ts` (3) e `asaas-fiscal.service.ts` (1): resposta incompleta do provedor: 502 (BadGateway).

## Mantidos como Error (justificados no teste `ALLOWED`)
Boot/config, crypto, mail (capturado em `send`), workers Bull/cron (recruitment-workflow, whatsapp, asaas-webhook.processor, mercadopago-payment-sync), `vacations.repository` (convertido em 400 pelo service), holidays (capturado), `jobs-storage` (chave vem do banco), `finance-notification`, `itf-barcode`. `auth/totp.ts` e `auth.module.ts` sao do grupo G1. As "32 rotas" do relatorio 01b sao aproximacao por cima: a maioria alcanca esses `Error` apenas dentro de try/catch ou fila.

## Arquivos
labor-dates.ts, termination.calculator.ts, termination.service.ts, platform.service.ts, finance/asaas-webhook.controller.ts, platform-finance.service.ts, asaas-fiscal.service.ts; testes `tests/contract/http-status-contract.spec.ts`, `http-status-platform.spec.ts`, `http-status-finance.spec.ts`.

## Resultados
Antes: 6 de 7 falhas no contrato + 1 na plataforma + 1 no webhook. Depois: `npx vitest run tests/contract tests/security tests/unit apps/api/src/modules/{payroll,platform,finance}`: 113 arquivos, 1069 passaram (3 expected fail preexistentes). `npx tsc --noEmit -p apps/api`: sem erros.

## Riscos
Clientes que tratavam 500 como retry nas rotas convertidas passam a ver 4xx/502/503; o webhook continua 5xx em falha transitoria (reenvio). O teste de regressao falha se surgir novo `throw new Error` fora da lista.
