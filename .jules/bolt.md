## 2025-05-18 - Bulk create operations in Prisma
**Learning:** When solving N+1 query problems by refactoring iterative Prisma `.create()` calls into bulk `.createMany()` operations, the newly created records are not returned. If the application logic requires the created records (and their relations), execute a subsequent `.findMany()` query using an `in` filter on the identifiers to fetch them.
**Action:** Always combine `.createMany()` with a subsequent `.findMany()` when the function needs to return the created data, especially when relations like `employee: true` are required.
