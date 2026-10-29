# Relatorio de testes - Pagamentos e webhooks (Onda 0)

Data: 2026-10-29. Origem: `docs/auditoria/04-pagamentos-e-webhooks.md`. Escopo: `apps/api/src/modules/finance/**`.

## Documentacao oficial: o que foi lido (leia primeiro)

`docs.asaas.com` e `www.mercadopago.com.br` NAO resolvem na rede da sessao (`getaddrinfo ENOTFOUND` no WebFetch, 3 URLs). Foi usado WebSearch (resumos). Marcadores:

| Regra | Fonte | Marcador |
|---|---|---|
| `PAYMENT_UPDATED` = "alteracao no vencimento ou valor de cobranca existente" (nao e "voltou a pendente") | https://docs.asaas.com/docs/webhook-para-cobrancas e /docs/payment-events | VIA BUSCA |
| Webhook traz o objeto completo da cobranca (inclui `status`); atributos novos podem aparecer | https://docs.asaas.com/docs/payment-events | VIA BUSCA (nome/valores de `payment.status` NAO lidos na pagina; usados os valores do proprio codigo/conciliacao: PENDING, OVERDUE, RECEIVED, CONFIRMED, RECEIVED_IN_CASH, DELETED, REFUNDED...) |
| `PAYMENT_RESTORED` | mesma pagina | NAO VERIFICADO (a busca nao o listou) |
| Idempotencia por id do evento; token no cabecalho | https://docs.asaas.com/docs/como-implementar-idempotencia-em-webhooks | NAO VERIFICADO nesta rodada (nao alterado) |
| MP: `x-signature` `ts=...,v1=...`, validacao com `x-request-id` + `data.id` + segredo; sample com `X-Socket-Timeout: 22000` | https://www.mercadopago.com.br/developers/en/docs/checkout-api-v2/notifications | VIA BUSCA |
| MP: template do manifesto, unidade de `ts`, politica de reentrega e se ha janela exigida para `ts` | https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks | NAO VERIFICADO |
| Asaas: `POST /v3/payments/{id}/bankSlip/refund` para boleto; devolve link para o pagador informar a conta; exige `PAYMENT_REFUND:WRITE` | https://docs.asaas.com/reference/estornar-boleto | VIA BUSCA (corpo/resposta NAO lidos) |
| MP `POST /v1/payments/{id}/refunds` com `X-Idempotency-Key` | https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-api-payments/create-refund/post | NAO VERIFICADO nesta rodada (codigo nao alterado) |

## PAG-A3 - `PAYMENT_UPDATED` reabria fatura vencida e desfazia `deletedAt`

- Problema: `statusFromEvent` mapeava `PAYMENT_UPDATED`/`PAYMENT_RESTORED`/`PAYMENT_CREATED` para `OPEN` e a gravacao fazia `deletedAt: null`.
- Correcao (`asaas-webhook.processor.ts`, novo `resolveStatus`): para CREATED/UPDATED/RESTORED o estado vem de `payment.status`. Regras: `OVERDUE` fica vencida; `PENDING` so reabre uma vencida se o novo vencimento for hoje ou futuro (Sao Paulo); fatura `CANCELED`/com `deletedAt` so volta com `PAYMENT_RESTORED`; fatura paga nunca regride; sem `payment.status` preserva o estado local; `deletedAt` so e limpo por `PAYMENT_RESTORED` e so e preenchido por `PAYMENT_DELETED`.
- Testes: `asaas-webhook-state.spec.ts` (8 casos A3). Antes: 4 falhavam (vencida->OPEN, UPDATED atrasado, ressurreicao, sem status). Depois: todos passam.

## PAG-A2 - pagamento reativava a empresa sem checar motivo nem outras faturas

- Problema: `PAID` gravava `ACTIVE/isActive/suspensionReason:null` incondicionalmente (Asaas e Mercado Pago).
- Correcao: `payment-access.ts#companyDataAfterPayment`, usado pelo processador Asaas e pelo novo `mercadopago-payment-sync.service.ts`. Nao reativa quando: conta cancelada (`billingStatus CANCELED` ou `status CANCELLED`); bloqueada por motivo fora de {inadimplencia, pagamento_cancelado_ou_estornado, trial_aguardando_pagamento, aguardando_primeiro_pagamento, aguardando_pagamento}; ou resta outra fatura `OVERDUE` ou `OPEN` com vencimento anterior a hoje. A fatura continua sendo baixada como paga.
- Ponto extra (aviso do coordenador, `01a-endpoints.md` item 7): `GET /finance/company/status` e `GET /faturas/empresa/status` (`PlatformFinanceService.getCompanyBilling`) gravavam `PAID` e ativavam a empresa. Cenario confirmado no codigo: o cliente NAO consegue forcar "pago" (a funcao consulta o gateway server-to-server pelo `asaasPaymentId`/`mpPaymentId` gravado e so reflete o status real). Mas a gravacao no GET ignorava as regras acima: uma empresa suspensa por seguranca, ou cancelada, com uma fatura antiga paga no gateway era reativada por qualquer GET do admin da empresa (a condicao era justamente `company.status !== 'ACTIVE'`). Correcao: o GET agora e somente leitura, devolve `invoice.gatewayPaid` (gateway ja mostra pago, baixa pendente) e nao escreve. Ver PAG-A1 para a baixa por conciliacao sob demanda.
- Testes: `asaas-webhook-state.spec.ts` (6 casos A2), `mercadopago-webhook-state.spec.ts` (3 casos A2), `company-billing-readonly.spec.ts` (2 casos; qualquer escrita falha o teste). Antes: 5 + 2 + 2 falhavam. Depois: todos passam. `webhook-reactivation.spec.ts` ajustado so para o novo mock (`company.findUnique`, `count`); suas 3 asserts originais permanecem.

## PAG-M2 - webhooks simultaneos do Mercado Pago

- Problema: leitura de `status` seguida de `update`; duas entregas descontavam dois ciclos de cupom e notificavam duas vezes.
- Correcao: `MercadoPagoPaymentSyncService.apply` faz a transicao dentro de `$transaction` com `updateMany({ where: { id, status: { not: 'PAID' } } })` e checa `count === 1`; so o vencedor atualiza empresa, desconta cupom e notifica; o perdedor responde `duplicate`. O controller passou a delegar a este servico (mesma logica usada pela conciliacao).
- Teste: `Promise.all` de dois webhooks identicos -> ciclo do cupom 3->2 (antes 3->1) e 1 notificacao (antes 2); exatamente uma resposta `duplicate`. Reentrega sequencial continua idempotente.

## Comandos e saida (A3, A2, M2)

- Vermelho inicial: `npx vitest run apps/api/src/modules/finance/asaas-webhook-state.spec.ts` -> `Tests 8 failed | 6 passed (14)`; `mercadopago-webhook-state.spec.ts` -> `3 failed | 2 passed`; `company-billing-readonly.spec.ts` -> `2 failed`.
- Final: `npx vitest run apps/api/src/modules/finance apps/api/src/modules/accounting tests/security tests/contract` -> `Test Files 58 passed (58)`, `Tests 509 passed | 3 expected fail (512)`; `npx tsc --noEmit -p apps/api` -> sem erros.

## Fluxos que NAO mudaram (conferidos)

Token `asaas-access-token` e HMAC do MP (`webhook-auth.spec.ts` verde); idempotencia por id do evento Asaas (controller intocado); reembolso em centavos (`payment-refund*` intocado, verde); teste de 30 dias com cupom que so estende (`trial-lifecycle.spec.ts`, `trial-conversion.spec.ts` verdes); fatura paga nao regride por OPEN/OVERDUE.

## Riscos e decisoes de negocio

- `pagamento_cancelado_ou_estornado` foi mantido como motivo reativavel (lista sugerida pela auditoria). Se o negocio quiser que apos chargeback so o suporte reative, remova-o de `PAYMENT_REACTIVATION_REASONS`.
- Empresa bloqueada sem `suspensionReason` (null) e `status != ACTIVE` NAO e reativada (conservador).
- Cartao `CONFIRMED` continua contando como pago (M5): NAO alterado, decisao de negocio.
