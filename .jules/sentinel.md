## 2026-09-24 - Fix Prisma Object Injection on optional fields
**Vulnerability:** Several DTO fields were marked with `@IsOptional()` but lacked a proper type validator (e.g., `@IsArray()` or `@IsNumber()`). This bypasses `class-validator` checks allowing attackers to send an arbitrary JSON object instead of the expected primitive, opening the door to Prisma Object Injection.
**Learning:** Using `@IsOptional()` without an explicit type validator allows objects to be passed to Prisma. For arrays, `@IsArray()` with `each: true` is required.
**Prevention:** Always pair `@IsOptional()` with an explicit type validator like `@IsString()`, `@IsNumber()`, or `@IsArray()` paired with a typed validator.
