# Platform Finance

This module manages Innovation platform billing without changing tenant authentication or company ownership.

## Architecture

- `PlatformFinanceService`: paginated invoice listing, summary, CRUD, soft delete and Asaas synchronization.
- `AsaasService`: typed HTTP client for customers, subscriptions and payments.
- `AsaasWebhookController`: token-authenticated, idempotent payment event synchronization.
- `FinanceController`: endpoints restricted to `DEV` and `COMERCIAL` roles.
- `CompanyBillingController`: lets a blocked company administrator retrieve checkout and payment status.
- Public onboarding creates the administrator and keeps paid plans suspended until Asaas confirms payment.

## Endpoints

- `GET /finance/platform/summary`
- `GET /finance/platform/invoices`
- `POST /finance/platform/invoices`
- `PATCH /finance/platform/invoices/:id`
- `POST /finance/platform/invoices/:id/sync`
- `DELETE /finance/platform/invoices/:id`
- `POST /finance/charge/:companyId` (compatibility alias)
- `GET /finance/company/status`
- `GET /finance/company/invoices`
- `POST /finance/company/checkout`
- `POST /finance/webhook/asaas`

List filters: `page`, `limit`, `status`, `search`, `from`, and `to`.

## Configuration

- `ASAAS_API_KEY`: Asaas API key.
- `ASAAS_API_URL`: optional; defaults to production in `NODE_ENV=production` and sandbox otherwise.
- `ASAAS_WEBHOOK_TOKEN`: token configured as the webhook `authToken` in Asaas (32-255 characters).
- `ASAAS_WEBHOOK_SECRET`: legacy alias accepted for existing VPS deployments.

The webhook URL must send the configured token in the `asaas-access-token` header. Production rejects webhook requests when the token is missing or invalid.

## Database

Deploy migration `20260717120000_complete_platform_finance` before releasing the API. It stores the Asaas payment ID and invoice URL, adds query indexes, and enables soft deletion.
## Onboarding flow

1. `POST /auth/register-company` creates the company and its first `ADMIN` atomically.
2. Paid plans start with `status=SUSPENDED` and `billingStatus=PAST_DUE`.
3. The API creates/reuses the Asaas customer, initial payment and recurring subscription.
4. `PAYMENT_CONFIRMED` or `PAYMENT_RECEIVED` activates the company.
5. The blocked billing page also polls Asaas as a fallback for delayed webhooks.
6. `PAYMENT_OVERDUE` starts the grace period; the daily billing job suspends access after five days.
7. Refund, deletion or chargeback suspends access again.

Configure the public webhook URL as `https://YOUR_DOMAIN/api/finance/webhook/asaas` and use the exact same token stored in `ASAAS_WEBHOOK_TOKEN` (or the legacy `ASAAS_WEBHOOK_SECRET`).
## Provedores de pagamento (Asaas e Mercado Pago)

O provedor ativo vem de `PlatformSetting` (`billing.provider`), depois de `PAYMENT_PROVIDER`, e por fim `ASAAS`.

| | Asaas | Mercado Pago |
|---|---|---|
| Variaveis | `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` | `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` (+ `MERCADOPAGO_PUBLIC_KEY`) |
| Webhook | `POST /api/finance/webhook/asaas` (cabecalho `asaas-access-token`) | `POST /api/finance/webhook/mercadopago` (assinatura `x-signature`, evento Pagamentos) |
| Cobranca | assinatura recorrente + avulsa | link Checkout Pro (Pix, cartao, saldo) por fatura |

Painel: `GET /api/finance/integrations/health?test=1` (DEV/CEO/CONTABIL) mostra o que falta e testa a credencial do Mercado Pago;
`PUT /api/finance/integrations/provider` `{ "provider": "MERCADOPAGO" }` (DEV/CEO) alterna o provedor; so aceita se as credenciais estiverem configuradas.

O webhook do Mercado Pago nunca confia no corpo: valida a assinatura e reconsulta o pagamento na API antes de liberar a empresa.
Com Mercado Pago ativo nao ha assinatura recorrente automatica: cada ciclo gera uma nova fatura com link de pagamento.
