# Platform Finance

This module manages Innovation platform billing without changing tenant authentication or company ownership.

## Architecture

- `PlatformFinanceService`: paginated invoice listing, summary, CRUD, soft delete and Asaas synchronization.
- `AsaasService`: typed HTTP client for customers, subscriptions and payments.
- `AsaasWebhookController`: token-authenticated, idempotent payment event synchronization.
- `FinanceController`: endpoints restricted to `DEV` and `COMERCIAL` roles.

## Endpoints

- `GET /finance/platform/summary`
- `GET /finance/platform/invoices`
- `POST /finance/platform/invoices`
- `PATCH /finance/platform/invoices/:id`
- `POST /finance/platform/invoices/:id/sync`
- `DELETE /finance/platform/invoices/:id`
- `POST /finance/charge/:companyId` (compatibility alias)
- `POST /finance/webhook/asaas`

List filters: `page`, `limit`, `status`, `search`, `from`, and `to`.

## Configuration

- `ASAAS_API_KEY`: Asaas API key.
- `ASAAS_API_URL`: optional; defaults to the official sandbox v3 URL.
- `ASAAS_WEBHOOK_TOKEN`: token configured as the webhook `authToken` in Asaas.

The webhook URL must send the configured token in the `asaas-access-token` header. Production rejects webhook requests when the token is missing or invalid.

## Database

Deploy migration `20260717120000_complete_platform_finance` before releasing the API. It stores the Asaas payment ID and invoice URL, adds query indexes, and enables soft deletion.