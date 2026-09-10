## 2024-05-15 - [Avoid Redundant Count Queries When Entities Are Fetched]
**Learning:** Sometimes, count queries are performed alongside findMany queries on the same entities. In DashboardRepository, it was counting employee admissions and terminations when all employees in that company had already been fully fetched in memory earlier in the same method.
**Action:** When working on backend queries, check if the data being counted can be derived directly from objects already in memory. Instead of redundant Prisma count queries, standard JS array filters on in-memory objects can prevent database round-trips.

## 2026-07-30 - Fix N+1 queries in time closing generation
**Learning:** Database performance degrades severely when making iterative Prisma ORM queries inside a loop such as `for (const employee of employees)`, causing an N+1 problem that does not scale for companies with many employees.
**Action:** Extract database dependencies by pre-fetching bulk data using `{ in: [...] }` filtering, then regrouping results in memory (e.g. Map objects by employee ID) to iterate locally without emitting further SQL queries.

## 2024-09-10 - Fix N+1 queries in triggerPeriodicAso
**Learning:** Checking for existing records iteratively inside a loop that iterates over a result set (like expired ASO records) using `findFirst` creates an N+1 problem. Also, the records were being created one by one inside the loop using `create`.
**Action:** Always pre-fetch existing records using `findMany` with `{ in: [...] }` filtering, then perform checks in memory. Then, batch create new records using `createMany` instead of iteratively calling `create`. Ensure explicit Prisma type definitions are added for the array holding the records.
