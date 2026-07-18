
## 2023-11-21 - Optimize O(N) Iterations
**Learning:** In the NestJS backend (e.g., `dashboard.repository.ts`), sequential `.filter()` and `.map()` calls on large employee collections create multiple full O(N) traversals.
**Action:** Consolidate these operations into a single O(N) `for...of` loop to calculate multiple aggregates simultaneously and prevent redundant memory allocations.
