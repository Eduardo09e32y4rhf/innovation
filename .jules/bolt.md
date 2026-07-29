## 2023-10-27 - [N+1 Performance Fix in TimeClosingService]
**Learning:** Found N+1 query problem inside the time closing service where it iterates through all employees for a company to calculate time tracking closures, firing 3 separate Prisma findMany queries per employee. In companies with many employees, this could cause massive performance bottlenecks.
**Action:** Always check array iterations inside API services that execute database queries (N+1 queries pattern) and batch those queries into a single large query using \`{ in: [ids] }\` and \`Map\` structures for fast indexing.
