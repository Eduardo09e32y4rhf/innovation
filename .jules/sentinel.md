## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution

## 2024-05-27 - [Fix 500s from Missing DTO Validation on Buffer.from]
**Vulnerability:** Endpoints handling password resets bypassed `ValidationPipe` by defining the `@Body()` parameter with an inline interface (e.g., `@Body() dto: { code: string }`). This allowed malicious or malformed requests to omit the `code` field (making it `undefined`), which when passed to `Buffer.from(dto.code)` triggered an unhandled `TypeError` (500 Internal Server Error).
**Learning:** In NestJS, inline interface types are structurally ignored by `class-validator` at runtime. Inputs can be `undefined`, `null`, or even complex objects if a concrete DTO class isn't used, opening the door for DoS via application crash or NoSQL injection.
**Prevention:** Always create explicitly decorated DTO classes (e.g., `ValidateResetCodeDto`) with decorators like `@IsString()` and use them in controller method signatures. For critical cryptographic operations involving `Buffer.from`, add manual fallback type checks (e.g., `typeof val !== 'string'`) in the service layer as defense-in-depth.
