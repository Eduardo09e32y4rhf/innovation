## 2024-05-18 - Missing DTO Validation in Platform Plans Controller
**Vulnerability:** The `@Body()` parameters in `PlatformPlansController.create` and `PlatformPlansController.update` methods were typed as `any` and lacked any DTO validation logic. This meant arbitrary data could be injected into the Prisma client via `this.normalizePlanPayload(data, true)`.
**Learning:** In NestJS with `class-validator`, missing typed DTOs on `@Body()` params bypass validation. The payload would still be directly passed as Prisma `data`. An object like `{ increment: -100 }` could be passed to decimal fields directly into the database.
**Prevention:** Always define strong DTOs for `@Body()` payloads.
