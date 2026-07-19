## 2024-07-19 - Consolidate O(N) array passes in large collections
**Learning:** Using multiple sequential `.filter()` or `.map()` calls on large collections (like `employees`) in NestJS repositories causes redundant memory allocations and excessive CPU cycles.
**Action:** Optimize CPU performance by consolidating these multiple O(N) passes into a single O(N) `for...of` loop to calculate multiple aggregates simultaneously.
