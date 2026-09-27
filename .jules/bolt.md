## 2026-09-27 - Batch Prisma Queries with GroupBy
**Learning:** Found multiple distinct Prisma `.count()` calls querying the same table but matching different status combinations, which triggers multiple DB hits.
**Action:** Replaced separate `.count()` calls in `apps/api/src/modules/platform/platform.repository.ts` with a single `.groupBy()` query using `_count: { _all: true }`. This aggregated query dramatically cuts DB requests while returning equivalent data logic.
