
## 2024-05-18 - Dashboard N+1 Queries Bottleneck
**Learning:** Found a severe N+1 query pattern in `backend/src/api/v1/endpoints/dashboard.py` within `get_dashboard_metrics()`. The endpoint was repeatedly calling a `get_sum()` helper function that executed a `db.query(func.sum(...))` each time for current/previous month and iteratively inside a 6-month loop. This resulted in 16 separate database queries being executed on page load just to retrieve revenue and cost summaries.
**Action:** Replaced the iterative database querying with a single, grouped query fetching all relevant `Transaction` data (filtered by `company_id`, status "paid", and an inclusive date range) into memory. I then calculated the aggregates (revenue, costs, and 6-month chart data) using Python. This reduced 16 DB queries to exactly 1 query, significantly improving response time and database load. Always look for loop-based SQL aggregates and refactor them to fetch the dataset once if feasible.

## 2024-05-19 - [Database vs In-Memory Aggregation for Transactions]
**Learning:** Fetching all transaction records into memory just to calculate sum totals (like cash flow summary, total taxes, analytics) causes severe memory footprint and latency overheads as user data grows. This codebase pattern frequently caused performance regressions in dashboard endpoints.
**Action:** When calculating sums or aggregates, always use `func.sum()` combined with `group_by()` in SQLAlchemy to offload the computation to the database. Avoid fetching large lists of objects (using `.all()`) if only aggregate values are needed.

## 2024-03-01 - Avoid O(N) memory allocations via `.all()` inside iterative loops
**Learning:** Found an endpoints in `rh_advanced.py` fetching ORM records (`TimeBank`) via `.all()` inside a `for u in users` loop, accumulating values manually via `sum()`. For huge record sets, querying related records in a loop causes an O(N) memory scale-up alongside an N+1 query regression.
**Action:** When a loop iterates over database objects to count or aggregate fields, replace the loop with a single SQLAlchemy aggregation query (`func.sum` and `group_by`). This solves the N+1 problem and keeps Python memory strictly bounded to the result size rather than materializing all records into Python objects.

## 2025-02-15 - Database vs In-Memory Aggregation for Cost Centers
**Learning:** The get_cost_centers endpoint was fetching all transactions into memory to compute totals by category, leading to O(N) memory overhead and degraded performance for large data.
**Action:** Refactored to use SQL-level aggregation with func.sum() and grouped by category, leveraging func.coalesce(func.nullif(...)) to handle empty and null categories safely.
