## 2024-05-20 - Missing DTO Validation in NestJS Controllers
**Vulnerability:** Controller methods using `@Body() data: any` bypass validation, allowing Prisma Object Injection.
**Learning:** In NestJS, when `@Body()` is typed as `any` or an inline object, `class-validator` decorators are not executed. The user can pass any arbitrary JSON structure, which is then fed directly to Prisma's `.create()` or `.update()` methods, allowing object injection to change roles, passwords, or relations.
**Prevention:** Always use a specific DTO class with class-validator decorators like `@IsString()` for `@Body()` parameters in controllers.

## 2024-05-20 - CI Prisma Client Generation and Node Version
**Vulnerability:** CI fails on typescript validation, tests, and linting due to missing `@prisma/client` generated types and node 20 deprecation warnings.
**Learning:** `npm run db:generate` needs to be run prior to tests or linting steps. GitHub actions deprecated Node 20, leading to unexpected job execution states and failures.
**Prevention:** Ensure CI steps invoke `npm run db:generate` explicitly after `npm ci` and Node.js version is bumped to 22.

## 2024-05-20 - Prisma $Enums Usage in Service
**Vulnerability:** Prisma $Enums usage fails at runtime for generated types if not resolved correctly via typechecker.
**Learning:** `TypeError: Cannot read properties of undefined (reading 'InvoiceStatus')` happens when importing `$Enums` dynamically from `@prisma/client`.
**Prevention:** Use hardcoded literals or explicit exported types instead of `$Enums`.
