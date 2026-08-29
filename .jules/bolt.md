## 2024-11-20 - N+1 Queries with Dependent Inserts
**Learning:** When resolving N+1 queries by replacing iterative database `findFirst` lookups with an in-memory `Map` or array search, if the loop *also* conditionally inserts new records that subsequent iterations might depend on, the in-memory state must be dynamically updated. Otherwise, the batch insert will create duplicates (e.g., generating multiple pending ASO records for the same employee if they have multiple expired records).
**Action:** Always check if the loop logic has dependencies between iterations. If so, track the "staged" state (e.g., using a `Set` of processed IDs or dynamically updating the lookup `Map`) before pushing to the `createMany` payload.

## 2024-11-20 - Prisma $Enums Removal in V6
**Learning:** Prisma 6 removes the `$Enums` namespace. Any attempt to use `type X = $Enums.X` or `const X = $Enums.X` will cause build failures after regenerating the client.
**Action:** When updating Prisma code or fixing typing errors, import the enums directly from `@prisma/client` using `import { EnumName } from '@prisma/client'`.
