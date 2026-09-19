## 2025-03-01 - Batch createMany for N+1 issues
**Learning:** In Prisma loops like TimeClosing, making N single `.create()` calls and `.deleteMany()` calls is a classic N+1 database performance issue. Using array collection and `.createMany()` significantly improves throughput.
**Action:** Always watch for Prisma `.create()` calls inside loops processing multiple objects and switch to `createMany()`.
