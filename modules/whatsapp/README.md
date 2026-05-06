# WhatsApp adapter

This folder contains a minimal TypeScript adapter for the existing `WHATSAPP` CRM integration.

## Why this exists

The repository already contains a WhatsApp CRM surface in [`WHATSAPP/services/WBotService.ts`](../../WHATSAPP/services/WBotService.ts:1) and [`WHATSAPP/services/RoutingService.ts`](../../WHATSAPP/services/RoutingService.ts:1). The adapter here is justified only as a thin, safe wrapper to document integration points and provide typed calls without changing the current app.

## What it does

- Exposes typed methods for session initialization, message sending, and bulk broadcast.
- Documents the bridge as file-based or Electron-based only.
- Avoids changes to auth, UI screens, routes, libraries, or build flow.
- Does not install or require new runtime dependencies.

## What it does not do

- It does not modify the existing `WHATSAPP` app.
- It does not replace [`WBotService`](../../WHATSAPP/services/WBotService.ts:1) or [`RoutingService`](../../WHATSAPP/services/RoutingService.ts:1).
- It does not implement a new WhatsApp provider or new transport.
- It does not create auth flows, UI, or route handlers.

## Files

- [`modules/whatsapp/client.ts`](./client.ts:1)
- [`modules/whatsapp/types.ts`](./types.ts:1)

## Safe usage

Instantiate the client only with a known bridge path or Electron bridge endpoint:

```ts
import { WhatsAppClient } from './client';

const client = new WhatsAppClient({ bridgePath: 'WHATSAPP/AppFinal/resources/app/main.js' });
```

If `bridgePath` is missing, the adapter fails closed with a clear error to avoid accidental side effects.

## Integration points

- [`WHATSAPP/services/WBotService.ts`](../../WHATSAPP/services/WBotService.ts:1): session initialization and message dispatch shape.
- [`WHATSAPP/services/RoutingService.ts`](../../WHATSAPP/services/RoutingService.ts:1): candidate routing flow that calls message sending.
- Electron/file-based bridge: preferred boundary for safe CRM access.

## Risks

- The current implementation is a document-and-forward wrapper; it does not verify a real IPC/file contract.
- If the existing CRM bridge changes, the typed facade may become stale.
- Message delivery remains dependent on the existing WHATSAPP runtime and its internal session state.

