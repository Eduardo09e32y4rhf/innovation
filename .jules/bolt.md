## 2026-09-25 - GroupBy optimization
**Learning:** When multiple `.count()` queries are executed on the same table with different where clauses, they can be optimized into a single `.groupBy()` query. However, remember that Prisma returns an object for the counts (e.g., `group._count._all`), not a primitive number. You must access this nested property correctly when aggregating the results in memory.
**Action:** Replace multiple Prisma count queries on the same model with a single `groupBy` and aggregate in memory to reduce database hits.
