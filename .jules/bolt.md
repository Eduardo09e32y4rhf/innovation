## 2024-05-18 - Consolidate O(N) array iterations in dashboard insights
**Learning:** In the NestJS backend, aggregating dashboard metrics by chaining multiple `.filter()` and `.map()` calls on large collections (like `employees`) is an anti-pattern. This causes multiple O(N) passes and redundant memory allocations.
**Action:** Consolidate these multiple O(N) passes into a single O(N) `for...of` loop to calculate multiple aggregates simultaneously, improving CPU performance and reducing GC pressure.
