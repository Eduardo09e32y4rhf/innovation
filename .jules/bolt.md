## 2025-05-18 - Nested Sequential Database Inserts in Time-Track Service
**Learning:** `TimeTrackService` handled `manualBulk` insertions by looping through every employee and date, `await`ing each individual database upsert one at a time. This created an N*M sequential I/O bottleneck.
**Action:** Identified the loop and refactored it to collect tasks into an array and execute them concurrently in batches of 10 using `Promise.all`. This safely parallelized network wait times without risking database connection pool exhaustion.
