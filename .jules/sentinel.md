## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution
## 2024-05-18 - Unhandled Promise Rejection via Missing Type Validation
**Vulnerability:** Controller methods lacking proper DTO class validation allow `undefined` inputs to reach methods like `Buffer.from()`, triggering unhandled TypeErrors and causing 500 Internal Server Errors (Denial of Service risk).
**Learning:** In NestJS, when using inline typing instead of class validation on `@Body()`, values are implicitly trusted. Calling methods that expect strings on undefined/non-string values causes crashes that can be intentionally triggered to bloat logs or leak stack traces.
**Prevention:** Always use `@IsString()` via `class-validator` in DTOs, or explicitly enforce type checking (e.g., `typeof val === 'string'`) at runtime before passing parameters to sensitive functions like `Buffer.from()`.
