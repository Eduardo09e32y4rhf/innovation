## 2025-06-25 - Object Injection Vulnerability in Optional Array Fields

**Vulnerability:** Prisma / NoSQL Object Injection via `@IsOptional()` array fields without typed items validator
**Learning:** In NestJS DTOs, validating an array field simply with `@IsOptional()` and `@IsArray()` allows an attacker to inject arbitrary objects into the array. This happens because `class-validator` does not strictly enforce the type of array items. If this array is then passed to a database query (like Prisma or MongoDB), it can cause object injection vulnerabilities (e.g., executing operators like `$ne`, `$gt`). To fix this, you must explicitly use a typed validator with the `each: true` option, e.g., `@IsString({ each: true })` or `@IsNumber({}, { each: true })`.
**Prevention:** Whenever validating array fields, always combine `@IsArray()` with a typed validator using `{ each: true }` (e.g., `@IsString({ each: true })`).
