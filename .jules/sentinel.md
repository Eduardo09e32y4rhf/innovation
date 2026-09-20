## 2024-05-20 - Missing DTO Validation in NestJS Controllers
**Vulnerability:** Controller methods using `@Body() data: any` bypass validation, allowing Prisma Object Injection.
**Learning:** In NestJS, when `@Body()` is typed as `any` or an inline object, `class-validator` decorators are not executed. The user can pass any arbitrary JSON structure, which is then fed directly to Prisma's `.create()` or `.update()` methods, allowing object injection to change roles, passwords, or relations.
**Prevention:** Always use a specific DTO class with class-validator decorators like `@IsString()` for `@Body()` parameters in controllers.
