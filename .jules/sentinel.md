## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution

## 2025-06-25 - DTO Type Binding
**Vulnerability:** Controller endpoints were bypassing input validation by declaring parameters as `@Body() data: any` instead of using strong Data Transfer Objects (DTOs).
**Learning:** The `@Body() data: any` bypasses NestJS `class-validator` bindings entirely. This can lead to unhandled internal type errors (e.g. string operations failing) or NoSQL Object injection because `typeof data.message === 'object'` could be unexpectedly passed.
**Prevention:** Always declare specific DTO classes in NestJS controllers to leverage the auto-validation pipe, rather than inline `any` or plain object types.
