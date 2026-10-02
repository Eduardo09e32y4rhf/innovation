## 2026-10-02 - Optimize `globalStats` calculation in `platform.repository.ts`
**Learning:** Found an N+1 equivalent by issuing multiple individual `.count()` queries sequentially using `Promise.all` in the dashboard global statistics endpoint for `PlatformRepository.globalStats`. These queries could be optimized using `Prisma.groupBy` and memory aggregation to reduce database load.
**Action:** Replace multiple `.count()` queries with a single `.groupBy` query and sum the counts in memory.
