## 2026-09-25 - Class Validator Missing Explicit Typed Validators

**Vulnerability:** Found multiple instances where `@IsOptional()` was used in NestJS Data Transfer Objects (DTOs) without an accompanying explicit typed validator (like `@IsString()`, `@IsArray()`, `@IsNumber()`).
**Learning:** Using `@IsOptional()` alone without type validators allows a potential attacker to bypass validation logic and inject arbitrary objects into the database via NoSQL or Prisma Object injections. In `class-validator`, omitting explicit type validation makes the field bypass validation if the property is supplied but contains unexpected types like objects.
**Prevention:** Always pair `@IsOptional()` with explicit type decorators like `@IsString()`, `@IsNumber()`, `@IsBoolean()`, or `@IsArray()` to ensure inputs are actually of the intended primitive type and not complex objects that exploit backend ORMs.
