## 2025-02-14 - NestJS Backend Dashboard Aggregations Anti-Pattern
**Learning:** In the NestJS backend (e.g., `dashboard.repository.ts`), a common anti-pattern for large collections (like employees) is using multiple sequential `.filter()` or `.map()` calls.
**Action:** Optimize CPU performance by consolidating these multiple O(N) passes into a single O(N) `for...of` loop to calculate multiple aggregates simultaneously without redundant memory allocations.
