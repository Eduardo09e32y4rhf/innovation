## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution
## 2025-02-14 - Fix unhandled TypeError in Buffer.from() due to undefined input in NestJS auth
**Vulnerability:** Missing input validation in NestJS `@Body()` using inline types instead of DTO class allowed `undefined` inputs. This caused an unhandled `TypeError` in `Buffer.from()` and `startsWith()`, leading to HTTP 500 error, exposing internal app logic and causing a potential DoS vector.
**Learning:** In NestJS, inline types in `@Body()` bypass automatic `class-validator` validation. This makes manual `typeof` validation strictly required before using the inputs. Passing `undefined` to `Buffer.from()` crashes Node.js processes.
**Prevention:** Avoid inline types in `@Body()`. If used, ALWAYS validate input types manually (`typeof dto.field === 'string'`) before passing to methods like `Buffer.from()` or `startsWith()`.
