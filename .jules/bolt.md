## 2026-07-30 - Fix N+1 queries in time closing generation
**Learning:** Database performance degrades severely when making iterative Prisma ORM queries inside a loop such as `for (const employee of employees)`, causing an N+1 problem that does not scale for companies with many employees.
**Action:** Extract database dependencies by pre-fetching bulk data using `{ in: [...] }` filtering, then regrouping results in memory (e.g. Map objects by employee ID) to iterate locally without emitting further SQL queries.
