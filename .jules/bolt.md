## 2024-06-21 - Parallelize Bulk Manual Time Tracking
**Learning:** Sequential for...of loops for independent database inserts in the NestJS backend create unnecessary database I/O wait times and N+1-like performance bottlenecks.
**Action:** Replace sequential operations with await Promise.all(arr.map(async (item: any) => ...)) for mutually independent batch inserts to improve throughput and response times.
## 2024-06-21 - Parallelize Bulk Manual Time Tracking Safely
**Learning:** Sequential for...of loops for independent database inserts create unnecessary database I/O wait times. However, using unbounded Promise.all on bulk API endpoints risks database pool exhaustion.
**Action:** Replace sequential operations with chunked concurrent processing (e.g., slicing into groups of 10 and mapping with Promise.all) to balance throughput and safety.
