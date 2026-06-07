
## 2024-05-18 - Dashboard N+1 Queries Bottleneck
**Learning:** Found a severe N+1 query pattern in `backend/src/api/v1/endpoints/dashboard.py` within `get_dashboard_metrics()`. The endpoint was repeatedly calling a `get_sum()` helper function that executed a `db.query(func.sum(...))` each time for current/previous month and iteratively inside a 6-month loop. This resulted in 16 separate database queries being executed on page load just to retrieve revenue and cost summaries.
**Action:** Replaced the iterative database querying with a single, grouped query fetching all relevant `Transaction` data (filtered by `company_id`, status "paid", and an inclusive date range) into memory. I then calculated the aggregates (revenue, costs, and 6-month chart data) using Python. This reduced 16 DB queries to exactly 1 query, significantly improving response time and database load. Always look for loop-based SQL aggregates and refactor them to fetch the dataset once if feasible.

## 2024-05-19 - [Database vs In-Memory Aggregation for Transactions]
**Learning:** Fetching all transaction records into memory just to calculate sum totals (like cash flow summary, total taxes, analytics) causes severe memory footprint and latency overheads as user data grows. This codebase pattern frequently caused performance regressions in dashboard endpoints.
**Action:** When calculating sums or aggregates, always use `func.sum()` combined with `group_by()` in SQLAlchemy to offload the computation to the database. Avoid fetching large lists of objects (using `.all()`) if only aggregate values are needed.

## 2024-03-01 - Avoid O(N) memory allocations via `.all()` inside iterative loops
**Learning:** Found an endpoints in `rh_advanced.py` fetching ORM records (`TimeBank`) via `.all()` inside a `for u in users` loop, accumulating values manually via `sum()`. For huge record sets, querying related records in a loop causes an O(N) memory scale-up alongside an N+1 query regression.
**Action:** When a loop iterates over database objects to count or aggregate fields, replace the loop with a single SQLAlchemy aggregation query (`func.sum` and `group_by`). This solves the N+1 problem and keeps Python memory strictly bounded to the result size rather than materializing all records into Python objects.
## 2025-06-07 - Prisma Aggregate Optimization
**Learning:** In the `apps/api` NestJS backend, executing multiple independent Prisma `.aggregate()` calls on the same table (e.g., `financialTransaction`) within a `Promise.all` incurs multiple database roundtrips and connection overhead.
**Action:** Consolidate these independent `.aggregate()` queries into a single `.groupBy()` query. Use optional chaining and nullish coalescing to safely extract values from the grouped array, as `.groupBy()` omits groups with zero matching records.
## 2025-06-07 - CI Workflow Monorepo Architecture Update
**Learning:** Monorepo reorganizations require updating CI workflows. The `package-lock.json` might move to the root, and the backend/frontend working directories must accurately reflect the new folder names.
**Action:** When reorganizing a monorepo, always trace and update all CI/CD `.github/workflows/` files. Ensure caching paths (`cache-dependency-path`) and `working-directory` declarations correctly map to the new repository structure (e.g. `apps/web`, `apps/ai-service`, root `package-lock.json`).
