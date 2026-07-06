## 2024-07-06 - Optimized Employee Array Filtering
**Learning:** Found multiple chained `.filter()` and `.length`/`.slice()` calls iterating over the `employees` array in `dashboard.repository.ts`. For companies with many employees, O(N*7) iterations caused unnecessary CPU bound operations during dashboard loads.
**Action:** Consolidate multiple sequential array passes into a single loop (O(N)), calculating missing attributes and birthdays in one pass.
