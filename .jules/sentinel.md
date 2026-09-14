## 2024-05-28 - Missing validation on reset code route
**Vulnerability:** Found a lack of `class-validator` based runtime validation on `validateResetCode` method in `auth.controller.ts` as it was using an inline typed object.
**Learning:** Using an inline type (`{ email: string... }`) with `@Body()` bypasses nestjs input validation pipeline allowing arbitrary types or incomplete structures to hit the service logic.
**Prevention:** Always use explicit DTO classes decorated with class-validator annotations to enable nestjs to run validation on incoming requests payloads.
