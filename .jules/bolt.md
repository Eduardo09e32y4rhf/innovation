## 2024-05-15 - [Avoid Redundant Count Queries When Entities Are Fetched]
**Learning:** Sometimes, count queries are performed alongside findMany queries on the same entities. In DashboardRepository, it was counting employee admissions and terminations when all employees in that company had already been fully fetched in memory earlier in the same method.
**Action:** When working on backend queries, check if the data being counted can be derived directly from objects already in memory. Instead of redundant Prisma count queries, standard JS array filters on in-memory objects can prevent database round-trips.

## 2026-07-30 - Fix N+1 queries in time closing generation
**Learning:** Database performance degrades severely when making iterative Prisma ORM queries inside a loop such as `for (const employee of employees)`, causing an N+1 problem that does not scale for companies with many employees.
**Action:** Extract database dependencies by pre-fetching bulk data using `{ in: [...] }` filtering, then regrouping results in memory (e.g. Map objects by employee ID) to iterate locally without emitting further SQL queries.
## 2025-06-25 - Bulk Insert Optimizaton for Prisma
**Learning:** Found N+1 query problem inside a frequently run function `triggerPeriodicAso` in `AsoService`. It was executing sequential database inserts inside a loop whenever ASO records were expired. The loop also involved an extra read inside it.
**Action:** When finding loops with sequential database inserts or lookups, optimize by fetching all related records beforehand with `{ in: array }`, avoiding `include` if unnecessary, and grouping inserts via `createMany()` instead of `.create()` in `for..of` loops. This greatly reduces database query roundtrips.
