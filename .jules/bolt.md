## 2024-07-05 - Time Closing Generation N+1 Query Fix
**Learning:** Sequential `for...of` loops over employees to compute time closures create significant database I/O wait times and delays the entire month-end process linearly per employee. Standard unbounded `Promise.all` can overwhelm the Prisma connection pool, leading to crashes for large companies.
**Action:** Used chunked concurrency (`Promise.all` wrapped in a loop over slices) to safely parallelize operations, significantly speeding up the generation process while managing the database load effectively.
