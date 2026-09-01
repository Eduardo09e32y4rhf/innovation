## 2026-09-01 - Optimizing seed data with createMany
**Learning:** During NestJS `OnModuleInit` lifecycle hooks, static seeding data (such as default roles and permissions) should not be inserted via iterative `.create()` queries inside loops. This can cause N+1 query patterns that delay module startup.
**Action:** Always combine static seeding data in memory and use a single `.createMany()` operation to optimize database insertions during module initialization.
