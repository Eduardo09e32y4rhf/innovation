
## 2026-09-19 - Validation Bypassing due to inline types and any

**Vulnerability:** Controller endpoint arguments without DTO classes (e.g. `@Body() body: any` or inline interfaces like `@Body() dto: { field: string }`) bypass `class-validator` checks completely in NestJS. This can lead to injection vulnerabilities (like NoSQL/Prisma Object Injection) where an attacker passes an object (e.g., `{ field: { $ne: null } }`) when the application expects a string.
**Learning:** NestJS ValidationPipe uses TypeScript's reflection system, which only provides runtime type metadata for classes. Inline types and `any` have no runtime metadata, so ValidationPipe silently skips validation for them.
**Prevention:** Always use a formal class DTO with `class-validator` decorators (like `@IsString()`) for request bodies. Ensure that the controller parameter is typed with this class. If validating inline objects, manually validate their fields (e.g. `typeof field === 'string'`).
