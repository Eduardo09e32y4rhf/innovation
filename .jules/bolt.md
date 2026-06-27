## 2024-06-27 - Backend Concurrency Optimization
**Learning:** Sequential `for...of` loops iterating over array elements for database operations (e.g., retrieving entities or saving records) cause significant I/O wait times in the backend.
**Action:** Replace strictly sequential database loops with chunked concurrency using `Promise.all()` to speed up processing while avoiding connection pool exhaustion.
