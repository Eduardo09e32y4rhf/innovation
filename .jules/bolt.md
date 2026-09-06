## 2024-05-15 - [Avoid Redundant Count Queries When Entities Are Fetched]
**Learning:** Sometimes, count queries are performed alongside findMany queries on the same entities. In DashboardRepository, it was counting employee admissions and terminations when all employees in that company had already been fully fetched in memory earlier in the same method.
**Action:** When working on backend queries, check if the data being counted can be derived directly from objects already in memory. Instead of redundant Prisma count queries, standard JS array filters on in-memory objects can prevent database round-trips.

## 2026-07-30 - Fix N+1 queries in time closing generation
**Learning:** Database performance degrades severely when making iterative Prisma ORM queries inside a loop such as `for (const employee of employees)`, causing an N+1 problem that does not scale for companies with many employees.
**Action:** Extract database dependencies by pre-fetching bulk data using `{ in: [...] }` filtering, then regrouping results in memory (e.g. Map objects by employee ID) to iterate locally without emitting further SQL queries.
## 2025-06-25 - Bulk Insert Global Permissions
**Learning:** Found an iterative N+1 query loop when initializing the database for `GlobalRolePermission` defaults in `apps/api/src/modules/platform/global-permissions.service.ts` during NestJS `onModuleInit`. An array of roles iterated via a `for..of` loop with individual `.create()` DB hits delays server startup significantly on cold starts, especially when connected over a network database.
**Action:** Always rewrite initialization code or repetitive `.create` DB seeders to aggregate data arrays in-memory and execute a single `.createMany()` to avoid database round trips and minimize startup/processing time overhead.
