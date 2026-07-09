## 2024-05-24 - Array Filtering Optimization
**Learning:** In the NestJS backend `dashboard.repository.ts`, there were multiple sequential `.filter()` and `.map()` calls over large collections (like `employees`) which recalculates the same array properties and duplicates memory.
**Action:** Replace multiple O(N) array method passes with a single O(N) `for...of` loop to calculate multiple aggregates simultaneously, saving CPU cycles and garbage collection overhead.
