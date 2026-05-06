# FINANCEIRO module

Independent TypeScript module for finance flows.

## Scope
- Plans
- Subscriptions
- Checkout
- Billing history
- Invoices
- Payment status
- Dunning state modeling

## Safety rules
- Never expose provider secrets in frontend bundles.
- Use server-side repository/service calls for payment providers.
- Keep legacy `FINANCEIRO/` untouched until validation is completed.

## Integration notes
- Uses central database models for plans, subscriptions, payments, and transactions.
- Frontend only consumes redacted DTOs.
