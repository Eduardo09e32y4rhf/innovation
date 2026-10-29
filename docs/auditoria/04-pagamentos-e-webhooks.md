# 04 - Auditoria de pagamentos e webhooks (Asaas e Mercado Pago)

Data: 2026-10-29. Escopo: `apps/api/src/modules/finance`. Somente leitura do codigo; nenhum segredo foi lido ou impresso.

## 0. Limites da verificacao (leia primeiro)

- **WebFetch para `docs.asaas.com` e `www.mercadopago.com.br` falhou** (`getaddrinfo ENOTFOUND`: dominios fora da lista de rede liberada da sessao). Para validar em definitivo, libere esses dois dominios e rode de novo.
- A validacao abaixo usou **WebSearch**, que devolve resumos das paginas oficiais, nao o texto integral. Cada afirmacao de documentacao traz a URL de origem. Nao cheguei a ler as paginas na integra.
- **NAO consegui verificar** (pagina nao lida ou resumo ambiguo):
  - Ordem de entrega dos eventos Asaas: a FAQ cita "modo sequencial", mas nao consegui ler os outros modos. Nao confirmei se o webhook do sistema esta configurado como sequencial.
  - Template oficial do manifesto do Mercado Pago (`id:..;request-id:..;ts:..;`): as fontes encontradas foram de terceiros (blogs e PRs no GitHub) e do SDK. Nao li a pagina oficial.
  - Se o timestamp `ts` do `x-signature` do Mercado Pago vem em ms ou em s. O resumo da propria doc e inconsistente. O codigo aceita os dois.
  - Statuses oficiais do objeto de reembolso do Mercado Pago (`approved`, `in_process`, `rejected`). Nao encontrei a lista.
  - Se o Asaas oferece cabecalho de idempotencia na criacao de cobranca. Nao encontrei nada sobre isso.
  - Comportamento de `updatePendingPayments` e de `PAYMENT_OVERDUE` (quando dispara).
  - Prazos e regras de NFS-e do Asaas (so os nomes de evento do codigo; nao li a pagina de eventos de notas).
  - Sandbox do Asaas e do Mercado Pago, e paginacao do Asaas (`limit` maximo 100, `offset`).
- Todos os numeros de linha referem-se a `apps/api/src/modules/finance/` no estado atual do repositorio.

## 1. O que esta correto (conferido com a doc e o codigo)

| Item | Doc oficial | Codigo |
|---|---|---|
| Cabecalho do webhook Asaas `asaas-access-token`; validar sempre que houver token | https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook | `asaas-webhook.controller.ts:29,88-101` |
| Comparacao em tempo constante | A doc nao define; boa pratica | `asaas-webhook.controller.ts:103-108` usa `timingSafeEqual` (so vaza o tamanho, aceitavel) |
| Sem token configurado, webhook rejeitado (bypass so fora de producao com flag) | - | `asaas-webhook.controller.ts:89-97`; MP em `mercadopago-webhook.controller.ts:153-163` |
| Idempotencia pelo `id` do evento, salvar antes de responder 200 | https://docs.asaas.com/docs/como-implementar-idempotencia-em-webhooks (indice unico no id do evento, persistir antes do 200) | `asaas-webhook.controller.ts:36-56` (tabela `asaasWebhookEvent` + fila Bull) |
| Entrega "at least once" e retentativa quando nao-2xx | https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook | Evento `FAILED` reaberto no reenvio (`:58-63`); worker com 5 tentativas (`:68-77`) |
| Cabecalho `access_token` e `User-Agent` na API | docs.asaas.com (nao reconfirmado nesta rodada) | `asaas.service.ts:88-92` |
| Assinatura MP: HMAC-SHA256, `x-signature` com `ts` e `v1`, `data.id` em minusculas, segmentos ausentes omitidos, comparacao constante | Resumos de terceiros e do SDK oficial (ver secao 0) | `mercadopago.service.ts:214-231` |
| Webhook MP nao confia no corpo: reconsulta o pagamento na API | boa pratica oficial | `mercadopago-webhook.controller.ts:72` |
| `X-Idempotency-Key` no reembolso e na preferencia MP | https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-api-payments/create-refund/post | `mercadopago.service.ts:107,193-197` (chave = id da operacao) |
| Estorno Asaas: sem `value` = total; parcial com `value` | https://docs.asaas.com/reference/estornar-cobranca | `asaas.service.ts:183-188`, `payment-refund.service.ts:61` |
| Calculo em centavos inteiros e arredondamento | - | `pricing.ts:toCents` (corrige ruido binario), `payment-refund.service.ts:9` |
| Estorno parcial x total, saldo reservado sob `FOR UPDATE`, chave de operacao | - | `payment-refund.service.ts:28-53` |
| Fora de ordem: fatura PAGA nao volta a aberta/vencida | A doc recomenda nao depender da ordem | `asaas-webhook.processor.ts:137-145` |
| Conciliacao periodica Asaas (a cada 6 h) com reparo e alerta | https://docs.asaas.com/docs/polling-vs-webhooks | `payment-reconciliation.service.ts:58-97` |
| Estorno total cancela NFS-e; parcial vai para ajuste manual; chargeback nao cancela sozinho | - | `asaas-fiscal.service.ts:handleRefund` |
| Teste gratis: padrao 30 dias, cupom so ESTENDE; primeira fatura so aplica cupom resgatado (`couponId`) | - | `trial-lifecycle.ts:12-21`, `trial-conversion.service.ts:55-58` |
| Fuso `America/Sao_Paulo` nos avisos e na primeira fatura | - | `trial-lifecycle.ts`, `pricing.ts:saoPauloDayNumber`, `trial-conversion.service.ts:67` |
| Inadimplencia: reguas aviso, bloqueio (dia 5) e cancelamento (dia 30), configuraveis | - | `dunning.ts`, `billing-cron.service.ts:362-420` |

## 2. Divergencias e riscos, por gravidade

### ALTA

**A1. Mercado Pago nao tem conciliacao periodica, e o webhook tem janela anti-replay de 5 minutos.**
- Doc: o MP reentrega webhooks ate receber 200/201 (https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks; nao li a pagina, informacao dos resumos). A doc nao define janela anti-replay para `ts`.
- Codigo: `payment-reconciliation.service.ts:71` filtra `provider: 'ASAAS'`, entao nenhuma fatura MP (inclusive as em `UNKNOWN`/`PROCESSING`, `platform-finance.service.ts:98-100`) e conciliada por cron. `findPaymentForInvoice` so roda sob demanda (`platform-finance.service.ts:615,1525,1546`). Em `mercadopago.service.ts:224-225` um webhook com `ts` mais velho que 300 s e rejeitado com 403; se a reentrega do MP reaproveitar o `ts` original (nao verificado), um atraso maior que 5 min perde o pagamento para sempre.
- Impacto financeiro: cliente pagou e a empresa continua suspensa; fatura aberta duplicada. Sem alerta.
- Correcao: incluir MP no cron (consultar `findPaymentForInvoice` por `external_reference` para faturas `OPEN`/`OVERDUE`/`UNKNOWN` com `provider: 'MERCADOPAGO'`) e elevar a tolerancia (`MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS`) para algo como 3600 ou tratar o `ts` so como alerta, ja que o HMAC cobre o `ts`.

**A2. Pagamento de uma fatura reativa a empresa incondicionalmente, ignorando o motivo do bloqueio e outras faturas vencidas.**
- Doc: n/a (regra de negocio). Efeito financeiro/seguranca de acesso.
- Codigo: `asaas-webhook.processor.ts:160-161` e `mercadopago-webhook.controller.ts:90-91` fazem `status:'ACTIVE', isActive:true, billingStatus:'ACTIVE', suspensionReason:null` para qualquer `PAID`. Isso reativa empresa com `billingStatus: 'CANCELED'` (cancelada por inadimplencia ou por recusa do teste), `suspensionReason` manual/de seguranca, e empresa que ainda deve outras faturas `OVERDUE`. Um `PAYMENT_RECEIVED` atrasado de fatura antiga reabre acesso de conta cancelada.
- Impacto: acesso indevido e perda de receita.
- Correcao (trecho curto):
  ```ts
  const stillOverdue = await prisma.platformInvoice.count({ where: { companyId, status: 'OVERDUE', deletedAt: null, id: { not: invoice.id } } });
  const reactivable = !['CANCELED'].includes(company.billingStatus) && ['inadimplencia','trial_aguardando_pagamento','aguardando_primeiro_pagamento','pagamento_cancelado_ou_estornado', null].includes(company.suspensionReason);
  if (reactivable && !stillOverdue) { /* ACTIVE */ } else { /* so billingStatus ou alerta */ }
  ```

**A3. `PAYMENT_UPDATED` e `PAYMENT_RESTORED` tratados como "OPEN" e sobrescrevem estado e `deletedAt`.**
- Doc: `PAYMENT_UPDATED` = "alteracao no vencimento ou no valor de uma cobranca existente" (https://docs.asaas.com/docs/webhook-para-cobrancas). Nao indica mudanca para pendente.
- Codigo: `asaas-webhook.processor.ts:278` mapeia `PAYMENT_UPDATED` para `OPEN`; `:146-155` grava `status` e `deletedAt: null`. Resultado: (a) fatura `OVERDUE` volta a `OPEN` e a regua `checkOverdueInvoices` (`billing-cron.service.ts:368`, filtra `status: 'OVERDUE'`) deixa de bloquear ate a conciliacao de 6 h; (b) fatura `CANCELED/deletedAt` ressuscita; (c) a notificacao `CHARGE_CREATED` nao dispara (nao esta em `PAYMENT_EVENT_MAP`), mas o estado ja foi alterado.
- Impacto: inadimplente evita bloqueio; ressuscita fatura cancelada.
- Correcao: para `PAYMENT_UPDATED`, atualizar so `amount`/`dueDate` e preservar o `status` local (ou derivar o status de `payment.status` do payload, que o Asaas envia).

### MEDIA

**M1. Eventos de pagamento existentes e nao tratados.**
- Doc: eventos incluem `PAYMENT_AWAITING_RISK_ANALYSIS`, `PAYMENT_APPROVED_BY_RISK_ANALYSIS`, `PAYMENT_REPROVED_BY_RISK_ANALYSIS`, `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`, `PAYMENT_ANTICIPATED`, `PAYMENT_AWAITING_CHARGEBACK_REVERSAL`, `PAYMENT_DUNNING_*`, `PAYMENT_REFUND_DENIED`, `PAYMENT_PARTIALLY_REFUNDED` (https://docs.asaas.com/docs/webhook-para-cobrancas). Nao li a lista integral; os nomes acima vem de memoria e do resumo da busca. **Verificar na pagina quando o dominio for liberado.**
- Codigo: `statusFromEvent` (`asaas-webhook.processor.ts:274-280`) ignora todos eles (marca `IGNORED`). Os efeitos: `PAYMENT_REPROVED_BY_RISK_ANALYSIS`/`CAPTURE_REFUSED` deixam a fatura aberta sem aviso; `PAYMENT_AWAITING_CHARGEBACK_REVERSAL` (tratado so na conciliacao, `payment-reconciliation.service.ts:33`) nao reverte a suspensao do chargeback. `PAYMENT_REFUND_DENIED` nao fecha a operacao `PENDING` (so a conciliacao de 5 min resolve).
- Impacto: operacional; a conciliacao cobre parte.
- Correcao: tratar `PAYMENT_REFUND_DENIED` chamando `refunds.reconcile`, e `PAYMENT_AWAITING_CHARGEBACK_REVERSAL`/reversao de chargeback revertendo a suspensao.

**M2. Webhook duplicado concorrente do Mercado Pago pode contar o cupom duas vezes e notificar duas vezes.**
- Doc: o MP pode reenviar notificacoes (at least once; resumos, nao li a pagina).
- Codigo: o MP nao tem tabela de eventos. A protecao e `invoice.status === 'PAID'` lido antes (`mercadopago-webhook.controller.ts:86`); duas entregas simultaneas leem `OPEN`, ambas atualizam, e ambas executam `couponCyclesLeft: { decrement: 1 }` e `notify` (`:107-114`). Nao ha trava (`FOR UPDATE`) nem `updateMany` condicional.
- Impacto: cupom por N ciclos acaba antes (perda de desconto contratado) e e-mail duplicado.
- Correcao: `const r = await prisma.platformInvoice.updateMany({ where: { id, status: { not: 'PAID' } }, data })` e so executar cupom/notificacao quando `r.count === 1`.

**M3. Reembolso de boleto no Asaas usa o endpoint errado.**
- Doc: boleto usa `POST /v3/payments/{id}/bankSlip/refund` e devolve um link para o pagador informar a conta (https://docs.asaas.com/reference/estornar-boleto). `POST /payments/{id}/refund` serve para cartao e Pix (https://docs.asaas.com/reference/estornar-cobranca). Parcelamento de cartao tem endpoint proprio (https://docs.asaas.com/reference/estornar-parcelamento).
- Codigo: `asaas.service.ts:183-188` e `payment-refund.service.ts:61` chamam sempre `/refund`, sem olhar `billingType`. Para boleto o Asaas deve recusar com 400, que vira `AsaasRejectedException` e `failReservation` (`:68-70`): o pedido de reembolso de boleto nunca funciona e o cliente ve "falhou". Verificar no sandbox.
- Impacto: reembolsos de boleto bloqueados (e a chave precisa da permissao `PAYMENT_REFUND:WRITE`).
- Correcao: `if (invoice.billingType === 'BOLETO') POST /payments/{id}/bankSlip/refund` e guardar o link devolvido (`transactionReceiptUrl`/link) para repassar ao cliente.

**M4. Estorno total confirmado nao muda o status da fatura nem o acesso.**
- Doc: n/a (regra de negocio).
- Codigo: o ramo de reembolso (`asaas-webhook.processor.ts:115-121`, `mercadopago-webhook.controller.ts:81-85`) so chama `refunds.reconcile`, que grava `refundedAmount/refundStatus` (`payment-refund.service.ts:151`) e cancela a NFS-e. A fatura segue `PAID` e a empresa `ACTIVE`. As entradas `PAYMENT_REFUNDED` em `statusFromEvent` e `PAYMENT_EVENT_MAP` sao codigo morto (retorno antecipado). O mesmo evento de chargeback suspende a empresa (`:165`), entao a politica e inconsistente.
- Impacto: receita reconhecida no relatorio da plataforma pode contar fatura estornada se o relatorio nao filtrar `refundStatus`. Nao verifiquei `platform-revenue-report.ts` (fora do foco). Confirmar a regra de negocio.
- Correcao: decidir a politica (estorno total = suspender/cancelar) e aplica-la em um unico ponto.

**M5. Valores de cartao confirmados ainda nao liquidados contam como pago.**
- Doc: `PAYMENT_CONFIRMED` = pagamento feito, saldo ainda nao disponivel; `PAYMENT_RECEIVED` = valor disponivel (https://docs.asaas.com/docs/webhook-para-cobrancas). Cartao: CREATED -> CONFIRMED -> RECEIVED.
- Codigo: `CONFIRMED` e `RECEIVED` viram `PAID` (`:275`), `gatewayNetValue` e a NFS-e saem na confirmacao. Para cartao e a pratica comum e aceitavel; o risco e chargeback depois da emissao da nota. Ja ha tratamento de chargeback (`:176`).
- Impacto: baixo a medio. Registrado para decisao de negocio.

**M6. Janela de bloqueio depende do evento `PAYMENT_OVERDUE` e usa dias em UTC.**
- Codigo: `checkOverdueInvoices` (`billing-cron.service.ts:389-391`) calcula atraso por diferenca de timestamps UTC (`dueDate` e meia-noite UTC; `today` e a hora atual). O bloqueio ocorre no dia N+1 conforme a hora de execucao (08:00 UTC). A doc nao fixa o fuso do vencimento; o Asaas opera em horario de Brasilia.
- Impacto: erro de ate 1 dia na regua; sem perda financeira grave.
- Correcao: usar `saoPauloDayNumber` como em `pricing.ts`.

**M7. Vencimento gerado com `new Date()` em UTC.**
- Codigo: `platform-finance.service.ts:126-127,181-187` soma 1 dia em UTC e usa `toISOString().slice(0,10)`. Entre 21:00 e 23:59 (Brasilia) a data UTC ja e a do dia seguinte, entao o vencimento "amanha" vira "depois de amanha". Tambem `nextDueDate` da assinatura (`:285-293`) e `trialEndsAt.toISOString()` podem deslocar 1 dia.
- Impacto: baixo (cobranca vence um dia depois).
- Correcao: derivar o dia pelo fuso `America/Sao_Paulo` (ja existe `saoPauloDayNumber`).

### BAIXA

**B1. Id sintetico do evento quando o payload nao traz `id`.** `asaas-webhook.controller.ts:36` usa `${evento}:${paymentId}`. O Asaas envia `id` em todos os eventos, mas se faltar, dois `PAYMENT_UPDATED` legitimos do mesmo pagamento colidem e o segundo e descartado como duplicado. Correcao: incluir um hash do corpo.

**B2. Corpo do webhook Asaas sem validacao de formato.** O corpo e gravado como JSON sem schema (`:42`). O token ja protege; defesa em profundidade seria validar com DTO.

**B3. Token de webhook do Asaas: tamanho minimo nao verificado.** A doc exige 32 a 255 caracteres e proibe API Key (https://docs.asaas.com/docs/criar-novo-webhook-pela-api). O codigo aceita qualquer valor de `ASAAS_WEBHOOK_TOKEN`. Correcao: falhar no boot se `< 32` ou se igual a `ASAAS_API_KEY`. Nao verifiquei o valor configurado (segredo).

**B4. Fila de webhook pausada nao e monitorada.** Doc: apos 15 falhas consecutivas a fila e interrompida e os eventos so ficam 14 dias (https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook). O codigo so conta `FAILED` internamente (`billing-cron.service.ts:103`); nao consulta `interrupted` do webhook (`GET /webhooks`) nem reativa com `interrupted:false`. Correcao: cron que le a configuracao do webhook e alerta/reativa. A conciliacao de 6 h cobre dentro da janela de 14 dias.

**B5. Mercado Pago: `expiration_date_to` em formato `Z`.** `mercadopago.service.ts:117,184` envia `toISOString()`. A doc de preferencias pede ISO 8601 com offset (ex. `-03:00`); nao confirmei se `Z` e aceito. Verificar no sandbox.

**B6. Mercado Pago: `data.id` do corpo como alternativa.** `mercadopago-webhook.controller.ts:51` usa o corpo quando o parametro `data.id` da query falta. Como o corpo nao e assinado, o manifesto pode nao bater (rejeita legitimo) ou, com `data.id` ausente, assina sem ele. Preferir exigir o parametro da query.

**B7. Erros 429 do Asaas tratados como indisponibilidade, sem espera.** Doc: cota de 25.000 requisicoes por 12 h, 50 GET simultaneos, limites por endpoint com cabecalhos `RateLimit-*`; recomenda backoff e evitar retentativa imediata (https://docs.asaas.com/docs/duvidas-frequentes-limites-da-api). Codigo: `asaas.service.ts:102-103` lanca `ServiceUnavailableException` sem ler `RateLimit-Reset`. A conciliacao de 300 faturas a cada 6 h e a de NFS-e geram ate centenas de GETs sem espaco entre eles. Correcao: respeitar `RateLimit-Reset` e limitar concorrencia.

**B8. `getPaymentsBySubscription` sem `limit`** (`asaas.service.ts:195-197`): usa a paginacao padrao e pode truncar a lista (uso em `proposals.service.ts:147`). Usar `limit=100` e seguir `hasMore`/`offset`. O limite padrao do Asaas nao foi confirmado nesta rodada.

**B9. Assinatura de cartao nao cancela/pausa a cobranca ao suspender.** Ao bloquear por inadimplencia nada e feito no Asaas ate `CANCEL` (dia 30). Aceitavel; registrado apenas.

## 3. Checklist solicitado

| Tema | Resultado |
|---|---|
| Header `asaas-access-token` | OK (`asaas-webhook.controller.ts:29`) |
| Token em tempo constante | OK (`:103-108`) |
| Payload sem assinatura/token | Rejeitado com 403 nos dois provedores |
| Idempotencia por id de evento | Asaas OK; MP so por estado (ver M2) |
| Webhook duplicado | Asaas OK; MP com corrida (M2) |
| Fora de ordem | Asaas parcial (A3); MP trata `PAID` x `OPEN` (`:86-87`) |
| Conciliacao periodica | Asaas OK (6 h, 7 dias); MP ausente (A1) |
| Estorno parcial x total | OK com reserva e conferencia por centavos; boleto (M3) |
| Ligacao com NFS-e | OK (cancela no total, ajuste manual no parcial/chargeback) |
| Valores / Decimal | Centavos inteiros em `pricing` e refunds; `Number(amount) !== payment.value` compara float de 2 casas (`asaas-webhook.processor.ts:135`), risco baixo |
| Fuso do vencimento | Divergencias M6 e M7 |
| Teste gratis 30 dias e cupom | OK: `trialDaysDefault` 30; cupom so estende; `generateFirstInvoice` so aplica cupom resgatado. Na criacao da assinatura recorrente durante o teste o valor ja inclui cupom (`platform-finance.service.ts:~390`), mas a 1a cobranca so vence em `trialEndsAt`, entao nao ha desconto no periodo de teste |
| Cancelamento | `finalizeCancellation` e `applyScheduledCancellations` existem; nao auditei o corpo (`faturas-acoes.service.ts`) |
| Inadimplencia | Regua OK; ver A2, A3, M6 |
| Reprocessamento | Reenvio de `FAILED` reabre; conciliacao usa id estavel por dia (`payment-reconciliation.service.ts:164`) |

## 4. Resumo

- **Alta (3):** A1 (MP sem conciliacao e anti-replay de 5 min), A2 (reativacao incondicional), A3 (`PAYMENT_UPDATED` sobrescreve estado).
- **Media (7):** M1 a M7.
- **Baixa (9):** B1 a B9.
- Pendente de confirmar com acesso a `docs.asaas.com` e `mercadopago.com.br`: lista integral de eventos, modo de ordem de entrega, template oficial do manifesto MP, statuses de reembolso MP, sandbox e paginacao.
