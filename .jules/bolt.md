## 2026-06-24 - Async Chunked Concurrency for DB Bulk Inserts
**Learning:** Sequential `await` in nested `for...of` loops for mutually independent records causes significant I/O wait times and slow bulk operation. However, using unbounded `Promise.all()` directly can easily exhaust the DB connection pool during massive bulk updates.
**Action:** When migrating sequential I/O ops to concurrent execution, group tasks into chunks (e.g. native array chunking `chunkSize = 20`) to balance concurrency with safe connection pool management.
