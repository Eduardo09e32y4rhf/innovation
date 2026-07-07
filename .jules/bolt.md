## 2025-02-27 - Consolidate Multiple O(N) Array Passes
**Learning:** In the NestJS backend (e.g., `dashboard.repository.ts`), a common anti-pattern for large collections is using multiple sequential `.filter()` or `.map()` calls.
**Action:** Optimize CPU performance by consolidating these multiple O(N) passes into a single O(N) `for...of` loop to calculate multiple aggregates simultaneously without redundant memory allocations.
