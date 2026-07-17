## 2024-05-24 - Consolidated Array Iterations in Dashboard
**Learning:** Found an anti-pattern in `apps/api/src/modules/dashboard/dashboard.repository.ts` where large collections (`employees`) were being processed using multiple sequential `.filter()` calls to calculate aggregates. This causes unnecessary O(N) passes and redundant memory allocations.
**Action:** Optimize CPU performance by consolidating these multiple O(N) passes into a single O(N) `for...of` loop to calculate multiple aggregates simultaneously without redundant memory allocations.
