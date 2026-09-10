## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution
## 2025-02-14 - Fix path traversal vulnerability in LocalSupportStorageService
**Vulnerability:** The `LocalSupportStorageService` used `path.join(this.basePath, key)` without validating if the resulting resolved path was inside `this.basePath`. This allowed for path traversal (e.g. `../../../../etc/passwd`).
**Learning:** Using `path.join` with user-supplied keys does not prevent directory traversal attacks if `..` is present. You need to use `path.resolve` and check if the resolved path `startsWith` the intended base directory (with trailing slash/separator to prevent partial matches like `/data-log`).
**Prevention:** Always use a validation method for local file paths by comparing the fully resolved directory against the intended base directory.
## 2025-02-14 - Fix Object Injection in PlatformSupportController
**Vulnerability:** The `addMessage` and `addInternalNote` endpoints in `PlatformSupportController` used `@Body() data: any` instead of a proper DTO. This bypasses NestJS validation, potentially allowing object/NoSQL injection or unexpected data structures.
**Learning:** In NestJS, `@Body()` must be explicitly typed with a class decorated with `class-validator` rules to enforce validation.
**Prevention:** Always use proper DTO classes (e.g. `AddSupportMessageDto`) for `@Body()` parameters instead of `any`.
