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

## PAG-A1 - Mercado Pago fora da conciliacao e janela de 5 min do `ts`

- Problema: `payment-reconciliation.service.ts` so filtrava `provider: 'ASAAS'`; webhook MP com `ts` > 300 s recebia 403.
- Documentacao: janela exigida para `ts` e politica de reentrega do MP: NAO VERIFICADO (pagina bloqueada; a busca so confirmou `x-signature` e `X-Socket-Timeout: 22000`). Como nao ha exigencia confirmada, a decisao conservadora foi NAO afrouxar a janela (os testes de seguranca existentes `webhook-auth.spec.ts` e `mercadopago.service.spec.ts` continuam exigindo 5 min) e garantir a recuperacao por outro caminho.
- Correcao:
  - `PaymentReconciliationService.reconcile` agora roda Asaas e Mercado Pago. Para cada fatura MP `OPEN`/`OVERDUE` (ate 90 dias, `take` 300) consulta o gateway (`findPaymentForInvoice`: por `mpPaymentId` ou pela referencia `inv:<id>`) e, se aprovado/estornado, aplica pelo MESMO `MercadoPagoPaymentSyncService` do webhook (mesmas regras de reativacao A2, cupom e notificacao uma unica vez). O cron existente (`10 */6 * * *`) e `POST /finance/reconciliation/run` passam a cobrir o MP.
  - Novo `POST /finance/company/sync-payment` (admin da propria empresa): baixa sob demanda, por conciliacao server-to-server, apenas as faturas da empresa do token. Substitui a escrita que o GET de status fazia; o front precisa chamar este POST apos o retorno do checkout (fora do meu escopo; hoje o GET devolve `invoice.gatewayPaid` para a tela saber que ha baixa pendente).
  - Janela do `ts` mantida em 300 s por padrao; segue configuravel por `MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS`.
- Testes: `mercadopago-reconciliation.spec.ts` (7). Antes: fatura MP vencida com pagamento aprovado no gateway nao era baixada (2 falhas de conciliacao). Depois: baixa PAID, `mpPaymentId` gravado, 1 notificacao, reativacao pelas regras de A2, rodar duas conciliacoes em paralelo notifica uma vez; pagamento `pending`/inexistente nao altera a fatura; `ts` de 20 min rejeitado por padrao e aceito com a variavel em 3600.
- Risco/pendente: cron de 6 h significa ate 6 h de atraso se o webhook for perdido (o POST `sync-payment` e o botao imediato). `.env.example` ainda diz "padrao 300": correto.

## PAG-M4 - estorno total confirmado nao afetava a empresa (e codigo morto)

- Problema: `refunds.reconcile` so gravava `refundedAmount/refundStatus`; os ramos `PAYMENT_REFUNDED`/`PAYMENT_REFUND_IN_PROGRESS` de `statusFromEvent` e `PAYMENT_EVENT_MAP` nunca executavam (retorno antecipado).
- Decisao sobre o ESTADO DA FATURA (importante): NAO foi trocado `status` de `PAID` para `CANCELED`/novo `REFUNDED`. Motivo, verificado no codigo: `accounting/platform-ledger.service.ts:25` (razao contabil) e `platform-revenue-report.service.ts:35` selecionam recebimentos por `status: 'PAID'` + `paidAt`, e calculam a devolucao por `refundedAmount`/`PaymentRefund`. Mover a fatura para fora de `PAID` faria o recebimento desaparecer do mes em que foi pago (alterando meses ja fechados) e deixaria a devolucao sem recebimento correspondente. O modulo `accounting` esta fora do meu escopo. O estado "estornada" continua sendo `refundStatus = 'REFUNDED'` (ja usado pelo PDF "REEMBOLSADA" e pela NFS-e). Nenhuma migration foi criada. Proximo passo possivel, se o negocio quiser um status proprio: enum `REFUNDED` + ajustar ledger e relatorio no mesmo PR.
- Correcao: em `PaymentRefundService.reconcile`, na transicao unica para `REFUNDED` (fatura `PAID`), `suspendAfterFullRefund` aplica a regra de bloqueio por pagamento revertido (mesmos campos do chargeback: `billingStatus PAST_DUE`, `status SUSPENDED`, `isActive false`, `suspensionReason pagamento_cancelado_ou_estornado`) e audita `COMPANY_SUSPENDED_BY_REFUND`. Condicoes conservadoras: so empresa ATIVA e nao cancelada; nao suspende se existir pagamento posterior vigente (estorno de fatura antiga); nao repete na reconciliacao seguinte. Vale para Asaas e Mercado Pago (ambos chamam `reconcile`).
- Limpeza: removidos os ramos mortos `PAYMENT_REFUNDED`/`PAYMENT_REFUND_IN_PROGRESS` de `statusFromEvent` e `PAYMENT_EVENT_MAP`; `recognized` passou a listar esses eventos explicitamente (continuam `PROCESSED`, nao `IGNORED`).
- Testes: `payment-refund-access.spec.ts` (6). Antes: estorno total nao suspendia (2 falhas); depois: suspende; parcial, fatura antiga, conta cancelada/suspensa por outro motivo e repeticao nao alteram a empresa; fatura segue `PAID` com `refundedAmount 100`.
- Decisao de negocio pendente: suspender automaticamente a empresa em estorno total (inclusive reembolso comercial decidido pela plataforma) foi aplicado porque foi pedido seguir as regras de bloqueio; se reembolso de cortesia nao deve bloquear, restrinja a chargeback/estorno iniciado pelo cliente.

## PAG-M3 - reembolso de boleto no Asaas (`/refund` x `/bankSlip/refund`) - NAO ALTERADO

- Documentacao: https://docs.asaas.com/reference/estornar-boleto - a pagina nao abre na sessao (ENOTFOUND). Pela busca (VIA BUSCA, resumo da pagina oficial) o endpoint de boleto e `POST /v3/payments/{id}/bankSlip/refund`, nao serve para cartao/Pix, exige `PAYMENT_REFUND:WRITE` e NAO devolve o dinheiro direto: devolve um link em que o pagador informa conta bancaria e documentos. Corpo da requisicao, formato da resposta e como o estorno aparece depois em `refunds` (status) NAO foram lidos: NAO VERIFICADO / depende do sandbox.
- Decisao: comportamento mantido (`asaas.service.ts#refundPayment` e `payment-refund.service.ts` intocados), por duas razoes: a regra pedida exige confirmacao na pagina oficial e ela nao foi lida; e o fluxo de boleto muda o ciclo de vida da operacao (fica pendente ate o pagador preencher o link, e o link precisa ser repassado ao cliente), o que nao pode ser feito as cegas num fluxo de dinheiro.
- O que fazer quando houver acesso: com a chave do sandbox, estornar um boleto pago de teste por `/refund` (confirmar o 400) e por `/bankSlip/refund` (ver o corpo da resposta e o `status` em `GET /payments/{id}/refunds`); entao rotear por `invoice.billingType === 'BOLETO'`, guardar o link em `PaymentRefund` e manter a operacao `PENDING` ate `DONE`.
- Teste: nenhum novo (sem alteracao). Os testes de reembolso existentes seguem verdes.

## Validacao final

| Cenario | Resultado esperado | Resultado |
|---|---|---|
| Fatura vencida recebe `PAYMENT_UPDATED` (status OVERDUE ou PENDING com vencimento passado) | continua `OVERDUE` | passa |
| Prorrogacao real (PENDING, vencimento futuro) | reabre | passa |
| Fatura removida recebe `PAYMENT_UPDATED` | segue `CANCELED` com `deletedAt` | passa |
| Empresa cancelada recebe pagamento | fatura `PAID`, empresa intacta | passa (Asaas e MP) |
| Duas faturas vencidas, uma paga | empresa nao reativa | passa (Asaas e MP) |
| Webhook MP com `ts` antigo | 403; conciliacao baixa o pagamento | passa |
| Estorno total confirmado | `refundStatus REFUNDED`, empresa suspensa (regras acima), fatura `PAID` | passa |
| Dois webhooks MP com `Promise.all` | 1 desconto de ciclo, 1 notificacao | passa |
| GET de status com pagamento aprovado no gateway | nenhuma escrita | passa |

Execucao final: `npx vitest run apps/api/src/modules/finance apps/api/src/modules/accounting tests/security tests/contract` -> 60 arquivos passam, 522 testes passam | 3 expected fail (pre-existentes); `npx tsc --noEmit -p apps/api` -> sem erros.
