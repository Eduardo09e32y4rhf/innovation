## 2025-06-25 - Bulk Insert For Database Calls
**Learning:** Found N+1 queries when looping through database calls checking for existence and inserting new records in `triggerPeriodicAso` in `apps/api/src/modules/management/aso.service.ts`. The loop previously used `findFirst` followed by `create` multiple times which scales poorly.
**Action:** Use `findMany` to fetch all potential matching records upfront, check existence using memory structures (like `Set`), and use `createMany` to bulk insert the new records to minimize database calls.
