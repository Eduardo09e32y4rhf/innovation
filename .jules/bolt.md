## 2024-07-04 - Unbounded parallel requests in Time Track bulk operations
**Learning:** In frontend bulk operations (e.g. bulk time track inserts for multiple employees and dates), using unbounded `Promise.all()` for API calls overwhelms the browser connection limits and can cause the backend API to block or fail.
**Action:** Replace sequential unbounded loops with chunked concurrency using native JS array chunking and `Promise.all()` in batches (e.g., chunkSize = 20) to drastically reduce import times and avoid connection issues.
