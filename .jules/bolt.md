## 2024-05-15 - [Avoid Redundant Count Queries When Entities Are Fetched]
**Learning:** Sometimes, count queries are performed alongside findMany queries on the same entities. In DashboardRepository, it was counting employee admissions and terminations when all employees in that company had already been fully fetched in memory earlier in the same method.
**Action:** When working on backend queries, check if the data being counted can be derived directly from objects already in memory. Instead of redundant Prisma count queries, standard JS array filters on in-memory objects can prevent database round-trips.

## 2026-07-30 - Fix N+1 queries in time closing generation
**Learning:** Database performance degrades severely when making iterative Prisma ORM queries inside a loop such as `for (const employee of employees)`, causing an N+1 problem that does not scale for companies with many employees.
**Action:** Extract database dependencies by pre-fetching bulk data using `{ in: [...] }` filtering, then regrouping results in memory (e.g. Map objects by employee ID) to iterate locally without emitting further SQL queries.
## 2024-05-15 - [Fix N+1 query problem in ASO management triggerPeriodicAso]
**Learning:** Checking for pre-existing records iteratively in a loop querying the DB via `findFirst` introduces an N+1 problem. The overhead hits harder as the application scales and more data sets expire at the same time.
**Action:** Extract individual queries, compute required identifiers via `.map()`, utilize bulk operations with the `in` operator in a single DB query, group records efficiently, and then process data in memory to skip unnecessary individual lookup queries.
