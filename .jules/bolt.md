## 2024-03-14 - Dashboard CPU Load Optimization
**Learning:** Sequential `.filter()` calls on large employee collections in the dashboard repository cause redundant O(N) array traversals and intermediate memory allocations (e.g. slicing, length checks). Since the `buildInsights` method handles large companies, these sequential loops stack up and significantly affect garbage collection and CPU usage.
**Action:** Always consolidate sequential `.filter()` operations over the same dataset into a single `for...of` loop when extracting multiple metrics, reducing CPU overhead to a single pass.
