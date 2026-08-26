## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution

## 2025-02-26 - [Fix unhandled TypeError when providing undefined to Buffer.from in Auth Service]
**Vulnerability:** A missing check for `undefined` code in `validateResetCode` method of `AuthService` when creating a buffer.
**Learning:** Checking for `undefined` before creating a Buffer using `Buffer.from` prevents NodeJS from throwing an unhandled `TypeError` when values derived from DTO properties are empty.
**Prevention:** Always use fallback logic (e.g. `(dto.code || '')`) before processing string properties in `Buffer.from` when the property might be `undefined`.
