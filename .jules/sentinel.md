## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution
## 2025-02-14 - Fix unhandled TypeError for NestJS controller defining an inline interface
**Vulnerability:** A NestJS controller defining an inline interface doesn't validate types which allows properties to be undefined causing an unhandled TypeError resulting in a 500 error instead of 401/400.
**Learning:** In NestJS, controller methods defining the `@Body()` parameter with an inline interface (e.g., `@Body() dto: { field: string }`) instead of a DTO class bypass automatic `class-validator` validation.
**Prevention:** Make sure to use DTO classes for @Body params or explicitly validate types if using inline interfaces.
