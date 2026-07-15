## 2024-05-24 - Optimizing large collection aggregations
**Learning:** In the NestJS backend (e.g., `dashboard.repository.ts`), a common anti-pattern for large collections (like `employees`) is using multiple sequential `.filter()` or `.map()` calls. Optimize CPU performance by consolidating these multiple O(N) passes into a single O(N) `for...of` loop to calculate multiple aggregates simultaneously without redundant memory allocations.
**Action:** When calculating multiple aggregates or filters from a large result set, always use a single loop rather than chained array methods.
