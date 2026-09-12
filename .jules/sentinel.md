## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution

## 2025-02-27 - Fix Prisma 6 enum exports compatibility
**Vulnerability:** Prisma 6 dropped the `$Enums` export. Several files in the repository still attempted to import `$Enums` from `@prisma/client`, which causes `tsc` compilation to fail with `Module '"@prisma/client"' has no exported member '$Enums'`. This prevents the CI pipeline from building the API and running critical tests, breaking the security and continuous deployment checks.
**Learning:** When upgrading to Prisma 6, any legacy `$Enums.EnumName` usage must be updated to import the enums directly, as `$Enums` is no longer exported by default.
**Prevention:** Always directly import enums (e.g., `import { InvoiceStatus } from '@prisma/client'`) rather than relying on the internal or deprecated `$Enums` namespace.
