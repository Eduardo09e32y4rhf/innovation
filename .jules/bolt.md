## 2024-05-18 - Bulk Operations in AsoService
**Learning:** Found N+1 query vulnerability in `triggerPeriodicAso` where each expired ASO record triggered a `findFirst`, `create`, and notification `create` individually inside a loop.
**Action:** Replaced iterative queries with bulk `findMany`, batched in-memory lookups, and `createMany` to eliminate N+1 latency bottlenecks for automated ASO generation.
