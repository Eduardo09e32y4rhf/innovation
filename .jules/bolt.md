## 2024-06-28 - Optimize sequential array iteration to concurrent in manualBulk
**Learning:** Sequential await loops for bulk operations (e.g. `for (const id of ids)`) cause large IO wait bottlenecks since independent database lookup paths can be performed simultaneously.
**Action:** Use chunked concurrency (e.g., native JS array chunks mapping to `Promise.all()`) instead of a single `for...of` loop when DB I/O is parallelizable, explicitly cloning DTOs to avoid race conditions.
