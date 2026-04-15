## 2025-04-15 - [Dashboard Membership Optimization]
**Learning:** O(N) list membership checks (`in done_ids`) inside loops querying all mission results in endpoints like `get_missions` create hidden O(N x M) bottlenecks.
**Action:** When querying database results that will be repeatedly checked for membership via `in`, always use set comprehensions instead of list comprehensions to achieve O(1) lookups and O(N + M) total time complexity.
