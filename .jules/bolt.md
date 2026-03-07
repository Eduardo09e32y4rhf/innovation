
## 2024-05-18 - Dashboard N+1 Queries Bottleneck
**Learning:** Found a severe N+1 query pattern in `backend/src/api/v1/endpoints/dashboard.py` within `get_dashboard_metrics()`. The endpoint was repeatedly calling a `get_sum()` helper function that executed a `db.query(func.sum(...))` each time for current/previous month and iteratively inside a 6-month loop. This resulted in 16 separate database queries being executed on page load just to retrieve revenue and cost summaries.
**Action:** Replaced the iterative database querying with a single, grouped query fetching all relevant `Transaction` data (filtered by `company_id`, status "paid", and an inclusive date range) into memory. I then calculated the aggregates (revenue, costs, and 6-month chart data) using Python. This reduced 16 DB queries to exactly 1 query, significantly improving response time and database load. Always look for loop-based SQL aggregates and refactor them to fetch the dataset once if feasible.

## 2024-05-19 - [Database vs In-Memory Aggregation for Transactions]
**Learning:** Fetching all transaction records into memory just to calculate sum totals (like cash flow summary, total taxes, analytics) causes severe memory footprint and latency overheads as user data grows. This codebase pattern frequently caused performance regressions in dashboard endpoints.
**Action:** When calculating sums or aggregates, always use `func.sum()` combined with `group_by()` in SQLAlchemy to offload the computation to the database. Avoid fetching large lists of objects (using `.all()`) if only aggregate values are needed.

## 2025-03-05 - [TimeBank Balance Calculation using SQL Aggregations]
**Learning:** Found an N+1 query vulnerability when iterating through `users` in `get_employees_list` within `backend/src/api/v1/endpoints/rh_advanced.py`. Each iteration queried the database for the user's TimeBank entries (`db.query(TimeBank).filter(...).all()`), resulting in excessive database calls and memory usage due to pulling full ORM objects.
**Action:** Used `func.sum()` combined with `.group_by()` in SQLAlchemy to compute the credit/debit totals for all users in a single aggregated query, replacing the N+1 loop with an O(1) query and a quick hash map lookup.
