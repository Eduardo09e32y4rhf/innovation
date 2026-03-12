
## 2024-05-18 - Dashboard N+1 Queries Bottleneck
**Learning:** Found a severe N+1 query pattern in `backend/src/api/v1/endpoints/dashboard.py` within `get_dashboard_metrics()`. The endpoint was repeatedly calling a `get_sum()` helper function that executed a `db.query(func.sum(...))` each time for current/previous month and iteratively inside a 6-month loop. This resulted in 16 separate database queries being executed on page load just to retrieve revenue and cost summaries.
**Action:** Replaced the iterative database querying with a single, grouped query fetching all relevant `Transaction` data (filtered by `company_id`, status "paid", and an inclusive date range) into memory. I then calculated the aggregates (revenue, costs, and 6-month chart data) using Python. This reduced 16 DB queries to exactly 1 query, significantly improving response time and database load. Always look for loop-based SQL aggregates and refactor them to fetch the dataset once if feasible.

## 2024-05-19 - [Database vs In-Memory Aggregation for Transactions]
**Learning:** Fetching all transaction records into memory just to calculate sum totals (like cash flow summary, total taxes, analytics) causes severe memory footprint and latency overheads as user data grows. This codebase pattern frequently caused performance regressions in dashboard endpoints.
**Action:** When calculating sums or aggregates, always use `func.sum()` combined with `group_by()` in SQLAlchemy to offload the computation to the database. Avoid fetching large lists of objects (using `.all()`) if only aggregate values are needed.

## 2024-03-01 - Avoid O(N) memory allocations via `.all()` inside iterative loops
**Learning:** Found an endpoints in `rh_advanced.py` fetching ORM records (`TimeBank`) via `.all()` inside a `for u in users` loop, accumulating values manually via `sum()`. For huge record sets, querying related records in a loop causes an O(N) memory scale-up alongside an N+1 query regression.
**Action:** When a loop iterates over database objects to count or aggregate fields, replace the loop with a single SQLAlchemy aggregation query (`func.sum` and `group_by`). This solves the N+1 problem and keeps Python memory strictly bounded to the result size rather than materializing all records into Python objects.

## 2024-05-20 - Eliminate N+1 Queries on Dashboard Kanban via joinedload
**Learning:** The `/kanban` endpoint in the dashboard iterated through 50 `Application` cards to format the response payload. For each card, it accessed `app.candidate` and `app.job` relationships. Because these were lazy-loaded by default, SQLAlchemy made an additional query per relationship per card, generating ~100 separate database queries. This is a severe N+1 bottleneck.
**Action:** When iterating over queried entities to build an output list, explicitly define eager loading using `.options(joinedload(Model.relationship))` for any related entities accessed during the loop. This minimizes the workload to a single large database request rather than many tiny requests, dramatically speeding up API response times on high-iteration lists.

## 2024-05-21 - Avoiding Duplicate SQL Joins with `contains_eager`
**Learning:** In the `/kanban` endpoint fix, applying `.options(joinedload(Application.job))` to a query that already explicitly called `.join(Job)` caused SQLAlchemy to join the `Job` table twice (once for filtering, once for loading).
**Action:** When a relationship is already explicitly joined in the SQLAlchemy query via `.join(Model)`, use `.options(contains_eager(Parent.relationship))` instead of `joinedload`. This instructs SQLAlchemy to populate the relationship using the data from the existing join, preventing redundant OUTER JOINs and keeping the generated SQL performant. Use `joinedload` only for relationships that are not explicitly joined for filtering purposes.
