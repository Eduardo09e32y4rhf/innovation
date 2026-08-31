## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution
## 2025-02-14 - Fix unhandled TypeError in Buffer.from() due to undefined input in NestJS auth
**Vulnerability:** Missing input validation in NestJS `@Body()` using inline types instead of DTO class allowed `undefined` inputs. This caused an unhandled `TypeError` in `Buffer.from()` and `startsWith()`, leading to HTTP 500 error, exposing internal app logic and causing a potential DoS vector.
**Learning:** In NestJS, inline types in `@Body()` bypass automatic `class-validator` validation. This makes manual `typeof` validation strictly required before using the inputs. Passing `undefined` to `Buffer.from()` crashes Node.js processes.
**Prevention:** Avoid inline types in `@Body()`. If used, ALWAYS validate input types manually (`typeof dto.field === 'string'`) before passing to methods like `Buffer.from()` or `startsWith()`.
## 2025-02-14 - Fix Prisma Enums export after Prisma 6 upgrade
**Vulnerability:** Prisma 6 removes the `$Enums` export. This causes TypeScript typechecking errors (`TS2305: Module '"@prisma/client"' has no exported member '$Enums'`) which breaks CI pipelines and deployments.
**Learning:** When upgrading to Prisma 6, any occurrences of `import { $Enums } from '@prisma/client'` and `type X = $Enums.X` must be refactored to directly import the enums from `@prisma/client`.
**Prevention:** Always use direct imports for enums (e.g. `import { InvoiceStatus } from '@prisma/client'`) instead of relying on the deprecated `$Enums` namespace.
## 2025-02-14 - Fix GitHub Actions Node version deprecation
**Learning:** GitHub Actions deprecated Node 20. Workflows forcing `node-version: 20` must be updated to `node-version: 22` to avoid CI failures and warnings.
**Prevention:** Regularly audit `.github/workflows/` for deprecated runtime versions and update `node-version` strings.
