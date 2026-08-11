## 2024-05-15 - [Avoid Redundant Count Queries When Entities Are Fetched]
**Learning:** Sometimes, count queries are performed alongside findMany queries on the same entities. In DashboardRepository, it was counting employee admissions and terminations when all employees in that company had already been fully fetched in memory earlier in the same method.
**Action:** When working on backend queries, check if the data being counted can be derived directly from objects already in memory. Instead of redundant Prisma count queries, standard JS array filters on in-memory objects can prevent database round-trips.

## 2026-07-30 - Fix N+1 queries in time closing generation
**Learning:** Database performance degrades severely when making iterative Prisma ORM queries inside a loop such as `for (const employee of employees)`, causing an N+1 problem that does not scale for companies with many employees.
**Action:** Extract database dependencies by pre-fetching bulk data using `{ in: [...] }` filtering, then regrouping results in memory (e.g. Map objects by employee ID) to iterate locally without emitting further SQL queries.

## 2024-08-11 - [Optimize triggerPeriodicAso Performance via Bulk Operations]
**Learning:** An iterative loop utilizing database calls like `findFirst` followed conditionally by `create` leads to critical database performance bottlenecks when dealing with a large set of expired entities. Even more critically, failing to group and uniquely identify items strictly by `employeeId` within the loop exposes the system to functional regressions where multiple un-deduplicated matching items (like multiple distinct old ASOs per employee) might cause the system to create multiple identical new entity rows (and spawn spammy notifications).
**Action:** Always pre-fetch the latest items required to make decisions utilizing a bulk querying technique (`findMany` coupled with `in: []`), load the results into memory, map effectively ensuring items meant to spawn single future items correctly squash duplicates before passing filters, and only then proceed with bulk insert commands (`createMany`) safely in memory.
