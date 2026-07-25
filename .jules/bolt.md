## 2025-02-28 - Optimize Insights Query Loop
**Learning:** Found an anti-pattern in the dashboard insights query where O(N) `.filter()` statements were executed back-to-back 7 times over potentially large employee collections.
**Action:** Consolidate these multiple O(N) array passes into a single O(N) `for...of` loop to save CPU cycles and prevent redundant memory allocations.
