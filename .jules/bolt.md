## 2024-10-24 - Chunked Concurrency for Database I/O
**Learning:** Sequential `for...of` loops for database records in the NestJS backend lead to high I/O wait times. Conversely, unbounded `Promise.all()` risks connection pool exhaustion.
**Action:** Use chunked concurrency for bulk independent DB operations to safely maximize throughput.
