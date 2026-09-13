## 2024-10-24 - Prisma Object Injection through unvalidated DTO array fields
**Vulnerability:** `UpdatePlatformCompanyDto`'s `activeModules` field was typed as `string[]` in TypeScript but lacked `@IsArray()` and `@IsString({ each: true })` decorators. It only used `@IsOptional()`.
**Learning:** In NestJS/`class-validator`, TypeScript types are stripped at runtime. An array without explicit `@IsArray()` and typed `each` decorators accepts any value (including objects), allowing for Prisma Object Injection or malformed data to bypass logic.
**Prevention:** Always pair `@IsArray()` with an explicit type validator (e.g., `@IsString({ each: true })`) when defining array fields in DTOs.
