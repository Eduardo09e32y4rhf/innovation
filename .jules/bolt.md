## 2024-05-15 - [Avoid Redundant Count Queries When Entities Are Fetched]
**Learning:** Sometimes, count queries are performed alongside findMany queries on the same entities. In DashboardRepository, it was counting employee admissions and terminations when all employees in that company had already been fully fetched in memory earlier in the same method.
**Action:** When working on backend queries, check if the data being counted can be derived directly from objects already in memory. Instead of redundant Prisma count queries, standard JS array filters on in-memory objects can prevent database round-trips.

## 2026-07-30 - Fix N+1 queries in time closing generation
**Learning:** Database performance degrades severely when making iterative Prisma ORM queries inside a loop such as `for (const employee of employees)`, causing an N+1 problem that does not scale for companies with many employees.
**Action:** Extract database dependencies by pre-fetching bulk data using `{ in: [...] }` filtering, then regrouping results in memory (e.g. Map objects by employee ID) to iterate locally without emitting further SQL queries.

## 2024-08-26 - [Replace N+1 Database Write Operations with createMany/deleteMany]
**Learning:** Performing multiple independent database write operations (like `deleteMany` and `create`) sequentially inside a loop over a large collection (e.g., hundreds of employees during payroll generation) causes severe N+1 performance bottlenecks and increases API latency.
**Action:** When performing similar operations across many entities in a loop, collect the data payloads in memory first. After the loop, use bulk operations like `deleteMany` (with the `in` operator) and `createMany` to batch the writes, executing in constant time O(1) database queries instead of O(N) operations.