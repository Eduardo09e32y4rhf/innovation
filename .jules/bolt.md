## 2024-05-15 - [Avoid Redundant Count Queries When Entities Are Fetched]
**Learning:** Sometimes, count queries are performed alongside findMany queries on the same entities. In DashboardRepository, it was counting employee admissions and terminations when all employees in that company had already been fully fetched in memory earlier in the same method.
**Action:** When working on backend queries, check if the data being counted can be derived directly from objects already in memory. Instead of redundant Prisma count queries, standard JS array filters on in-memory objects can prevent database round-trips.

## 2026-07-30 - Fix N+1 queries in time closing generation
**Learning:** Database performance degrades severely when making iterative Prisma ORM queries inside a loop such as `for (const employee of employees)`, causing an N+1 problem that does not scale for companies with many employees.
**Action:** Extract database dependencies by pre-fetching bulk data using `{ in: [...] }` filtering, then regrouping results in memory (e.g. Map objects by employee ID) to iterate locally without emitting further SQL queries.
## 2024-08-24 - [Avoid N+1 Queries During Application Startup Initialization]
**Learning:** Initializing default configurations inside NestJS lifecycle hooks (like `OnModuleInit`) using iterative database queries (e.g., calling `create` inside a loop) causes severe N+1 query problems. This significantly blocks and delays module startup, especially as the number of seeded items grows.
**Action:** When seeding default configuration data into the database at startup, combine the static data into an array in memory and execute a single bulk operation like `createMany`. This avoids blocking the event loop and database connection pool with multiple tiny round trips during initialization.
