## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution

## 2025-02-27 - Fix Prisma 6 enum exports compatibility
**Vulnerability:** Prisma 6 dropped the `$Enums` export. Several files in the repository still attempted to import `$Enums` from `@prisma/client`, which causes `tsc` compilation to fail with `Module '"@prisma/client"' has no exported member '$Enums'`. This prevents the CI pipeline from building the API and running critical tests, breaking the security and continuous deployment checks.
**Learning:** When upgrading to Prisma 6, any legacy `$Enums.EnumName` usage must be updated to import the enums directly, as `$Enums` is no longer exported by default.
**Prevention:** Always directly import enums (e.g., `import { InvoiceStatus } from '@prisma/client'`) rather than relying on the internal or deprecated `$Enums` namespace.

## 2025-02-27 - Fix TypeScript implicit 'any' parameter types
**Vulnerability:** Several utility functions, callbacks, and loops lacked explicit typing for parameters (e.g., `error` in catch blocks, or iterators like `item` and `tx`), leading to `implicit 'any'` TypeScript compilation errors. In a secure codebase, relying on implicit `any` can mask property access errors or payload type mismatches, opening the door for object injections or runtime crashes when unexpected shapes are processed.
**Learning:** To satisfy strict compiler checks and prevent runtime injection vulnerabilities, all parameters, including catch clause variables, must be explicitly typed or type-guarded (e.g., checking `error?.code` or explicitly casting).
**Prevention:** Always enable `noImplicitAny` and proactively add type guards (like `instanceof` checks or `as any` explicitly when necessary) in `catch` blocks and iterator parameters.
