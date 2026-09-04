## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution
## 2025-09-04 - Unhandled TypeError Due to Missing Input Validation on DTO

**Vulnerability:** The NestJS `validateResetCode` endpoint in `auth.controller.ts` defined its `@Body` argument using an inline interface instead of a DTO class with `class-validator` decorators. Because of this, it accepted undefined or unexpected types, leading to a `TypeError` when methods like `.trim()` were called on undefined values. This type error results in an unhandled 500 error exposing potential details, instead of a clean 400 Bad Request error.

**Learning:** NestJS controller methods that define `@Body()` parameters with an inline interface (e.g., `@Body() dto: { field: string }`) instead of a DTO class bypass automatic validation by `class-validator`. This allows properties to be `undefined` or of unexpected types.

**Prevention:** Always use proper DTO classes with `class-validator` decorators (like `@IsString()`, `@IsNotEmpty()`) for controller payloads to ensure inputs are automatically validated by NestJS before reaching the controller or service layer.
